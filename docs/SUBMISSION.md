# AutoSentinel - Hackathon Submission

## Submission Description (~250 words)

### Project Title
**AutoSentinel: Autonomous Market Intelligence Engine**

### Description

AutoSentinel is an autonomous decision engine that demonstrates meaningful use of the Chainlink Runtime Environment (CRE) by bridging off-chain market intelligence with verifiable on-chain execution.

**The Problem:** DeFi protocols need to make intelligent decisions based on real-world data, but running complex algorithms on-chain is prohibitively expensive, and centralized off-chain solutions create trust issues.

**Our Solution:** AutoSentinel leverages CRE's three core capabilities:

1. **HTTP Fetch Capability** - Pulls real-time price data from multiple sources (CoinGecko, CoinCap) for redundancy and manipulation resistance.

2. **Compute Capability** - Applies sophisticated decision logic off-chain, calculating price deviations, aggregating multi-source data, and generating a decision score based on configurable thresholds.

3. **Chain Write Capability** - Executes transparent, verifiable state updates on-chain only when meaningful thresholds are exceeded, optimizing for gas efficiency.

**Key Features:**
- Multi-source data aggregation prevents single-point manipulation
- Threshold-based execution minimizes unnecessary gas costs
- Human-readable decision reasons stored on-chain for full auditability
- Complete decision trail via smart contract events
- Modern dashboard for real-time workflow visualization

**Technical Stack:**
- Solidity smart contract (FunctionsClient) on Sepolia testnet
- Chainlink Functions for trustless off-chain computation
- JavaScript source code executed on Chainlink DON
- Next.js frontend dashboard with wallet integration
- Free public APIs (CoinGecko, CoinCap)

AutoSentinel showcases how CRE enables trustless, efficient, and intelligent automation that was previously impossible with traditional oracle solutions. Our approach demonstrates a practical pattern for any DeFi protocol needing autonomous, verifiable decision-making.

---

## Submission Links

| Item | URL |
|------|-----|
| GitHub Repository | https://github.com/tuvalsss/hackathonVc |
| Demo Video | *(To be recorded)* |
| Contract (Sepolia) | https://sepolia.etherscan.io/address/0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4 |
| Functions Subscription | https://functions.chain.link/sepolia/6239 |

---

## Track/Category

**Primary Track:** Chainlink Runtime Environment (CRE)

**Criteria Addressed:**
- [x] Meaningful use of CRE
- [x] On-chain state change triggered by CRE workflow
- [x] Clear demonstration of CRE capabilities
- [x] Working demo on testnet

---

## Team Information

| Name | Role | GitHub | Discord |
|------|------|--------|---------|
| [Name 1] | Full Stack Developer | @github | @discord |
| [Name 2] | Smart Contract Developer | @github | @discord |

---

## Technical Details for Judges

### Chainlink Functions Integration

The contract inherits from `FunctionsClient` and implements the request/fulfillment pattern:

```solidity
contract AutoSentinelFunctions is FunctionsClient, ConfirmedOwner {
    // User triggers off-chain computation
    function sendRequest() external returns (bytes32 requestId) {
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(sourceCode);
        req.setArgs([threshold]);
        return _sendRequest(req.encodeCBOR(), subscriptionId, gasLimit, donId);
    }
    
    // Chainlink DON calls back with result
    function fulfillRequest(bytes32 requestId, bytes memory response, bytes memory err) 
        internal override {
        // Parse JSON response and update on-chain state
        _processResponse(requestId, response);
    }
}
```

### JavaScript Source Code (Executed on DON)

```javascript
// Fetch from multiple sources
const [geckoRes, capRes] = await Promise.all([
  Functions.makeHttpRequest({ url: "api.coingecko.com/..." }),
  Functions.makeHttpRequest({ url: "api.coincap.io/..." })
]);

// Compute decision score
let score = 50;
if (ethDeviation > 1) score += 20;
if (sources.length >= 2) score += 15;

// Return encoded result for on-chain storage
return Functions.encodeString(JSON.stringify({
  priceETH, priceBTC, score, triggered, reason, sources
}));
```

### On-Chain State Changes

The `fulfillRequest()` callback:
1. Validates the requestId matches a pending request
2. Parses the JSON response from DON
3. Updates `currentState` struct with prices, score, reason
4. Stores previous state in history
5. Emits `StateUpdated` and `ThresholdTriggered` events

### Gas Efficiency

By computing decisions off-chain and only executing when thresholds are met, AutoSentinel achieves significant gas savings:

- **Without CRE:** Every data point written on-chain (~80,000 gas each)
- **With CRE:** Only meaningful decisions written (~80,000 gas when needed)

In a scenario checking prices every 5 minutes:
- Without optimization: 288 transactions/day = ~23M gas/day
- With threshold filtering: ~10-20 transactions/day = ~1.6M gas/day
- **~93% gas savings**

---

## Acknowledgments

- Chainlink team for CRE documentation and support
- CoinGecko and CoinCap for free API access
- Sepolia testnet faucets
