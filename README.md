# AutoSentinel Decision Engine

**Trustless Market Intelligence powered by Chainlink Functions with AI-Enhanced Interface**

**Live Demo:** http://157.180.26.112:3005  
**Smart Contract:** [0xB1C85052CB557A20Cb036d8bA02cBC05A22e070f](https://sepolia.etherscan.io/address/0xB1C85052CB557A20Cb036d8bA02cBC05A22e070f)  
**GitHub:** [github.com/tuvalsss/hackathonVc](https://github.com/tuvalsss/hackathonVc)

## Overview

AutoSentinel is a deterministic decision engine that provides trustless market intelligence through three powerful interaction modes:

1. Predefined Decision Checks - Common, high-value market analysis patterns
2. API/Bot Interface - Programmatic integration for external systems
3. AI-Powered Natural Language - Translate queries into safe, structured checks

### What Makes This Special

- Meaningful Chainlink Functions Usage: Core functionality requires CRE
- AI-Enhanced UX: OpenAI/Google AI/Anthropic for natural language processing
- Trustless Execution: No single server controls data or computation
- On-Chain Verification: Every result has cryptographic proof
- Production-Ready: Deployed, documented, and fully functional

## Architecture

### System Components

The system consists of three main layers:

- Frontend (Next.js): User interface with AI translation
- Smart Contract (Solidity): On-chain state management and Chainlink Functions integration
- Chainlink DON: Off-chain computation and data fetching

### Chainlink Functions Workflow

1. User triggers request via frontend
2. Smart contract sends request to Chainlink Functions
3. DON executes JavaScript code to fetch and compute
4. DON calls back contract with results
5. Contract updates on-chain state
6. Frontend displays verified results

## Key Features

### 1. Multiple Interaction Modes

#### Predefined Decision Checks (Primary)

- Market Risk Score: Evaluate volatility and cross-source deviation
- Price Deviation Check: Detect discrepancies between data sources
- Volatility Alert: Monitor rapid price changes
- Multi-Source Confirmation: Verify data consistency

Use Cases:
- Trading bots selecting risk assessment types
- DAOs choosing governance data sources
- DeFi protocols picking circuit breaker conditions
- Portfolio managers selecting rebalancing triggers

#### API/Bot Interface (Developer-Focused)

```solidity
// Trigger request
function sendRequest() external returns (bytes32 requestId)

// Read verified result
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

Integration Examples: See `docs/API_INTEGRATION.md`

#### AI-Powered Natural Language (Optional Helper)

- OpenAI GPT-3.5 (Primary translator)
- Google Gemini (First fallback)
- Anthropic Claude (Second fallback)
- Keyword Matching (Final fallback)

Example:
```
User: "Is it safe to trade ETH right now?"
AI: Translates to Market Risk Score check
System: Executes via Chainlink Functions
Result: On-chain verified decision
```

Important: AI only translates text to parameters. The engine remains deterministic.

### 2. Chainlink Functions Integration

What It Does:
- Fetches real-time cryptocurrency prices from CoinGecko and CoinCap
- Fetches prediction market data from Polymarket (volumes, top outcomes)
- Computes decision scores based on deviation, volatility, and prediction market activity
- Executes trustlessly on decentralized oracle network
- Returns verified results to smart contract

Source Code Location: `chainlink-functions/source.js`

Key Capabilities Demonstrated:
- HTTP Requests (CoinGecko + CoinCap + Polymarket APIs)
- Compute (JavaScript execution off-chain)
- Chain Write (Updates on-chain state via callback)
- Multi-Source Aggregation (crypto + prediction markets)
- Error Handling and Fallbacks

### 3. Real-Time Data Aggregation

Data Sources:
- CoinGecko API (`/simple/price` endpoint) - crypto prices
- CoinCap API (`/v2/assets` endpoint) - cross-validation prices
- Polymarket API (`/markets` endpoint) - prediction market activity

Aggregation Logic:
- Cross-validates prices between CoinGecko and CoinCap
- Calculates deviation percentage between sources
- Factors in prediction market volume as a market activity indicator
- Detects anomalies and discrepancies
- Provides consensus-based results

### 4. Oracle Data API

The system exposes a REST API for external integration:

```
GET /api/oracle-data              # Full intelligence (on-chain + Polymarket + combined)
GET /api/oracle-data?source=onchain     # On-chain verified data only
GET /api/oracle-data?source=polymarket  # Live Polymarket data only
```

Response includes:
- On-chain verified prices and scores from Chainlink Functions
- Live Polymarket prediction market data (top markets, volumes, outcome probabilities)
- Combined intelligence scoring with risk level assessment
- Contract metadata and explorer links

### 5. On-Chain Verification

Every execution produces:
- Unique requestId from Chainlink Functions
- Transaction hash on Sepolia testnet
- Timestamp of execution
- Verifiable result data
- Event logs for transparency

View on Etherscan:
```
https://sepolia.etherscan.io/address/0xB1C85052CB557A20Cb036d8bA02cBC05A22e070f
```

## Quick Start

### Prerequisites

- Node.js 18+
- MetaMask browser extension
- Sepolia testnet ETH (Get from https://sepoliafaucet.com/)

### Installation

```bash
# Clone repository
git clone https://github.com/tuvalsss/hackathonVc.git
cd hackathonVc

# Install dependencies
npm install
cd frontend && npm install

# Configure environment
cp frontend/.env.local.example frontend/.env.local
```

### Run Locally

```bash
# Frontend only
cd frontend
npm run dev
# Visit http://localhost:3000

# Or use Docker
docker-compose up -d
# Visit http://localhost:3005
```

### Use Live Demo

Simply visit: http://157.180.26.112:3005

No setup required! Just connect MetaMask to Sepolia.

## Usage Guide

### For End Users

1. Visit: http://157.180.26.112:3005
2. Read the onboarding guide (visible on first load)
3. Choose Mode: Predefined Checks or Natural Language
4. Connect MetaMask (will prompt automatically)
5. Approve network switch to Sepolia (if needed)
6. Confirm transaction in MetaMask
7. Wait 30-60 seconds for Chainlink DON fulfillment
8. View verified results on-chain

### For Developers

See `docs/API_INTEGRATION.md` for complete integration guide.

Quick Example:
```javascript
const contract = new ethers.Contract(address, abi, signer);

// Trigger decision check
const tx = await contract.sendRequest();
await tx.wait();

// Wait for fulfillment (30-60 seconds)
await delay(60000);

// Read verified result
const state = await contract.getLatestState();
console.log('Decision Score:', state.aggregatedScore);
console.log('ETH Price:', state.priceETH / 100);
```

### For Smart Contracts

```solidity
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

contract MyProtocol {
    IAutoSentinel sentinel = IAutoSentinel(0xB1C85052CB557A20Cb036d8bA02cBC05A22e070f);
    
    function checkMarketSafety() external view returns (bool) {
        (, , , uint256 score, , , ,) = sentinel.getLatestState();
        return score < 80; // Safe if score below 80
    }
}
```

## Technology Stack

### Smart Contracts
- Solidity 0.8.28
- Hardhat Development environment
- Chainlink Functions Decentralized oracle network
- OpenZeppelin Security patterns

### Frontend
- Next.js 14.0.4 (React)
- TypeScript Type safety
- Tailwind CSS Styling
- ethers.js 6.9.0 Ethereum interactions

### AI Integration
- OpenAI GPT-3.5 (Primary NLP)
- Google AI Gemini Pro (Fallback 1)
- Anthropic Claude Haiku (Fallback 2)

### Infrastructure
- Docker Containerization
- Docker Compose Orchestration
- Node.js 18 Alpine

### Blockchain
- Ethereum Sepolia Testnet
- Chainlink Functions Subscription #6239
- Block Explorer Etherscan

## Project Structure

```
hackathonVc/
├── contracts/
│   ├── AutoSentinelFunctions.sol
│   └── interfaces/
│       └── IAutoSentinel.sol
├── chainlink-functions/
│   └── source.js
├── scripts/
│   ├── deploy-functions.ts
│   ├── configure-functions.ts
│   ├── add-consumer.ts
│   └── trigger-request.ts
├── frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── api/
│   │       ├── oracle-data/
│   │       │   └── route.ts
│   │       └── translate-query/
│   │           └── route.ts
│   ├── public/
│   ├── package.json
│   └── Dockerfile
├── docs/
│   ├── API_INTEGRATION.md
│   ├── ARCHITECTURE.md
│   ├── SUBMISSION.md
│   ├── DEMO_PLAN.md
│   └── CHAINLINK_FUNCTIONS.md
├── docker-compose.yml
├── hardhat.config.ts
├── package.json
└── README.md
```

## Real-World Use Cases

### 1. Trading Bot Risk Management
```javascript
// Bot checks market conditions every 5 minutes
setInterval(async () => {
    const state = await sentinel.getLatestState();
    
    if (state.aggregatedScore > 75) {
        // High risk - reduce exposure
        await closePositions(50);
    }
}, 5 * 60 * 1000);
```

### 2. DeFi Protocol Circuit Breaker
```solidity
contract LendingProtocol {
    function borrow(uint256 amount) external {
        // Check market conditions
        (, , , uint256 score, , , ,) = sentinel.getLatestState();
        require(score < 80, "Market too volatile");
        
        // Safe to proceed
        _executeBorrow(msg.sender, amount);
    }
}
```

### 3. DAO Governance with Context
```solidity
contract Treasury {
    function executeProposal(uint256 proposalId) external {
        // Check market conditions before releasing funds
        (, , , uint256 score, , , ,) = sentinel.getLatestState();
        
        if (score < 70) {
            // Safe market - execute normally
            _releaseFullAmount(proposalId);
        } else {
            // Risky market - release 50% now, 50% later
            _releasePartialAmount(proposalId, 50);
        }
    }
}
```

## Security & Trust

### Trustless Guarantees

- No Centralized Server: Computation runs on decentralized Chainlink network
- No Single Point of Failure: Multiple data sources aggregated
- No Arbitrary Execution: Natural language maps only to predefined checks
- On-Chain Verification: Every result has cryptographic proof
- Deterministic: Same inputs produce same outputs
- Transparent: Open-source code, verifiable on-chain

### Data Integrity

- Fetches from 3 independent sources (CoinGecko, CoinCap, Polymarket)
- Cross-validates crypto price data points
- Incorporates prediction market signals for broader market context
- Detects and flags discrepancies
- Stores verification proof on-chain

### Smart Contract Security

- Uses OpenZeppelin FunctionsClient
- Proper access control (only router can fulfill)
- Event emissions for transparency
- Tested extensively on testnet

## Performance

### Response Times
- Transaction confirmation: 5-10 seconds
- DON fulfillment: 30-90 seconds typical
- Total end-to-end: 45-120 seconds

### Costs (Sepolia Testnet)
- Gas per request: ~300,000 gas (~$0.50-$2 on mainnet)
- LINK per request: ~0.1-0.2 LINK
- Recommended frequency: Every 5-15 minutes

### Scalability
- Can handle concurrent requests
- Results cached on-chain
- Read operations are free (view functions)

## Troubleshooting

### Common Issues

**Request timeout / no fulfillment:**
Check LINK balance in subscription #6239
- Visit: https://functions.chain.link/sepolia/6239
- Add LINK if balance < 1 LINK
- Get free testnet LINK: https://faucets.chain.link/sepolia

**"Please switch to Sepolia testnet":**
System will prompt automatically. Just approve in MetaMask.

**"Insufficient balance" error:**
Get Sepolia ETH from faucet: https://sepoliafaucet.com/

**AI translation not working:**
System has 3 fallbacks + keyword matching. Should always work.

## Documentation

- API Integration: `docs/API_INTEGRATION.md` - Complete developer guide
- Architecture: `docs/ARCHITECTURE.md` - System design and flow
- Submission: `docs/SUBMISSION.md` - Hackathon submission details
- Demo Plan: `docs/DEMO_PLAN.md` - Step-by-step demo walkthrough
- Chainlink Functions: `docs/CHAINLINK_FUNCTIONS.md` - CRE implementation details
- Deployment: Live at http://157.180.26.112:3005 via Docker

## Important Links

| Resource | URL |
|----------|-----|
| Live Demo | http://157.180.26.112:3005 |
| Smart Contract | https://sepolia.etherscan.io/address/0xB1C85052CB557A20Cb036d8bA02cBC05A22e070f |
| GitHub Repository | https://github.com/tuvalsss/hackathonVc |
| Chainlink Subscription | https://functions.chain.link/sepolia/6239 |
| Sepolia Faucet (ETH) | https://sepoliafaucet.com/ |
| Chainlink Faucet (LINK) | https://faucets.chain.link/sepolia |

## Hackathon Submission

**Event:** Convergence: A Chainlink Hackathon  
**Date:** February 2026  
**Category:** Best Use of Chainlink Functions

### Why AutoSentinel Stands Out

**Meaningful CRE Usage:**
- Core functionality depends on Chainlink Functions
- Not just a wrapper - essential for trustless execution
- Demonstrates HTTP, Compute, and Chain Write capabilities

**Innovation:**
- AI-enhanced UX while maintaining deterministic execution
- Multiple interaction modes for different user types
- Novel approach: Market intelligence as a service

**Production Quality:**
- Fully deployed and accessible
- Comprehensive documentation
- Clean, professional code
- Real-world use cases

**Real Value:**
- Solves actual DeFi problems
- Bot and smart contract integration
- Trustless and verifiable
- Multi-source data aggregation

## Team

**QuanticaLab & Tuval Zvigerbi**

## License

MIT License

Copyright (c) 2026 QuanticaLab & Tuval Zvigerbi. All Rights Reserved.

## Acknowledgments

- Chainlink: For the powerful Functions platform
- OpenAI: For GPT-3.5 API
- Google: For Gemini Pro API
- Anthropic: For Claude API
- CoinGecko & CoinCap: For reliable market data APIs
- Polymarket: For prediction market data
- Ethereum Foundation: For the Sepolia testnet

## Get Started

Visit the live demo: **http://157.180.26.112:3005**

No setup required - just connect MetaMask and start exploring trustless market intelligence!

For developers: Check out `docs/API_INTEGRATION.md` to integrate AutoSentinel into your DeFi protocol, trading bot, or DAO.
