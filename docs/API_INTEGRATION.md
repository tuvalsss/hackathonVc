# AutoSentinel API & Bot Integration Guide

## Overview

AutoSentinel is a **deterministic decision engine** designed primarily for programmatic integration. External systems (trading bots, smart contracts, backend services, agents) interact with it to obtain trustless, verified market intelligence.

---

## Contract Information

**Deployed Address (Sepolia):**
```
0xB1C85052CB557A20Cb036d8bA02cBC05A22e070f
```

**Explorer:**
```
https://sepolia.etherscan.io/address/0xB1C85052CB557A20Cb036d8bA02cBC05A22e070f
```

**Network:** Ethereum Sepolia Testnet (Chain ID: 11155111)

---

## Primary Functions

### 1. Trigger Decision Check

```solidity
function sendRequest() external returns (bytes32 requestId)
```

**Purpose:** Triggers a Chainlink Functions request to fetch real-time market data, compute decision score, and update on-chain state.

**Returns:** `bytes32 requestId` - Unique identifier for this request

**Gas Estimate:** ~300,000 gas

**Events Emitted:**
```solidity
event RequestSent(bytes32 indexed requestId, address indexed requester, uint256 timestamp)
```

**Example (ethers.js):**
```javascript
const contract = new ethers.Contract(address, abi, signer);
const tx = await contract.sendRequest();
const receipt = await tx.wait();

// Extract requestId from event
const event = receipt.logs
  .map(log => contract.interface.parseLog(log))
  .find(e => e.name === 'RequestSent');
const requestId = event.args[0];
console.log('Request ID:', requestId);
```

---

### 2. Read Latest On-Chain Result

```solidity
function getLatestState() external view returns (
  uint256 timestamp,
  uint256 priceETH,
  uint256 priceBTC,
  uint256 aggregatedScore,
  bool thresholdTriggered,
  string decisionReason,
  string dataSources,
  bytes32 requestId
)
```

**Purpose:** Read the most recent decision result stored on-chain.

**Returns:**
- `timestamp` - Unix timestamp of last update
- `priceETH` - ETH price in cents (divide by 100 for USD)
- `priceBTC` - BTC price in cents (divide by 100 for USD)
- `aggregatedScore` - Decision score (0-100)
- `thresholdTriggered` - Boolean indicating if score exceeded threshold
- `decisionReason` - Human-readable explanation
- `dataSources` - Comma-separated list of data sources used
- `requestId` - Chainlink Functions request ID

**Example (ethers.js):**
```javascript
const state = await contract.getLatestState();
console.log('Decision Score:', state.aggregatedScore.toString());
console.log('ETH Price:', Number(state.priceETH) / 100);
console.log('Triggered:', state.thresholdTriggered);
console.log('Reason:', state.decisionReason);
```

---

### 3. Check Request Status

```solidity
function getRequestStatus(bytes32 requestId) external view returns (
  bool exists,
  bool fulfilled,
  bytes response,
  bytes err,
  uint256 timestamp
)
```

**Purpose:** Check the status of a specific Chainlink Functions request.

**Parameters:**
- `requestId` - The request ID returned from `sendRequest()`

**Returns:**
- `exists` - Whether this request ID exists
- `fulfilled` - Whether Chainlink DON has fulfilled it
- `response` - Raw response bytes
- `err` - Error bytes (if any)
- `timestamp` - Fulfillment timestamp

---

### 4. Get Statistics

```solidity
function getStatistics() external view returns (
  uint256 totalUpdates,
  uint256 totalThresholdTriggers,
  uint256 totalRequests,
  uint256 currentThreshold,
  uint256 lastUpdateTime,
  bytes32 lastRequestId
)
```

**Purpose:** Retrieve aggregate statistics about the decision engine.

---

## Integration Patterns

### Pattern 1: Periodic Monitoring Bot

```javascript
// Bot that checks market conditions every 5 minutes
const ethers = require('ethers');

const INTERVAL = 5 * 60 * 1000; // 5 minutes
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

async function monitorMarket() {
  try {
    // Trigger new decision check
    const tx = await contract.sendRequest();
    console.log('Request sent:', tx.hash);
    
    await tx.wait();
    
    // Wait for fulfillment (30-60 seconds)
    await new Promise(resolve => setTimeout(resolve, 60000));
    
    // Read result
    const state = await contract.getLatestState();
    
    if (state.thresholdTriggered) {
      console.log('⚠️ ALERT: Threshold triggered!');
      console.log('Score:', state.aggregatedScore.toString());
      console.log('Reason:', state.decisionReason);
      
      // Trigger your action (e.g., send notification, execute trade, etc.)
      await handleAlert(state);
    }
  } catch (error) {
    console.error('Monitoring error:', error);
  }
}

setInterval(monitorMarket, INTERVAL);
```

---

### Pattern 2: Event-Driven Listener

```javascript
// Listen for fulfillment events in real-time
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

contract.on('Response', async (requestId, response, err) => {
  console.log('Request fulfilled:', requestId);
  
  // Fetch latest state
  const state = await contract.getLatestState();
  
  if (state.thresholdTriggered) {
    // React to trigger immediately
    await executeAutomatedStrategy(state);
  }
});
```

---

### Pattern 3: Smart Contract Integration

