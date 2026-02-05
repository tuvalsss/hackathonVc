/**
 * Data Fetcher Service
 * Demonstrates CRE HTTP Fetch capability by pulling data from multiple APIs
 */

import axios from "axios";
import { logger } from "../utils/logger";

export interface PriceData {
  ethPriceCoinGecko: number;
  ethPriceCoinCap: number;
  btcPriceCoinGecko: number;
  btcPriceCoinCap: number;
  ethChange24h: number;
  btcChange24h: number;
  timestamp: number;
}

interface CoinGeckoResponse {
  ethereum: {
    usd: number;
    usd_24h_change?: number;
  };
  bitcoin: {
    usd: number;
    usd_24h_change?: number;
  };
}

interface CoinCapAsset {
  id: string;
  priceUsd: string;
  changePercent24Hr: string;
}

interface CoinCapResponse {
  data: CoinCapAsset[];
}

const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price";
const COINCAP_API = "https://api.coincap.io/v2/assets";

const API_TIMEOUT = 10000; // 10 seconds

/**
 * Fetch price data from CoinGecko API
 */
async function fetchCoinGecko(): Promise<{
  ethPrice: number;
  btcPrice: number;
  ethChange: number;
  btcChange: number;
} | null> {
  try {
    logger.debug("Fetching from CoinGecko...");
    
    const response = await axios.get<CoinGeckoResponse>(COINGECKO_API, {
      params: {
        ids: "ethereum,bitcoin",
        vs_currencies: "usd",
        include_24hr_change: "true",
      },
      timeout: API_TIMEOUT,
    });

    const data = response.data;
    
    return {
      ethPrice: data.ethereum.usd,
      btcPrice: data.bitcoin.usd,
      ethChange: data.ethereum.usd_24h_change || 0,
      btcChange: data.bitcoin.usd_24h_change || 0,
    };
  } catch (error: any) {
    logger.warn(`CoinGecko fetch failed: ${error.message}`);
    return null;
  }
}

/**
 * Fetch price data from CoinCap API
 */
async function fetchCoinCap(): Promise<{
  ethPrice: number;
  btcPrice: number;
  ethChange: number;
  btcChange: number;
} | null> {
  try {
    logger.debug("Fetching from CoinCap...");
    
    const response = await axios.get<CoinCapResponse>(COINCAP_API, {
      params: {
        ids: "ethereum,bitcoin",
      },
      timeout: API_TIMEOUT,
    });

    const data = response.data.data;
    const eth = data.find((a) => a.id === "ethereum");
    const btc = data.find((a) => a.id === "bitcoin");

    if (!eth || !btc) {
      throw new Error("Missing asset data");
    }

    return {
      ethPrice: parseFloat(eth.priceUsd),
      btcPrice: parseFloat(btc.priceUsd),
      ethChange: parseFloat(eth.changePercent24Hr),
      btcChange: parseFloat(btc.changePercent24Hr),
    };
  } catch (error: any) {
    logger.warn(`CoinCap fetch failed: ${error.message}`);
    return null;
  }
}

/**
 * Fetch price data from multiple sources
 * Implements redundancy - if one source fails, uses the other
 */
export async function fetchPriceData(): Promise<PriceData | null> {
  const [coinGecko, coinCap] = await Promise.all([
    fetchCoinGecko(),
    fetchCoinCap(),
  ]);

  // Need at least one source
  if (!coinGecko && !coinCap) {
    logger.error("All price sources failed");
    return null;
  }

  // Use available data, fallback to single source if needed
  const priceData: PriceData = {
    ethPriceCoinGecko: coinGecko?.ethPrice || coinCap?.ethPrice || 0,
    ethPriceCoinCap: coinCap?.ethPrice || coinGecko?.ethPrice || 0,
    btcPriceCoinGecko: coinGecko?.btcPrice || coinCap?.btcPrice || 0,
    btcPriceCoinCap: coinCap?.btcPrice || coinGecko?.btcPrice || 0,
    ethChange24h: coinGecko?.ethChange || coinCap?.ethChange || 0,
    btcChange24h: coinGecko?.btcChange || coinCap?.btcChange || 0,
    timestamp: Date.now(),
  };

  // Log source status
  logger.debug(`CoinGecko: ${coinGecko ? "OK" : "FAILED"}`);
  logger.debug(`CoinCap: ${coinCap ? "OK" : "FAILED"}`);

  return priceData;
}

/**
 * Fetch mock data for testing (when APIs are unavailable)
 */
export function fetchMockData(): PriceData {
  const baseEth = 2450 + (Math.random() - 0.5) * 100;
  const baseBtc = 43200 + (Math.random() - 0.5) * 1000;
  
  return {
    ethPriceCoinGecko: baseEth + (Math.random() - 0.5) * 10,
    ethPriceCoinCap: baseEth + (Math.random() - 0.5) * 10,
    btcPriceCoinGecko: baseBtc + (Math.random() - 0.5) * 100,
    btcPriceCoinCap: baseBtc + (Math.random() - 0.5) * 100,
    ethChange24h: (Math.random() - 0.5) * 10,
    btcChange24h: (Math.random() - 0.5) * 8,
    timestamp: Date.now(),
  };
}
