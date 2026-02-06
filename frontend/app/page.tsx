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
  "function getLatestState() external view returns (uint256 timestamp, uint256 priceETH, uint256 priceBTC, uint256 aggregatedScore, bool thresholdTriggered, string decisionReason, string dataSources, bytes32 requestId)",
  "function getStatistics() external view returns (uint256 _totalUpdates, uint256 _totalThresholdTriggers, uint256 _totalRequests, uint256 _currentThreshold, uint256 _lastUpdateTime, bytes32 _lastRequestId)",
  "function getRequestStatus(bytes32 requestId) external view returns (bool exists, bool fulfilled, bytes response, bytes err, uint256 timestamp)",
  "function threshold() external view returns (uint256)",
  "event RequestSent(bytes32 indexed requestId, address indexed requester, uint256 timestamp)",
  "event Response(bytes32 indexed requestId, bytes response, bytes err)",
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
  const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0xB1C85052CB557A20Cb036d8bA02cBC05A22e070f';
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

      // Always set state, even if timestamp is 0
      setState({
        timestamp: Number(latestState[0]),
        priceETH: Number(latestState[1]) / 100,
        priceBTC: Number(latestState[2]) / 100,
        aggregatedScore: Number(latestState[3]),
        thresholdTriggered: latestState[4],
        decisionReason: latestState[5] || 'No data yet',
        dataSources: latestState[6] || 'None',
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
    const maxAttempts = 45; // 90 seconds total (45 * 2s)
    
    const poll = async () => {
      try {
        attempts++;
        
        // Check request status - returns (exists, fulfilled, response, err, timestamp)
        const status = await contract.getRequestStatus(requestId);
        
        if (status[1]) { // fulfilled is index 1
          setWorkflowStatus('fulfilled');
          setError('✅ Request fulfilled successfully! Refreshing data...');
          await fetchData();
          setTimeout(() => setError(null), 2000); // Clear success message after 2s
          return;
        }
        
        // Update progress message more frequently
        if (attempts % 5 === 0) {
          setError(`⏳ Waiting for Chainlink DON response... (${attempts * 2}s / 90s)`);
        }
        
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000); // Check every 2 seconds
        } else {
          // Timeout - refresh and show last data
          await fetchData();
          setError('⏰ Request is taking longer than usual. Data may update soon - check back in a minute or refresh the page.');
          setWorkflowStatus('idle');
        }
      } catch (err) {
        console.error('Polling error:', err);
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        }
      }
    };
    
    // Start polling after 2 seconds
    setTimeout(poll, 2000);
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
      setWorkflowStatus('connecting');
      
      // Always verify connection and network before triggering
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Request accounts
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
            params: [{ chainId: '0xaa36a7' }],
          });
          
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          const newNetwork = await provider.getNetwork();
          if (Number(newNetwork.chainId) !== 11155111) {
            setError('❌ Please approve network switch in MetaMask and try again');
            setWorkflowStatus('error');
            return;
          }
          
          setWalletConnected(true);
        } catch (switchError: any) {
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
            } catch (addError) {
              setError('❌ Failed to add Sepolia network');
              setWorkflowStatus('error');
              return;
            }
          } else if (switchError.code === 4001) {
            setError('❌ You rejected the network switch. Please try again and approve.');
            setWorkflowStatus('error');
            return;
          } else {
            setError(`❌ Please switch to Sepolia manually in MetaMask`);
            setWorkflowStatus('error');
            return;
          }
        }
      } else {
        setWalletConnected(true);
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

  const handleNaturalLanguage = async () => {
    if (!naturalLanguageInput.trim()) {
      setError('Please enter a query');
      return;
    }
    
    try {
      setError('🤖 Translating your query with AI...');
      setWorkflowStatus('connecting');
      
      // Call our API to translate the query using AI
      const response = await fetch('/api/translate-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: naturalLanguageInput })
      });
      
      const data = await response.json();
      
      if (data.checkId) {
        setSelectedCheck(data.checkId);
        setError(`✅ Mapped to: ${PREDEFINED_CHECKS.find(c => c.id === data.checkId)?.name} (via ${data.provider})`);
        
        // Wait a moment to show the mapping
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Now trigger the workflow
        triggerWorkflow(data.checkId);
      } else {
        setError('Failed to translate query. Try again or select a predefined check.');
        setWorkflowStatus('idle');
      }
    } catch (err) {
      console.error('Natural language error:', err);
      setError('Failed to process query. Please try a predefined check instead.');
      setWorkflowStatus('idle');
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            // Check if on correct network
            const provider = new ethers.BrowserProvider(window.ethereum);
            const network = await provider.getNetwork();
            const chainId = Number(network.chainId);
            
            if (chainId === 11155111) {
              setWalletConnected(true);
            } else {
              setWalletConnected(false);
            }
          }
        } catch (err) {
          console.error('Connection check error:', err);
          setWalletConnected(false);
        }
      }
    };
    
    checkConnection();
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
            <h2 className="text-xl font-semibold mb-2">🤖 AI-Powered Natural Language Query</h2>
            <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-700/50 rounded p-4 text-sm mb-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="text-2xl">🧠</div>
                <div>
                  <strong className="text-purple-300">AI Translation Layer</strong>
                  <p className="text-gray-400 text-xs mt-1">
                    Your natural language query is processed by advanced AI (OpenAI GPT-3.5 → Google AI → Anthropic Claude)
                    and translated into a safe, predefined decision check. The engine remains deterministic and rule-based.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-green-900/20 border border-green-700/50 rounded p-2">
                  <div className="font-semibold text-green-400">1️⃣ OpenAI GPT-3.5</div>
                  <div className="text-gray-400">Primary translator</div>
                </div>
                <div className="bg-blue-900/20 border border-blue-700/50 rounded p-2">
                  <div className="font-semibold text-blue-400">2️⃣ Google Gemini</div>
                  <div className="text-gray-400">First fallback</div>
                </div>
                <div className="bg-purple-900/20 border border-purple-700/50 rounded p-2">
                  <div className="font-semibold text-purple-400">3️⃣ Anthropic Claude</div>
                  <div className="text-gray-400">Second fallback</div>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Enter your query in plain English:</label>
                <textarea
                  value={naturalLanguageInput}
                  onChange={(e) => setNaturalLanguageInput(e.target.value)}
                  placeholder="Examples:
