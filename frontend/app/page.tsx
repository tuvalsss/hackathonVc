'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

const AUTO_SENTINEL_ABI = [
  "function sendRequest() external returns (bytes32)",
  "function getLatestState() external view returns (tuple(uint256 timestamp, uint256 priceETH, uint256 priceBTC, uint256 aggregatedScore, bool thresholdTriggered, string decisionReason, string dataSources, bytes32 requestId))",
  "function getStatistics() external view returns (uint256 _totalUpdates, uint256 _totalThresholdTriggers, uint256 _totalRequests, uint256 _currentThreshold, uint256 _lastUpdateTime, bytes32 _lastRequestId)",
  "function getRequestStatus(bytes32 requestId) external view returns (tuple(bool exists, bool fulfilled, bytes response, bytes err, uint256 timestamp, address requester))",
  "function threshold() external view returns (uint256)",
  "event RequestSent(bytes32 indexed requestId, address indexed requester, uint256 timestamp)",
  "event RequestFulfilled(bytes32 indexed requestId, bytes response, bytes err, uint256 timestamp)",
];

interface SentinelState {
  timestamp: number;
  priceETH: number;
  priceBTC: number;
  aggregatedScore: number;
  thresholdTriggered: boolean;
  decisionReason: string;
  dataSources: string;
  requestId: string;
}

interface Statistics {
  totalUpdates: number;
  totalThresholdTriggers: number;
  totalRequests: number;
  currentThreshold: number;
  lastUpdateTime: number;
  lastRequestId: string;
}

type WorkflowStatus = 'idle' | 'connecting' | 'sending' | 'pending' | 'fulfilled' | 'error';

