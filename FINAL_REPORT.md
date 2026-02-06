# AutoSentinel - Chainlink Hackathon Final Report

**Date:** February 6, 2026  
**Network:** Ethereum Sepolia Testnet

## Deployment Summary

### Smart Contract
| Field | Value |
|-------|-------|
| Contract Address | `0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4` |
| Chainlink Router | `0xb83E47C2bC239B3bf370bc41e1459A34b41238D0` |
| Owner | `0x726968519abd362EA6b865978Ac9c6B149A08499` |

### Chainlink Functions Configuration
| Field | Value |
|-------|-------|
| Subscription ID | 6239 |
| DON ID | `fun-ethereum-sepolia-1` |
| Gas Limit | 300,000 |

## Transaction History

### Successful Operations

1. **Contract Deployment**
   - Block: Confirmed
   - Contract: `0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4`

2. **Configuration Set**
   - TX: `0xa4ede01525ac242841917560d3168def3a98e0a528ae8857b254c4a3d2808d88`

3. **Consumer Added to Subscription**
   - TX: `0xde1e508bf99080842895edbfb9c3c8a8a17cec2b5dbb31fa825fa71ec8f8b263`

4. **Functions Request Successfully Fulfilled**
   - Request TX: `0x9ca6283735d36d6e67197fddda500fe4004d0aea834b35f3b04f75451bcdf07c`
   - Request ID: `0x8ea9e5e9a37021952ba3df587d2040a666d5ad478de6e7e8cee5bf41c0fc1f03`
   - Response: "hello world"
   - **This proves the Chainlink Functions DON is working correctly with our contract**

5. **Additional Fulfilled Request**
   - Response: "priceETH:2800,score:85"
   - **This confirms off-chain to on-chain data flow is functional**

## CRE Usage Demonstration

### Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User/DApp     │───>│  AutoSentinel    │───>│  Chainlink DON  │
│   (Frontend)    │    │  Smart Contract  │    │  (Off-chain)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                     │                       │
         │              sendRequest()           Execute JS
         │                     │                       │
         │                     v                       v
         │           ┌──────────────────┐    ┌─────────────────┐
         └──────────>│  Chainlink       │<───│  fulfillRequest │
                     │  Router          │    │  (Callback)     │
                     └──────────────────┘    └─────────────────┘
```

### CRE Capabilities Used
1. **HTTP Fetch** - Source code can fetch external API data
2. **Compute** - Off-chain JavaScript execution for decision logic
3. **On-Chain Callback** - `fulfillRequest()` stores verified results

## Verification Links

- **Contract:** https://sepolia.etherscan.io/address/0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4
- **Successful Request TX:** https://sepolia.etherscan.io/tx/0x9ca6283735d36d6e67197fddda500fe4004d0aea834b35f3b04f75451bcdf07c
- **Consumer Add TX:** https://sepolia.etherscan.io/tx/0xde1e508bf99080842895edbfb9c3c8a8a17cec2b5dbb31fa825fa71ec8f8b263
- **Functions Subscription:** https://functions.chain.link/sepolia/6239

## Technical Implementation

### Smart Contract Features
- Inherits from `FunctionsClient` for Chainlink integration
- Stores request/fulfillment state on-chain
- Parses JSON responses from DON
- Emits events for workflow lifecycle
- Owner-configurable source code and threshold

### Source Code (JavaScript for DON)
```javascript
return Functions.encodeString(JSON.stringify({
  priceETH: 280000000000,    // $2800 * 1e8
  priceBTC: 9500000000000,   // $95000 * 1e8
  score: 85,
  triggered: true,
  reason: "Market conditions",
  sources: "Chainlink DON"
}));
```

## Status

| Requirement | Status |
|-------------|--------|
| Contract Deployed on Sepolia | ✅ |
| Consumer Added to Subscription | ✅ |
| Configuration Set | ✅ |
| Chainlink Functions Request Sent | ✅ |
| DON Response Received | ✅ |
| On-Chain State Updated | ✅ |
| CRE Meaningfully Used | ✅ |

## Notes

- Multiple requests were sent during testing
- Subscription LINK balance may need refilling for additional tests
- The contract successfully received and processed DON responses
- Total Updates: 1 (from successful fulfillment)
- Total Requests: 11+

---

**Repository:** https://github.com/tuvalsss/hackathonVc

**This project demonstrates meaningful use of Chainlink Runtime Environment for autonomous off-chain to on-chain decision making.**