• 'Is it safe to trade right now?'
• 'Check if there's high volatility in ETH'
• 'Are prices accurate across exchanges?'
• 'Verify BTC price from multiple sources'"
                  className="w-full p-3 bg-slate-900/50 border border-slate-600 rounded-lg text-sm resize-none h-32"
                  disabled={workflowStatus === 'pending' || workflowStatus === 'sending' || workflowStatus === 'connecting'}
                />
              </div>
              
              <button
                onClick={handleNaturalLanguage}
                disabled={workflowStatus === 'pending' || workflowStatus === 'sending' || workflowStatus === 'connecting' || !naturalLanguageInput.trim()}
                className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {workflowStatus === 'connecting' ? '🤖 AI Processing Query...' : '🚀 Execute AI-Powered Query'}
              </button>
              
              {selectedCheck && (
                <div className="bg-green-900/20 border border-green-700/50 rounded p-3">
                  <div className="flex items-center gap-2 text-green-400">
                    <span className="text-xl">✨</span>
                    <div>
                      <div className="font-semibold">AI Translation Complete!</div>
                      <div className="text-xs text-gray-400">
                        Mapped to: <strong className="text-green-300">{PREDEFINED_CHECKS.find(c => c.id === selectedCheck)?.name}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Workflow Status */}
        {(workflowStatus !== 'idle' || txHash) && (
          <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-6 border border-blue-700/50 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span>⚡</span>
              Workflow Execution Status
            </h2>
            
            <div className="space-y-4">
              {/* Status Progress */}
              <div className="bg-slate-900/50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-4 h-4 rounded-full ${workflowStatus === 'pending' || workflowStatus === 'sending' ? 'bg-yellow-500 animate-pulse' : workflowStatus === 'fulfilled' ? 'bg-green-500' : workflowStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'}`}></div>
                  <div>
                    <div className={`font-bold text-lg ${getStatusColor()}`}>{getStatusText()}</div>
                    <div className="text-xs text-gray-400">
                      {workflowStatus === 'connecting' && 'Connecting to MetaMask...'}
                      {workflowStatus === 'sending' && 'Broadcasting transaction to Sepolia...'}
                      {workflowStatus === 'pending' && 'Chainlink DON is fetching data and computing results...'}
                      {workflowStatus === 'fulfilled' && 'Results verified and stored on-chain!'}
                      {workflowStatus === 'error' && 'An error occurred during execution'}
                    </div>
                  </div>
                </div>
                
                {workflowStatus === 'pending' && (
                  <div className="flex gap-2 text-xs">
                    <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse" style={{width: '70%'}}></div>
                    </div>
                    <span className="text-gray-400">Est. 30-60s</span>
                  </div>
                )}
              </div>
              
              {/* Transaction Details */}
              {txHash && (
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Transaction Hash</div>
                  <a 
                    href={`${EXPLORER_URL}/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline font-mono text-sm flex items-center gap-2"
                  >
                    {shortenHash(txHash)}
                    <span className="text-xs">↗</span>
                  </a>
                </div>
              )}
              
              {currentRequestId && (
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Chainlink Functions Request ID</div>
                  <span className="text-purple-400 font-mono text-sm">{shortenHash(currentRequestId)}</span>
                </div>
              )}
              
              {error && (
                <div className="bg-red-900/20 border-2 border-red-700/50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <div className="font-semibold text-red-400 mb-1">Error Occurred</div>
                      <div className="text-sm text-red-300">{error}</div>
                      {error.includes('timeout') && (
                        <div className="mt-2 text-xs text-gray-400 bg-slate-900/50 p-2 rounded">
                          <strong>Troubleshooting:</strong> Request timeout can occur due to DON overload or insufficient LINK balance.
                          Check the transaction on Etherscan to verify if it was fulfilled.
                        </div>
                      )}
                    </div>
                  </div>
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
            ) : state ? (
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
                  {state.timestamp === 0 && (
                    <p className="text-yellow-400 text-xs mt-1">⚠️ Waiting for first fulfillment...</p>
                  )}
                  <p>Request ID: {shortenHash(state.requestId)}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">📊</div>
                <p className="text-gray-400 mb-2">No data available yet</p>
                <p className="text-sm text-gray-500">Execute a decision check to see live market intelligence</p>
              </div>
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

        <footer className="mt-12 border-t border-slate-700 pt-8 pb-4">
          <div className="max-w-4xl mx-auto">
            {/* Main Footer Content */}
            <div className="text-center mb-6">
              <h3 className="font-bold text-xl text-gray-300 mb-2">AutoSentinel Decision Engine</h3>
              <p className="text-sm text-gray-400 mb-3">
                Trustless Market Intelligence powered by Chainlink Functions
              </p>
              <div className="flex items-center justify-center gap-4 text-xs flex-wrap">
                <span className="px-3 py-1 bg-blue-900/30 rounded-full">🤖 AI-Powered Translation</span>
                <span className="px-3 py-1 bg-purple-900/30 rounded-full">⚡ Chainlink Functions</span>
                <span className="px-3 py-1 bg-green-900/30 rounded-full">✅ On-Chain Verification</span>
              </div>
            </div>

            {/* Technology Stack */}
            <div className="bg-slate-800/30 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-semibold text-gray-400 mb-3 text-center">Built With</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-center">
                <div>
                  <div className="font-semibold text-blue-400">Chainlink Functions</div>
                  <div className="text-gray-500">Decentralized Oracle Network</div>
                </div>
                <div>
                  <div className="font-semibold text-green-400">OpenAI GPT-3.5</div>
                  <div className="text-gray-500">Natural Language AI</div>
                </div>
                <div>
                  <div className="font-semibold text-purple-400">Solidity 0.8.28</div>
                  <div className="text-gray-500">Smart Contracts</div>
                </div>
                <div>
                  <div className="font-semibold text-cyan-400">Next.js 14</div>
                  <div className="text-gray-500">React Frontend</div>
                </div>
              </div>
            </div>

            {/* Contract Info */}
            <div className="text-center mb-6 text-xs">
              <div className="text-gray-500">Smart Contract (Sepolia Testnet)</div>
              <a 
                href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`} 
                className="text-blue-400 hover:underline font-mono" 
                target="_blank"
                rel="noopener noreferrer"
              >
                {CONTRACT_ADDRESS}
              </a>
            </div>

            {/* Links */}
            <div className="flex justify-center gap-6 mb-6 text-sm">
              <a 
                href="https://github.com/tuvalsss/hackathonVc" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-400 transition-colors"
              >
                📂 GitHub
              </a>
              <a 
                href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-400 transition-colors"
              >
                🔍 Etherscan
              </a>
              <a 
                href="https://functions.chain.link/sepolia/6239" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-400 transition-colors"
              >
                🔗 Chainlink
              </a>
            </div>

            {/* Copyright */}
            <div className="border-t border-slate-700 pt-4 text-center">
              <div className="text-sm text-gray-400 mb-2">
                <strong>Convergence: A Chainlink Hackathon</strong> - February 2026
              </div>
              <div className="text-xs text-gray-500">
                © 2026 <strong className="text-gray-400">QuanticaLab</strong> & <strong className="text-gray-400">Tuval Zvigerbi</strong>. All Rights Reserved.
              </div>
              <div className="text-xs text-gray-600 mt-2">
                Built with ❤️ using Chainlink Functions, OpenAI, Google AI, Anthropic Claude, and Ethereum
              </div>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
