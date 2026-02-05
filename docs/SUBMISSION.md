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
- Solidity smart contract on Sepolia testnet
- TypeScript CRE workflow implementation
- Next.js frontend dashboard
- Free public APIs (CoinGecko, CoinCap)

AutoSentinel showcases how CRE enables trustless, efficient, and intelligent automation that was previously impossible with traditional oracle solutions. Our approach demonstrates a practical pattern for any DeFi protocol needing autonomous, verifiable decision-making.

---

## Submission Links

| Item | URL |
|------|-----|
| GitHub Repository | `https://github.com/[username]/hackathonvc-autosentinel` |
| Demo Video | `https://www.youtube.com/watch?v=XXXXXX` |
| Live Demo (Frontend) | `https://autosentinel.vercel.app` (optional) |
| Contract (Sepolia) | `https://sepolia.etherscan.io/address/[CONTRACT_ADDRESS]` |

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

### CRE Workflow Implementation

```typescript
// Simplified workflow structure
workflow AutoSentinel {
  step FetchData {
    capability: "http_fetch"
    sources: ["api.coingecko.com", "api.coincap.io"]
  }
  
  step ComputeDecision {
    capability: "compute"
    logic: "threshold_analysis"
    inputs: FetchData.output
  }
  
  step ExecuteOnChain {
    capability: "chain_write"
    condition: ComputeDecision.score >= threshold
    contract: "AutoSentinel@Sepolia"
    function: "updateSentinelState"
  }
}
```

### Smart Contract State Changes

The `AutoSentinel.sol` contract receives state updates from CRE:

```solidity
function updateSentinelState(
    uint256 _priceETH,
    uint256 _priceBTC,
    uint256 _aggregatedScore,
    bool _thresholdTriggered,
    string calldata _decisionReason
) external onlyAuthorized;
```

This function:
1. Validates inputs
2. Stores previous state in history
3. Updates current state
4. Emits `StateUpdated` event
5. Emits `ThresholdTriggered` if applicable

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