export default function Home() {
  const [state, setState] = useState<SentinelState | null>(null);
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>('idle');
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);

  const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';
  const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.infura.io/v3/';
  const EXPLORER_URL = process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://sepolia.etherscan.io';

  const fetchData = useCallback(async () => {
    if (!CONTRACT_ADDRESS) {
      setError('Contract address not configured');
      setLoading(false);
      return;
    }

    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, AUTO_SENTINEL_ABI, provider);

      const currentState = await contract.getLatestState();
      setState({
        timestamp: Number(currentState.timestamp),
        priceETH: Number(currentState.priceETH) / 1e8,
        priceBTC: Number(currentState.priceBTC) / 1e8,
        aggregatedScore: Number(currentState.aggregatedScore),
        thresholdTriggered: currentState.thresholdTriggered,
        decisionReason: currentState.decisionReason,
        dataSources: currentState.dataSources,
        requestId: currentState.requestId,
      });

      const statistics = await contract.getStatistics();
      setStats({
        totalUpdates: Number(statistics._totalUpdates),
        totalThresholdTriggers: Number(statistics._totalThresholdTriggers),
        totalRequests: Number(statistics._totalRequests),
        currentThreshold: Number(statistics._currentThreshold),
        lastUpdateTime: Number(statistics._lastUpdateTime),
        lastRequestId: statistics._lastRequestId,
      });

      setLastRefresh(new Date());
      setError(null);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [CONTRACT_ADDRESS, RPC_URL]);

  const pollRequestStatus = useCallback(async (requestId: string) => {
    if (!CONTRACT_ADDRESS) return;

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, AUTO_SENTINEL_ABI, provider);

    for (let i = 0; i < 60; i++) {
      try {
        const status = await contract.getRequestStatus(requestId);
        if (status.fulfilled) {
          setWorkflowStatus('fulfilled');
          await fetchData();
          return;
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    setWorkflowStatus('error');
    setError('Request timeout. Check back later.');
  }, [CONTRACT_ADDRESS, RPC_URL, fetchData]);

  const triggerWorkflow = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('Please install MetaMask to trigger workflows');
      return;
    }

    try {
      setWorkflowStatus('connecting');
      setError(null);
      setTxHash(null);
      setCurrentRequestId(null);

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      setWalletConnected(true);

      const network = await provider.getNetwork();
      if (network.chainId !== 11155111n) {
        setError('Please switch to Sepolia testnet');
        setWorkflowStatus('error');
        return;
      }

      setWorkflowStatus('sending');

      const contract = new ethers.Contract(CONTRACT_ADDRESS, AUTO_SENTINEL_ABI, signer);
      const tx = await contract.sendRequest();
      setTxHash(tx.hash);

      const receipt = await tx.wait();
      
      for (const log of receipt?.logs || []) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed?.name === 'RequestSent') {
            const requestId = parsed.args[0];
            setCurrentRequestId(requestId);
            setWorkflowStatus('pending');
            pollRequestStatus(requestId);
            return;
          }
        } catch {}
      }
    } catch (err: any) {
      console.error('Trigger error:', err);
      setError(err.message || 'Failed to trigger workflow');
      setWorkflowStatus('error');
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
        setWalletConnected(accounts.length > 0);
      });
    }
  }, []);

  const formatTime = (timestamp: number) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatPrice = (price: number) => {
    return price ? '$' + price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-';
  };

  const shortenHash = (hash: string) => {
    if (!hash || hash === '0x0000000000000000000000000000000000000000000000000000000000000000') return '-';
    return hash.slice(0, 10) + '...' + hash.slice(-8);
  };

  const getStatusColor = () => {
    switch (workflowStatus) {
      case 'connecting':
      case 'sending': return 'text-yellow-400';
      case 'pending': return 'text-blue-400';
      case 'fulfilled': return 'text-green-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = () => {
    switch (workflowStatus) {
      case 'connecting': return 'Connecting wallet...';
      case 'sending': return 'Sending request...';
      case 'pending': return 'Waiting for DON fulfillment...';
      case 'fulfilled': return 'Request fulfilled!';
      case 'error': return 'Error occurred';
      default: return 'Ready';
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            AutoSentinel
          </h1>
          <p className="text-gray-400">
            Autonomous Market Intelligence powered by Chainlink Functions
          </p>
          <div className="mt-2 flex items-center justify-center gap-4 text-sm">
            <span className="text-gray-500">Network: Sepolia</span>
            <span className={`px-2 py-1 rounded ${walletConnected ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
              {walletConnected ? 'Wallet Connected' : 'Wallet Not Connected'}
            </span>
          </div>
        </header>

        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-6 border border-blue-700/50 mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold mb-1">Chainlink Functions Workflow</h2>
              <p className="text-gray-400 text-sm">Trigger off-chain computation via Chainlink DON</p>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={triggerWorkflow}
                disabled={workflowStatus !== 'idle' && workflowStatus !== 'fulfilled' && workflowStatus !== 'error'}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {workflowStatus === 'idle' || workflowStatus === 'fulfilled' || workflowStatus === 'error' 
                  ? 'Trigger Workflow' 
                  : 'Processing...'}
              </button>
              <span className={`text-sm ${getStatusColor()}`}>{getStatusText()}</span>
            </div>
          </div>

          {(txHash || currentRequestId) && (
            <div className="mt-4 pt-4 border-t border-blue-700/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {txHash && (
                  <div>
                    <span className="text-gray-400">Transaction: </span>
                    <a href={`${EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                      {shortenHash(txHash)}
                    </a>
                  </div>
                )}
                {currentRequestId && (
                  <div>
                    <span className="text-gray-400">Request ID: </span>
                    <span className="font-mono text-purple-400">{shortenHash(currentRequestId)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${state?.timestamp ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
              Current State
            </h2>
            
            {loading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-8 bg-slate-700 rounded"></div>
                <div className="h-8 bg-slate-700 rounded"></div>
              </div>
            ) : state && state.timestamp > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">ETH Price</p>
                    <p className="text-2xl font-mono">{formatPrice(state.priceETH)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">BTC Price</p>
                    <p className="text-2xl font-mono">{formatPrice(state.priceBTC)}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-400">Decision Reason</p>
                  <p className="text-sm mt-1">{state.decisionReason || 'N/A'}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-400">Data Sources:</p>
                  <div className="flex gap-1">
                    {state.dataSources.split(',').filter(Boolean).map((source, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded text-xs">
                        {source}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 pt-2 border-t border-slate-700">
                  <p>Last Updated: {formatTime(state.timestamp)}</p>
                  <p>Request ID: {shortenHash(state.requestId)}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No state data yet. Trigger the workflow to update.</p>
            )}
          </div>

          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold mb-4">Decision Score</h2>
            
            {loading ? (
              <div className="animate-pulse"><div className="h-32 bg-slate-700 rounded"></div></div>
            ) : state && stats ? (
              <div>
                <div className="relative h-32 flex items-center justify-center">
                  <div className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    {state.aggregatedScore}
                  </div>
                  <div className="absolute bottom-0 text-sm text-gray-400">/ 100</div>
                </div>
                
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Threshold: {stats.currentThreshold}</span>
                    <span className={state.thresholdTriggered ? 'text-green-400' : 'text-gray-400'}>
                      {state.thresholdTriggered ? 'TRIGGERED' : 'Not triggered'}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${state.thresholdTriggered ? 'bg-gradient-to-r from-green-500 to-green-400' : 'bg-gradient-to-r from-blue-500 to-purple-500'}`}
                      style={{ width: `${Math.min(state.aggregatedScore, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-gray-500">No score data</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 text-center">
            <p className="text-2xl font-bold text-blue-400">{stats?.totalUpdates || 0}</p>
            <p className="text-sm text-gray-400">Updates</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 text-center">
            <p className="text-2xl font-bold text-purple-400">{stats?.totalThresholdTriggers || 0}</p>
            <p className="text-sm text-gray-400">Triggers</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 text-center">
            <p className="text-2xl font-bold text-cyan-400">{stats?.totalRequests || 0}</p>
            <p className="text-sm text-gray-400">Requests</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 text-center">
            <p className="text-2xl font-bold text-green-400">{stats?.currentThreshold || 75}</p>
            <p className="text-sm text-gray-400">Threshold</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 text-center">
            <p className="text-lg font-bold text-yellow-400">Sepolia</p>
            <p className="text-sm text-gray-400">Network</p>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 mb-6">
          <h2 className="text-xl font-semibold mb-4">How Chainlink Functions Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-blue-900/50 flex items-center justify-center text-2xl">1</div>
              <h3 className="font-medium mb-1">Request Sent</h3>
              <p className="text-sm text-gray-400">User triggers sendRequest()</p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-purple-900/50 flex items-center justify-center text-2xl">2</div>
              <h3 className="font-medium mb-1">DON Executes</h3>
              <p className="text-sm text-gray-400">Chainlink nodes run JavaScript</p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-cyan-900/50 flex items-center justify-center text-2xl">3</div>
              <h3 className="font-medium mb-1">Data Fetched</h3>
              <p className="text-sm text-gray-400">CoinGecko + CoinCap APIs</p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-green-900/50 flex items-center justify-center text-2xl">4</div>
              <h3 className="font-medium mb-1">On-Chain Update</h3>
              <p className="text-sm text-gray-400">Result stored in contract</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 justify-center">
          <button onClick={fetchData} disabled={loading} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors disabled:opacity-50">
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
          {CONTRACT_ADDRESS && (
            <a href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors">
              View Contract
            </a>
          )}
          <a href="https://functions.chain.link/" target="_blank" rel="noopener noreferrer" className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors">
            Chainlink Functions
          </a>
        </div>

        <footer className="mt-12 text-center text-sm text-gray-500">
          <p className="font-medium text-gray-400">AutoSentinel - Chainlink Hackathon 2024</p>
          <p className="mt-1">Powered by Chainlink Functions (CRE)</p>
          {lastRefresh && <p className="mt-2 text-xs">Last refresh: {lastRefresh.toLocaleTimeString()}</p>}
        </footer>
      </div>
    </main>
  );
}

declare global {
  interface Window {
    ethereum?: any;
  }
}
