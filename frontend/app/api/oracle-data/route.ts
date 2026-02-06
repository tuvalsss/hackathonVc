import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0xB1C85052CB557A20Cb036d8bA02cBC05A22e070f';
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.infura.io/v3/652101a29c284064a0b8f11911cf84b4';

const ABI = [
  "function getLatestState() external view returns (uint256 timestamp, uint256 priceETH, uint256 priceBTC, uint256 aggregatedScore, bool thresholdTriggered, string decisionReason, string dataSources, bytes32 requestId)",
  "function getStatistics() external view returns (uint256 _totalUpdates, uint256 _totalThresholdTriggers, uint256 _totalRequests, uint256 _currentThreshold, uint256 _lastUpdateTime, bytes32 _lastRequestId)",
  "function s_lastResponse() view returns (bytes)",
  "function threshold() external view returns (uint256)",
];

const POLYMARKET_API = 'https://gamma-api.polymarket.com';

interface PolymarketMarket {
  id: string;
  question: string;
  slug: string;
  volume: string;
  liquidity: string;
  outcomePrices: string[];
  outcomes: string[];
  category: string;
  endDate: string;
  active: boolean;
  closed: boolean;
}

async function fetchPolymarketData() {
  try {
    const fetchWithTimeout = async (url: string) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        const data = await res.json();
        return data;
      } catch {
        return [];
      } finally {
        clearTimeout(timeout);
      }
    };

    const [topVolume, trending] = await Promise.all([
      fetchWithTimeout(`${POLYMARKET_API}/markets?closed=false&limit=10&active=true`),
      fetchWithTimeout(`${POLYMARKET_API}/markets?closed=false&limit=10&active=true&order=startDate`),
    ]);

    const parseJsonField = (val: any): any => {
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return val; }
      }
      return val || [];
    };

    const formatMarket = (m: any) => {
      const prices = parseJsonField(m.outcomePrices);
      const outcomes = parseJsonField(m.outcomes);
      return {
        id: m.id,
        question: m.question,
        slug: m.slug,
        volume: parseFloat(m.volumeNum || m.volume || '0'),
        liquidity: parseFloat(m.liquidityNum || m.liquidity || '0'),
        outcomePrices: Array.isArray(prices) ? prices.map((p: string) => parseFloat(p)) : [],
        outcomes: Array.isArray(outcomes) ? outcomes : [],
        category: m.category || 'general',
        endDate: m.endDate,
        active: m.active,
      };
    };

    return {
      topByVolume: (Array.isArray(topVolume) ? topVolume : []).map(formatMarket).sort((a: any, b: any) => b.volume - a.volume),
      trending: (Array.isArray(trending) ? trending : []).map(formatMarket),
      totalVolume: (Array.isArray(topVolume) ? topVolume : []).reduce((sum: number, m: any) => sum + parseFloat(m.volumeNum || m.volume || '0'), 0),
      marketCount: (Array.isArray(topVolume) ? topVolume : []).length,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Polymarket fetch error:', error);
    return { topByVolume: [], trending: [], totalVolume: 0, marketCount: 0, fetchedAt: new Date().toISOString(), error: 'Failed to fetch' };
  }
}

async function fetchOnChainData() {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

    const [state, stats, rawResponse] = await Promise.all([
      contract.getLatestState(),
      contract.getStatistics(),
      contract.s_lastResponse(),
    ]);

    // Parse the raw response to extract polymarket-specific fields
    const rawStr = ethers.toUtf8String(rawResponse);
    const parseField = (data: string, key: string): string => {
      const idx = data.indexOf(key);
      if (idx === -1) return '';
      const start = idx + key.length;
      const end = data.indexOf(',', start);
      return end === -1 ? data.substring(start) : data.substring(start, end);
    };

    return {
      timestamp: Number(state[0]),
      priceETH: Number(state[1]) / 100,
      priceBTC: Number(state[2]) / 100,
      aggregatedScore: Number(state[3]),
      thresholdTriggered: state[4],
      decisionReason: state[5],
      dataSources: state[6],
      requestId: state[7],
      polymarketVolume: parseInt(parseField(rawStr, 'polyVol:')) * 1000 || 0,
      polymarketTopOutcome: parseInt(parseField(rawStr, 'polyTop:')) || 0,
      statistics: {
        totalFulfilled: Number(stats[0]),
        totalThresholdTriggers: Number(stats[1]),
        totalRequests: Number(stats[2]),
        currentThreshold: Number(stats[3]),
        lastUpdateTime: Number(stats[4]),
        lastRequestId: stats[5],
      },
      raw: rawStr,
    };
  } catch (error) {
    console.error('On-chain fetch error:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const url = new URL(request.url);
    const source = url.searchParams.get('source');

    // Allow fetching specific sources
    if (source === 'polymarket') {
      const polyData = await fetchPolymarketData();
      return NextResponse.json({ polymarket: polyData }, { headers });
    }

    if (source === 'onchain') {
      const onChainData = await fetchOnChainData();
      return NextResponse.json({ onchain: onChainData }, { headers });
    }

    // Default: return everything
    const [onChainData, polyData] = await Promise.all([
      fetchOnChainData(),
      fetchPolymarketData(),
    ]);

    const response = {
      // On-chain verified data (from Chainlink Functions)
      onchain: onChainData,

      // Live Polymarket data (fetched server-side)
      polymarket: polyData,

      // Combined intelligence
      intelligence: {
        riskScore: onChainData?.aggregatedScore || 0,
        riskLevel: (onChainData?.aggregatedScore || 0) >= 80 ? 'HIGH' : 
                   (onChainData?.aggregatedScore || 0) >= 60 ? 'MODERATE' : 'LOW',
        cryptoPrices: {
          ETH: onChainData?.priceETH || 0,
          BTC: onChainData?.priceBTC || 0,
        },
        predictionMarkets: {
          totalVolume: polyData.totalVolume,
          activeMarkets: polyData.marketCount,
          topMarkets: polyData.topByVolume.slice(0, 5).map(m => ({
            question: m.question,
            volume: m.volume,
            yesPrice: m.outcomePrices[0] || 0,
            noPrice: m.outcomePrices[1] || 0,
            category: m.category,
          })),
        },
        dataSources: onChainData?.dataSources?.split('+') || [],
        lastVerified: onChainData?.timestamp ? new Date(onChainData.timestamp * 1000).toISOString() : null,
        requestId: onChainData?.requestId,
        thresholdTriggered: onChainData?.thresholdTriggered || false,
      },

      // Metadata
      meta: {
        contract: CONTRACT_ADDRESS,
        network: 'sepolia',
        explorer: `https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`,
        chainlinkSubscription: 'https://functions.chain.link/sepolia/6239',
        apiVersion: '1.0.0',
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(response, { headers });
  } catch (error) {
    console.error('Oracle data error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch oracle data' },
      { status: 500, headers }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
