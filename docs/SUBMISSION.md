# AutoSentinel - Hackathon Submission

## Submission Description

### Project Title
**AutoSentinel: AI-Enhanced Trustless Market Intelligence Engine**

### Description

AutoSentinel is a deterministic decision engine that combines Chainlink Functions with AI-powered natural language processing to provide trustless market intelligence through three powerful interaction modes.

**The Problem:** DeFi protocols, trading bots, and DAOs need intelligent decisions based on real-world data, but on-chain computation is expensive and centralized solutions break trustlessness.

**Our Solution:** AutoSentinel leverages Chainlink Functions + AI to create unprecedented flexibility:

1. **HTTP Fetch Capability** - Pulls real-time price data from multiple sources (CoinGecko, CoinCap) for redundancy and manipulation resistance.

2. **Compute Capability** - Applies sophisticated decision logic off-chain, calculating price deviations, aggregating multi-source data, and generating a decision score based on configurable thresholds.

3. **Chain Write Capability** - Executes transparent, verifiable state updates on-chain only when meaningful thresholds are exceeded, optimizing for gas efficiency.

**Three Interaction Modes:**

1. **Predefined Decision Checks** - 4 common patterns (Market Risk, Price Deviation, Volatility, Multi-Source Confirmation) for bots and protocols
2. **API/Bot Interface** - Direct smart contract integration for external systems
3. **AI-Powered Natural Language** - OpenAI/Google AI/Anthropic translate text queries to safe, predefined checks

**Key Innovation:**
AI enhances UX by translating natural language ("Is ETH safe to trade?") into structured, deterministic decision types, then executes trustlessly via Chainlink Functions. The AI translates but doesn't execute - maintaining predictability while improving accessibility.

**Chainlink Functions Usage:**
- ✅ **HTTP:** Fetches from CoinGecko + CoinCap APIs
- ✅ **Compute:** Off-chain score calculation, multi-source aggregation
- ✅ **Chain Write:** Updates on-chain state with verified results
- ✅ **Trustless:** No single server controls computation

**Real-World Value:**
- Trading bots use API for risk scoring
- DeFi protocols read on-chain scores for circuit breakers
- DAOs query market conditions for treasury decisions
- Users interact via natural language or predefined checks

**Technical Stack:**
- Solidity 0.8.28 + Chainlink Functions
- Next.js 14 + TypeScript frontend
- OpenAI GPT-3.5 + Google Gemini + Anthropic Claude (AI layer)
- Docker production deployment
- Live demo: http://157.180.26.112:3005

AutoSentinel demonstrates the perfect fusion of Chainlink's trustless execution with AI-enhanced UX, solving real DeFi problems while maintaining deterministic reliability.

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

**Organization:** QuanticaLab  
**Lead Developer:** Tuval Zvigerbi  
**GitHub:** https://github.com/tuvalsss  

**Team Expertise:**
- Full-stack blockchain development
- Smart contract security and optimization
- AI/ML integration in decentralized systems
- Production infrastructure and DevOps

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

## Feature Highlights for Judges

### What You'll See in the Demo

1. **Three Interaction Modes** - Unprecedented flexibility
   - Click predefined checks OR
   - Write natural language queries OR
   - Integrate via API/smart contract

2. **AI Translation Transparency**
   - See which AI processed your query (OpenAI/Google/Anthropic)
   - Visual badges showing AI provider used
   - Clear mapping from text → predefined check

3. **Real-Time Status Tracking**
   - Progress bar with estimated time
   - Transaction hash with Etherscan link
   - Request ID for verification
   - Color-coded status indicators

4. **On-Chain Verification**
   - Every result has cryptographic proof
   - Viewable on Etherscan
   - Includes timestamp, prices, score, reasoning

5. **Professional UX**
   - Comprehensive onboarding
   - LINK balance warnings (if low)
   - Automatic network switching
   - Error handling with troubleshooting tips

### Chainlink Functions Core Integration

**Not just a wrapper!** Our system REQUIRES Chainlink Functions to operate:
- Cannot fetch multi-source data without DON
- Cannot aggregate trustlessly without decentralized compute
- Cannot verify results without on-chain callbacks
- Remove Chainlink Functions = system stops working

This is **essential integration**, not superficial.

---

## Acknowledgments

- **Chainlink** - For the powerful Functions platform and excellent documentation
- **OpenAI** - For GPT-3.5 API enabling natural language translation
- **Google** - For Gemini Pro API providing fallback AI capabilities
- **Anthropic** - For Claude API as additional fallback
- **CoinGecko** & **CoinCap** - For reliable, free market data APIs
- **Ethereum Foundation** - For Sepolia testnet infrastructure

---

## Copyright

© 2026 **QuanticaLab** & **Tuval Zvigerbi**. All Rights Reserved.

Built with ❤️ using Chainlink Functions, OpenAI, Google AI, Anthropic Claude, and Ethereum.