```solidity
// Another smart contract reading AutoSentinel results
interface IAutoSentinel {
    function getLatestState() external view returns (
        uint256 timestamp,
        uint256 priceETH,
        uint256 priceBTC,
        uint256 aggregatedScore,
        bool thresholdTriggered,
        string memory decisionReason,
        string memory dataSources,
        bytes32 requestId
    );
}

contract MyDeFiProtocol {
    IAutoSentinel public sentinel;
    
    constructor(address _sentinel) {
        sentinel = IAutoSentinel(_sentinel);
    }
    
    function checkRiskAndExecute() external {
        (
            uint256 timestamp,
            ,  // priceETH
            ,  // priceBTC
            uint256 score,
            bool triggered,
            ,  // decisionReason
            ,  // dataSources
             // requestId
        ) = sentinel.getLatestState();
        
        // Ensure data is fresh (within last hour)
        require(block.timestamp - timestamp < 3600, "Stale data");
        
        // Only execute if risk is acceptable
        if (score < 80) {
            // Safe to proceed
            executeLeveragedPosition();
        } else {
            // Too risky - reduce exposure
            emergencyExit();
        }
    }
}
```

---

### Pattern 4: REST API Wrapper (Backend Service)

```javascript
// Express.js wrapper for web2 applications
const express = require('express');
const ethers = require('ethers');

const app = express();
const provider = new ethers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

// Read-only endpoint (no gas required)
app.get('/api/decision', async (req, res) => {
  try {
    const state = await contract.getLatestState();
    
    res.json({
      timestamp: Number(state.timestamp),
      prices: {
        eth: Number(state.priceETH) / 100,
        btc: Number(state.priceBTC) / 100
      },
      score: Number(state.aggregatedScore),
      triggered: state.thresholdTriggered,
      reason: state.decisionReason,
      sources: state.dataSources.split(','),
      requestId: state.requestId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trigger new check (requires wallet)
app.post('/api/trigger', async (req, res) => {
  try {
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contractWithSigner = contract.connect(wallet);
    
    const tx = await contractWithSigner.sendRequest();
    
    res.json({
      txHash: tx.hash,
      status: 'pending'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('API running on port 3000'));
```

---

## Decision Score Interpretation

The `aggregatedScore` (0-100) represents:

| Score Range | Interpretation | Suggested Action |
|-------------|----------------|------------------|
| 0-25 | Low volatility, stable market | Safe for high-leverage positions |
| 26-50 | Moderate activity | Normal operations |
| 51-75 | Elevated volatility | Reduce exposure, increase monitoring |
| 76-100 | High volatility/deviation | Emergency protocols, circuit breakers |

**Threshold:** Configurable on-chain (default: 75). When score exceeds threshold, `thresholdTriggered` becomes `true`.

---

## Data Sources

Currently fetches from:
- **CoinGecko API** - `/simple/price` endpoint
- **CoinCap API** - `/v2/assets` endpoint

Score calculation considers:
1. Price deviation between sources
2. Historical volatility patterns
3. Multi-source consensus

---

## Best Practices

### 1. Check Data Freshness
```javascript
const state = await contract.getLatestState();
const ageInSeconds = Date.now() / 1000 - Number(state.timestamp);

if (ageInSeconds > 3600) {
  console.warn('Data is stale (>1 hour old)');
  // Trigger new request if needed
}
```

### 2. Handle Pending Requests
```javascript
// Before triggering new request, check if one is pending
const stats = await contract.getStatistics();
const lastUpdate = Number(stats.lastUpdateTime);
const timeSinceUpdate = Date.now() / 1000 - lastUpdate;

if (timeSinceUpdate < 120) {
  console.log('Recent update detected, skipping trigger');
  return;
}
```

### 3. Monitor Gas Costs
```javascript
// Estimate gas before sending
const gasEstimate = await contract.sendRequest.estimateGas();
const gasPrice = await provider.getFeeData();
const estimatedCost = gasEstimate * gasPrice.gasPrice;

console.log('Estimated cost:', ethers.formatEther(estimatedCost), 'ETH');
```

### 4. Implement Retry Logic
```javascript
async function triggerWithRetry(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const tx = await contract.sendRequest();
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}
```

---

## Rate Limits & Costs

- **Chainlink Functions Requests:** Limited by LINK balance in subscription
- **Gas Cost:** ~300,000 gas per `sendRequest()` call (~$0.50-$2 depending on gas price)
- **Fulfillment Time:** 30-90 seconds typical
- **Recommended Trigger Frequency:** Every 5-15 minutes (not every block)

---

## Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| "Insufficient LINK balance" | Subscription out of funds | Refill subscription at functions.chain.link |
| "Request timeout" | DON overload or API failure | Retry after 2 minutes |
| "Only router" | Direct call to fulfillRequest | Always use sendRequest() |
| "Stale data" | No recent updates | Trigger new request |

---

## Support & Resources

- **Contract Explorer:** https://sepolia.etherscan.io/address/0xB1C85052CB557A20Cb036d8bA02cBC05A22e070f
- **Chainlink Functions Docs:** https://docs.chain.link/chainlink-functions
- **Subscription Management:** https://functions.chain.link/sepolia/6239
- **GitHub Repository:** https://github.com/tuvalsss/hackathonVc

---

## Summary

**Primary Use Case:** External bots, agents, and smart contracts call `sendRequest()` periodically or event-driven, then read `getLatestState()` to obtain trustless, verified market intelligence for automated decision-making.

**Key Advantages:**
- ✅ Trustless execution (Chainlink DON)
- ✅ On-chain verification
- ✅ Multi-source data aggregation
- ✅ Deterministic and predictable
- ✅ No single point of failure

**Integration Time:** ~30 minutes for basic bot, ~2 hours for production-grade system
