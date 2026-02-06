'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

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
type InteractionMode = 'predefined' | 'api' | 'natural';

interface PredefinedCheck {
  id: string;
  name: string;
  description: string;
  category: 'risk' | 'price' | 'volatility' | 'deviation';
  icon: string;
}

const PREDEFINED_CHECKS: PredefinedCheck[] = [
  {
    id: 'market_risk',
    name: 'Market Risk Score',
    description: 'Evaluate current market risk based on ETH/BTC price volatility and cross-source deviation',
    category: 'risk',
    icon: '⚠️'
  },
  {
    id: 'price_deviation',
    name: 'Price Deviation Check',
    description: 'Detect significant price differences between CoinGecko and CoinCap data sources',
    category: 'deviation',
    icon: '📊'
  },
  {
    id: 'volatility_alert',
    name: 'Volatility Alert',
    description: 'Monitor rapid price changes and trigger alerts when volatility exceeds threshold',
    category: 'volatility',
    icon: '📈'
  },
  {
    id: 'multi_source_confirm',
    name: 'Multi-Source Confirmation',
    description: 'Verify data consistency across multiple oracles before making decisions',
    category: 'price',
    icon: '✅'
  }
];

export default function Home() {
  const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4';
  const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
  const EXPLORER_URL = process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://sepolia.etherscan.io';

  const [state, setState] = useState<SentinelState | null>(null);
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>('idle');
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('predefined');
  const [selectedCheck, setSelectedCheck] = useState<string | null>(null);
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [showApiDocs, setShowApiDocs] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, AUTO_SENTINEL_ABI, provider);

      const [latestState, statistics] = await Promise.all([
        contract.getLatestState(),
        contract.getStatistics()
      ]);

      setState({
        timestamp: Number(latestState[0]),
        priceETH: Number(latestState[1]) / 100,
        priceBTC: Number(latestState[2]) / 100,
        aggregatedScore: Number(latestState[3]),
        thresholdTriggered: latestState[4],
        decisionReason: latestState[5],
        dataSources: latestState[6],
        requestId: latestState[7]
      });

      setStats({
        totalUpdates: Number(statistics[0]),
        totalThresholdTriggers: Number(statistics[1]),
        totalRequests: Number(statistics[2]),
        currentThreshold: Number(statistics[3]),
        lastUpdateTime: Number(statistics[4]),
        lastRequestId: statistics[5]
      });

      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setLoading(false);
    }
  }, [CONTRACT_ADDRESS, RPC_URL]);

  const pollRequestStatus = async (requestId: string) => {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, AUTO_SENTINEL_ABI, provider);
    
    let attempts = 0;
    const maxAttempts = 40;
    
    const poll = async () => {
      try {
        const status = await contract.getRequestStatus(requestId);
        
        if (status.fulfilled) {
          setWorkflowStatus('fulfilled');
          await fetchData();
          return;
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 3000);
        } else {
          setError('Request timeout - please check Etherscan for status');
          setWorkflowStatus('error');
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };
    
    setTimeout(poll, 3000);
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('Please install MetaMask browser extension');
      return false;
    }

    try {
      setError(null);
      setWorkflowStatus('connecting');

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      
      // Check network
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      
      if (chainId !== 11155111) {
        setError(`Switching to Sepolia testnet...`);
        
        try {
          // Try to switch to Sepolia
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }], // Sepolia = 11155111 = 0xaa36a7
          });
          
          // Wait for switch
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Verify switch
          const newNetwork = await provider.getNetwork();
          if (Number(newNetwork.chainId) !== 11155111) {
            setError('❌ Please approve network switch in MetaMask popup');
            setWorkflowStatus('error');
            return false;
          }
          
          setError(null);
          setWalletConnected(true);
          setWorkflowStatus('idle');
          return true;
          
        } catch (switchError: any) {
          // If Sepolia is not added, try to add it
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: '0xaa36a7',
                  chainName: 'Sepolia Testnet',
                  nativeCurrency: {
                    name: 'Sepolia ETH',
                    symbol: 'ETH',
                    decimals: 18
                  },
                  rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
                  blockExplorerUrls: ['https://sepolia.etherscan.io']
                }]
              });
              
              setWalletConnected(true);
              setWorkflowStatus('idle');
              return true;
            } catch (addError) {
              setError('❌ Failed to add Sepolia network');
              setWorkflowStatus('error');
              return false;
            }
          } else if (switchError.code === 4001) {
            setError('❌ You rejected the network switch. Please approve it in MetaMask.');
            setWorkflowStatus('error');
            return false;
          } else {
            setError(`❌ Failed to switch network. Please switch to Sepolia manually in MetaMask.`);
            setWorkflowStatus('error');
            return false;
          }
        }
      }
      
      setWalletConnected(true);
      setWorkflowStatus('idle');
      return true;
      
    } catch (err: any) {
      console.error('Connect error:', err);
      if (err.code === 4001) {
        setError('❌ Connection rejected. Please approve in MetaMask.');
      } else {
        setError(err.message || 'Failed to connect wallet');
      }
      setWorkflowStatus('error');
      return false;
    }
  };

  const triggerWorkflow = async (checkId?: string) => {
    if (!window.ethereum) {
      setError('Please install MetaMask');
      return;
    }

    try {
      setError(null);
      
      // First ensure wallet is connected and on correct network
      if (!walletConnected) {
        const connected = await connectWallet();
        if (!connected) return;
      }
      
      // Double check network
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      
      if (chainId !== 11155111) {
        setError('❌ Wrong network. Please click "Connect Wallet" button first.');
        setWorkflowStatus('error');
        return;
      }

      setWorkflowStatus('sending');
      const signer = await provider.getSigner();

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

  const handlePredefinedCheck = (checkId: string) => {
    setSelectedCheck(checkId);
    triggerWorkflow(checkId);
  };

  const handleNaturalLanguage = () => {
    if (!naturalLanguageInput.trim()) {
      setError('Please enter a query');
      return;
    }
    
    // In a real implementation, this would translate via OpenAI to predefined checks
    // For now, map to closest predefined check
    const input = naturalLanguageInput.toLowerCase();
    let mappedCheck = 'market_risk';
    
    if (input.includes('deviation') || input.includes('difference')) {
      mappedCheck = 'price_deviation';
    } else if (input.includes('volatil') || input.includes('rapid')) {
      mappedCheck = 'volatility_alert';
    } else if (input.includes('confirm') || input.includes('verify')) {
      mappedCheck = 'multi_source_confirm';
    }
    
    setSelectedCheck(mappedCheck);
    triggerWorkflow(mappedCheck);
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
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            AutoSentinel Decision Engine
          </h1>
          <p className="text-gray-400">
            Trustless Market Intelligence powered by Chainlink Functions
          </p>
          
          <div className="mt-4 flex items-center justify-center gap-4 flex-wrap">
            {!walletConnected ? (
              <button
                onClick={connectWallet}
                disabled={workflowStatus === 'connecting'}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 rounded-lg font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {workflowStatus === 'connecting' ? '🔄 Connecting...' : '🦊 Connect MetaMask'}
              </button>
            ) : (
              <div className="px-6 py-3 bg-green-900/50 border-2 border-green-500 rounded-lg flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <div className="text-left">
                  <div className="text-green-400 font-semibold">Wallet Connected</div>
                  <div className="text-xs text-gray-400">Sepolia Testnet</div>
                </div>
              </div>
            )}
            
            <button 
              onClick={() => setShowOnboarding(!showOnboarding)}
              className="px-3 py-1 bg-blue-900/50 text-blue-300 rounded text-xs hover:bg-blue-800/50"
            >
              {showOnboarding ? 'Hide Guide' : 'Show Guide'}
            </button>
          </div>
        </header>

        {showOnboarding && (
          <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 rounded-xl p-6 border border-blue-700/50 mb-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-blue-300">AutoSentinel Decision Engine</h2>
              <button onClick={() => setShowOnboarding(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-purple-300">What This Engine Does</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  AutoSentinel is a <strong>deterministic decision engine</strong> that executes predefined market analysis checks 
                  using Chainlink's decentralized oracle network. It fetches real-time data from multiple sources, computes 
                  decision scores trustlessly off-chain, and stores verified results permanently on-chain.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2 text-purple-300">Real-World Usage</h3>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li>✓ <strong>Smart Contracts</strong> - Read on-chain results for automated execution</li>
                  <li>✓ <strong>Trading Bots</strong> - Trigger decisions based on verified market data</li>
                  <li>✓ <strong>DAOs</strong> - Use trustless data for governance decisions</li>
                  <li>✓ <strong>DeFi Protocols</strong> - Risk scoring and circuit breakers</li>
                  <li>✓ <strong>Portfolio Managers</strong> - Automated rebalancing triggers</li>
                </ul>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2 text-yellow-300">Why This Matters</h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="font-semibold mb-1 text-green-400">🔒 Trustless</p>
                  <p className="text-gray-400 text-xs">No single server controls computation - runs on decentralized Chainlink network</p>
                </div>
                <div>
                  <p className="font-semibold mb-1 text-blue-400">✅ Verifiable</p>
                  <p className="text-gray-400 text-xs">Every decision is stored on-chain with cryptographic proof</p>
                </div>
                <div>
                  <p className="font-semibold mb-1 text-purple-400">⚡ Deterministic</p>
                  <p className="text-gray-400 text-xs">Same inputs always produce same outputs - predictable and reliable</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Interaction Mode Selector */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 mb-6">
          <h2 className="text-xl font-semibold mb-4">Choose Interaction Mode</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <button
              onClick={() => setInteractionMode('predefined')}
              className={`p-4 rounded-lg border-2 transition-all ${
                interactionMode === 'predefined' 
                  ? 'border-blue-500 bg-blue-900/30' 
                  : 'border-slate-600 hover:border-slate-500'
              }`}
            >
              <div className="text-2xl mb-2">🎯</div>
              <h3 className="font-semibold mb-1">Predefined Checks</h3>
              <p className="text-xs text-gray-400">Select from common decision types (recommended)</p>
            </button>
            
            <button
              onClick={() => setShowApiDocs(!showApiDocs)}
              className="p-4 rounded-lg border-2 border-slate-600 hover:border-slate-500 transition-all"
            >
              <div className="text-2xl mb-2">🤖</div>
              <h3 className="font-semibold mb-1">API / Bot Interface</h3>
              <p className="text-xs text-gray-400">For developers integrating with external systems</p>
            </button>
            
            <button
              onClick={() => setInteractionMode('natural')}
              className={`p-4 rounded-lg border-2 transition-all ${
                interactionMode === 'natural' 
                  ? 'border-purple-500 bg-purple-900/30' 
                  : 'border-slate-600 hover:border-slate-500'
              }`}
            >
              <div className="text-2xl mb-2">💬</div>
              <h3 className="font-semibold mb-1">Natural Language</h3>
              <p className="text-xs text-gray-400">Optional helper layer (translates to predefined checks)</p>
            </button>
          </div>
        </div>

        {/* API Documentation */}
        {showApiDocs && (
          <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700 mb-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold">API / Bot Integration Guide</h2>
              <button onClick={() => setShowApiDocs(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-blue-300 mb-2">Contract Address</h3>
                <code className="block bg-black/50 p-3 rounded text-sm text-green-400 font-mono">
                  {CONTRACT_ADDRESS}
                </code>
              </div>

              <div>
                <h3 className="font-semibold text-blue-300 mb-2">Trigger Decision Check</h3>
                <code className="block bg-black/50 p-3 rounded text-sm text-green-400 font-mono whitespace-pre">
{`// Call this function to trigger Chainlink Functions request
function sendRequest() external returns (bytes32 requestId)

// Example using ethers.js:
const contract = new ethers.Contract(address, abi, signer);
const tx = await contract.sendRequest();
const receipt = await tx.wait();
// Extract requestId from RequestSent event`}
                </code>
              </div>

              <div>
                <h3 className="font-semibold text-blue-300 mb-2">Read Latest Result</h3>
                <code className="block bg-black/50 p-3 rounded text-sm text-green-400 font-mono whitespace-pre">
{`// Read the latest on-chain decision result
function getLatestState() external view returns (
  uint256 timestamp,
  uint256 priceETH,
  uint256 priceBTC,
  uint256 aggregatedScore,  // 0-100 risk/decision score
  bool thresholdTriggered,  // true if score > threshold
  string decisionReason,    // human-readable explanation
  string dataSources,       // APIs used
  bytes32 requestId         // Chainlink Functions request ID
)`}
                </code>
              </div>

              <div>
                <h3 className="font-semibold text-blue-300 mb-2">Bot Integration Example</h3>
                <code className="block bg-black/50 p-3 rounded text-sm text-green-400 font-mono whitespace-pre">
{`// Example: Trading bot reading decision score
const state = await contract.getLatestState();
if (state.aggregatedScore > 75 && state.thresholdTriggered) {
  // High risk detected - trigger defensive action
  await executeSafetyProtocol();
}`}
                </code>
              </div>

              <div className="bg-yellow-900/20 border border-yellow-700/50 rounded p-3 text-sm">
                <strong className="text-yellow-400">Primary Use Case:</strong> External systems (bots, agents, smart contracts) 
                call <code>sendRequest()</code> periodically or event-driven, then read <code>getLatestState()</code> to get 
                trustless, verified market intelligence for automated decision-making.
              </div>
            </div>
          </div>
        )}

        {/* Predefined Checks Interface */}
        {interactionMode === 'predefined' && (
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 mb-6">
            <h2 className="text-xl font-semibold mb-4">Predefined Decision Checks</h2>
            <p className="text-sm text-gray-400 mb-4">
              Select a decision check to execute. Each check triggers a real Chainlink Functions request that fetches live data, 
              computes results trustlessly, and updates on-chain state.
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              {PREDEFINED_CHECKS.map(check => (
                <button
                  key={check.id}
                  onClick={() => handlePredefinedCheck(check.id)}
                  disabled={workflowStatus === 'pending' || workflowStatus === 'sending'}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedCheck === check.id
                      ? 'border-green-500 bg-green-900/20'
                      : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/30'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{check.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{check.name}</h3>
                      <p className="text-xs text-gray-400 mb-2">{check.description}</p>
                      <span className="text-xs px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded">
                        {check.category}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Natural Language Interface */}
        {interactionMode === 'natural' && (
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 mb-6">
            <h2 className="text-xl font-semibold mb-2">Natural Language Query</h2>
            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded p-3 text-sm mb-4">
              <strong>Note:</strong> This is a helper layer that translates your text into predefined, safe decision checks. 
              It does NOT allow arbitrary execution. The engine remains deterministic and rule-based.
            </div>
            
            <div className="space-y-3">
              <textarea
                value={naturalLanguageInput}
                onChange={(e) => setNaturalLanguageInput(e.target.value)}
                placeholder="Example: 'Check if there's high volatility in ETH prices' or 'Verify price consistency across sources'"
                className="w-full p-3 bg-slate-900/50 border border-slate-600 rounded-lg text-sm resize-none h-24"
                disabled={workflowStatus === 'pending' || workflowStatus === 'sending'}
              />
              
              <button
                onClick={handleNaturalLanguage}
                disabled={workflowStatus === 'pending' || workflowStatus === 'sending' || !naturalLanguageInput.trim()}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Execute Query
              </button>
              
              <p className="text-xs text-gray-500">
                Your query will be mapped to: <strong className="text-blue-400">{selectedCheck || 'market_risk'}</strong> check
              </p>
            </div>
          </div>
        )}

        {/* Workflow Status */}
        {(workflowStatus !== 'idle' || txHash) && (
          <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-6 border border-blue-700/50 mb-6">
            <h2 className="text-xl font-semibold mb-3">Workflow Status</h2>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Status:</span>
                <span className={`font-semibold ${getStatusColor()}`}>{getStatusText()}</span>
              </div>
              
              {txHash && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">Transaction:</span>
                  <a 
                    href={`${EXPLORER_URL}/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline font-mono"
                  >
                    {shortenHash(txHash)}
                  </a>
                </div>
              )}
              
              {currentRequestId && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">Request ID:</span>
                  <span className="text-purple-400 font-mono text-xs">{shortenHash(currentRequestId)}</span>
                </div>
              )}
              
              {error && (
                <div className="bg-red-900/20 border border-red-700/50 rounded p-3 text-sm text-red-400">
                  {error}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${state?.timestamp ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
              Latest On-Chain Result
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
                  <div className="flex gap-1 flex-wrap">
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
              <p className="text-gray-500">No results yet. Execute a decision check to see data.</p>
            )}
          </div>

          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold mb-2">Decision Score</h2>
            <div className="text-xs text-gray-400 mb-4 bg-slate-900/50 p-2 rounded">
              <strong>What this means:</strong> Calculated from price volatility and cross-source deviation. 
              Higher scores indicate higher market activity/risk.
              <br/><strong>How to use it:</strong> Smart contracts, bots, and DAOs can read this score on-chain 
              to trigger automated actions with verifiable, trustless data.
            </div>
            
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

        {/* Statistics */}
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

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-4 justify-center">
          <button 
            onClick={() => fetchData()} 
            disabled={loading}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
          <a 
            href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
          >
            View Contract
          </a>
          <a 
            href="https://functions.chain.link/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
          >
            Chainlink Functions
          </a>
        </div>

        <footer className="mt-12 text-center text-sm text-gray-500">
          <p className="font-medium text-gray-400">AutoSentinel Decision Engine - Convergence: A Chainlink Hackathon</p>
          <p className="mt-1">Powered by Chainlink Functions</p>
          <p className="mt-1 text-xs">
            Contract: <a href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`} className="text-blue-400 hover:underline" target="_blank">
              {CONTRACT_ADDRESS.slice(0, 10)}...{CONTRACT_ADDRESS.slice(-8)}
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
