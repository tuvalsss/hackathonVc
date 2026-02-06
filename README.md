# 🤖 AutoSentinel Decision Engine

**Trustless Market Intelligence powered by Chainlink Functions with AI-Enhanced Interface**

[![Solidity](https://img.shields.io/badge/Solidity-0.8.28-blue)](https://soliditylang.org/)
[![Chainlink Functions](https://img.shields.io/badge/Chainlink-Functions-375BD2)](https://functions.chain.link/)
[![Network](https://img.shields.io/badge/Network-Sepolia-yellow)](https://sepolia.etherscan.io/)
[![AI](https://img.shields.io/badge/AI-OpenAI%20%7C%20Google%20%7C%20Anthropic-green)](https://openai.com)

**Live Demo:** [http://157.180.26.112:3005](http://157.180.26.112:3005)  
**Smart Contract:** [0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4](https://sepolia.etherscan.io/address/0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4)  
**GitHub:** [github.com/tuvalsss/hackathonVc](https://github.com/tuvalsss/hackathonVc)

---

## 🎯 Overview

AutoSentinel is a **deterministic decision engine** that provides trustless market intelligence through three powerful interaction modes:

1. **Predefined Decision Checks** - Common, high-value market analysis patterns
2. **API/Bot Interface** - Programmatic integration for external systems
3. **AI-Powered Natural Language** - Translate queries into safe, structured checks

### What Makes This Special

✅ **Meaningful Chainlink Functions Usage** - Core functionality requires CRE  
✅ **AI-Enhanced UX** - OpenAI/Google AI/Anthropic for natural language processing  
✅ **Trustless Execution** - No single server controls data or computation  
✅ **On-Chain Verification** - Every result has cryptographic proof  
✅ **Production-Ready** - Deployed, documented, and fully functional

---

## 🏗️ Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AUTOSENTINEL SYSTEM                          │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Frontend   │      │  Smart       │      │  Chainlink   │
│   (Next.js)  │◀────▶│  Contract    │◀────▶│  DON         │
│              │      │  (Solidity)  │      │  (CRE)       │
└──────────────┘      └──────────────┘      └──────────────┘
        │                                            │
        ▼                                            ▼
┌──────────────┐                           ┌─────────────────┐
│  AI Layer    │                           │  External APIs  │
│  OpenAI/     │                           │  - CoinGecko    │
│  Google/     │                           │  - CoinCap      │
│  Anthropic   │                           └─────────────────┘
└──────────────┘
```

### Chainlink Functions Workflow

```
User → Frontend → Smart Contract → Chainlink Functions (DON)
                                           │
                                    ┌──────┴──────┐
                                    │ Execute JS  │
                                    │ Fetch APIs  │
                                    │ Compute     │
                                    └──────┬──────┘
                                           │
Smart Contract ◀── fulfillRequest() ───────┘
     │
     └─→ On-Chain State Updated
     └─→ Events Emitted
     └─→ Frontend Displays Results
```

---

## ✨ Key Features

### 1. Multiple Interaction Modes

#### 🎯 Predefined Decision Checks (Primary)
- **Market Risk Score** - Evaluate volatility and cross-source deviation
- **Price Deviation Check** - Detect discrepancies between data sources
- **Volatility Alert** - Monitor rapid price changes
- **Multi-Source Confirmation** - Verify data consistency

**Use Cases:**
- Trading bots selecting risk assessment types
- DAOs choosing governance data sources
- DeFi protocols picking circuit breaker conditions
- Portfolio managers selecting rebalancing triggers

#### 🤖 API/Bot Interface (Developer-Focused)
```solidity
// Trigger request
function sendRequest() external returns (bytes32 requestId)

// Read verified result
function getLatestState() external view returns (
    uint256 timestamp,
    uint256 priceETH,
    uint256 priceBTC,
    uint256 aggregatedScore,  // 0-100
    bool thresholdTriggered,
    string decisionReason,
    string dataSources,
    bytes32 requestId
)
```

**Integration Examples:** See `docs/API_INTEGRATION.md`

#### 💬 AI-Powered Natural Language (Optional Helper)
- **OpenAI GPT-3.5** (Primary translator)
- **Google Gemini** (First fallback)
- **Anthropic Claude** (Second fallback)
- **Keyword Matching** (Final fallback)

**Example:**
```
User: "Is it safe to trade ETH right now?"
AI: Translates to → Market Risk Score check
System: Executes via Chainlink Functions
Result: On-chain verified decision
```

**Important:** AI only translates text → parameters. The engine remains deterministic.

### 2. Chainlink Functions Integration

**What It Does:**
- Fetches real-time cryptocurrency prices from CoinGecko and CoinCap
- Computes decision scores based on deviation and volatility
- Executes trustlessly on decentralized oracle network
- Returns verified results to smart contract

**Source Code Location:** `chainlink-functions/source.js`

**Key Capabilities Demonstrated:**
- ✅ HTTP Requests (CoinGecko + CoinCap APIs)
- ✅ Compute (JavaScript execution off-chain)
- ✅ Chain Write (Updates on-chain state via callback)
- ✅ Multi-Source Aggregation
- ✅ Error Handling and Fallbacks

### 3. AI Translation Layer

**How It Works:**
1. User enters natural language query
2. Frontend calls `/api/translate-query` endpoint
3. Server tries AI providers in order:
   - OpenAI GPT-3.5 → Google Gemini → Anthropic Claude → Keywords
4. AI returns predefined check ID
5. System executes that check via Chainlink Functions

**Why This Matters:**
- Makes trustless execution accessible to non-technical users
- Maintains deterministic behavior (AI only translates, doesn't execute)
- Provides graceful fallbacks if AI services fail
- Clear UX showing which AI processed the query

### 4. Real-Time Data Aggregation

**Data Sources:**
- CoinGecko API (`/simple/price` endpoint)
- CoinCap API (`/v2/assets` endpoint)

**Aggregation Logic:**
- Cross-validates prices between sources
- Calculates deviation percentage
- Detects anomalies and discrepancies
- Provides consensus-based results

### 5. On-Chain Verification

Every execution produces:
- Unique `requestId` from Chainlink Functions
- Transaction hash on Sepolia testnet
- Timestamp of execution
- Verifiable result data
- Event logs for transparency

**View on Etherscan:**
```
https://sepolia.etherscan.io/address/0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MetaMask browser extension
- Sepolia testnet ETH ([Get from faucet](https://sepoliafaucet.com/))

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
# Edit frontend/.env.local with your settings (optional)
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

Simply visit: [http://157.180.26.112:3005](http://157.180.26.112:3005)

**No setup required!** Just connect MetaMask to Sepolia.

---

## 📖 Usage Guide

### For End Users

1. **Visit:** [http://157.180.26.112:3005](http://157.180.26.112:3005)
2. **Read** the onboarding guide (visible on first load)
3. **Choose Mode:**
   - Predefined Checks: Click a check type
   - Natural Language: Write a query
4. **Connect MetaMask** (will prompt automatically)
5. **Approve** network switch to Sepolia (if needed)
6. **Confirm** transaction in MetaMask
7. **Wait** 30-60 seconds for Chainlink DON fulfillment
8. **View** verified results on-chain

### For Developers

See `docs/API_INTEGRATION.md` for complete integration guide.

**Quick Example:**
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
    IAutoSentinel sentinel = IAutoSentinel(0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4);
    
    function checkMarketSafety() external view returns (bool) {
        (, , , uint256 score, , , ,) = sentinel.getLatestState();
        return score < 80; // Safe if score below 80
    }
}
```

---

## 🛠️ Technology Stack

### Smart Contracts
- **Solidity** 0.8.28
- **Hardhat** Development environment
- **Chainlink Functions** Decentralized oracle network
- **OpenZeppelin** Security patterns

### Frontend
- **Next.js** 14.0.4 (React)
- **TypeScript** Type safety
- **Tailwind CSS** Styling
- **ethers.js** 6.9.0 Ethereum interactions

### AI Integration
- **OpenAI** GPT-3.5 (Primary NLP)
- **Google AI** Gemini Pro (Fallback 1)
- **Anthropic** Claude Haiku (Fallback 2)

### Infrastructure
- **Docker** Containerization
- **Docker Compose** Orchestration
- **Node.js** 18 Alpine

### Blockchain
- **Ethereum Sepolia** Testnet
- **Chainlink Functions** Subscription #6239
- **Block Explorer** Etherscan

---

## 📁 Project Structure

```
hackathonVc/
├── contracts/
│   ├── AutoSentinelFunctions.sol    # Main smart contract
│   └── interfaces/
│       └── IAutoSentinel.sol
├── chainlink-functions/
│   └── source.js                     # JavaScript for DON execution
├── scripts/
│   ├── deploy-functions.ts           # Deploy contract
│   ├── configure-functions.ts        # Configure DON settings
│   ├── add-consumer.ts               # Add to subscription
│   └── trigger-request.ts            # Test request
├── frontend/
│   ├── app/
│   │   ├── page.tsx                  # Main UI
│   │   ├── layout.tsx                # Layout
│   │   ├── globals.css               # Styles
│   │   └── api/
│   │       └── translate-query/      # AI translation endpoint
│   │           └── route.ts
│   ├── public/
│   ├── package.json
│   └── Dockerfile
├── docs/
│   ├── API_INTEGRATION.md            # Developer guide
│   ├── ARCHITECTURE.md               # System architecture
│   ├── SUBMISSION.md                 # Hackathon submission
│   ├── DEMO_PLAN.md                  # Demo walkthrough
│   └── CHAINLINK_FUNCTIONS.md        # CRE details
├── docker-compose.yml
├── hardhat.config.ts
├── package.json
└── README.md
```

---

## 🎓 How It Works

### 1. User Interaction

**Predefined Check:**
```
User clicks: "Market Risk Score"
  ↓
Frontend calls: triggerWorkflow()
  ↓
MetaMask prompts: Connect + Switch to Sepolia
  ↓
User approves transaction
  ↓
Transaction sent to smart contract
```

**Natural Language:**
```
User types: "Is ETH volatile right now?"
  ↓
Frontend calls: /api/translate-query
  ↓
OpenAI responds: "volatility_alert"
  ↓
Frontend calls: triggerWorkflow("volatility_alert")
  ↓
(Same flow as predefined)
```

### 2. Smart Contract Execution

```solidity
function sendRequest() external returns (bytes32) {
    // Generate request
    bytes32 requestId = _sendRequest(
        subscriptionId,
        gasLimit,
        donId,
        source  // JavaScript code for DON
    );
    
    // Store request
    requests[requestId] = RequestStatus({
        exists: true,
        fulfilled: false,
        response: "",
        err: "",
        timestamp: block.timestamp,
        requester: msg.sender
    });
    
    // Emit event
    emit RequestSent(requestId, msg.sender, block.timestamp);
    
    return requestId;
}
```

### 3. Chainlink DON Execution

The DON executes `chainlink-functions/source.js`:

```javascript
// Fetch from CoinGecko
const geckoResponse = await Functions.makeHttpRequest({
    url: "https://api.coingecko.com/api/v3/simple/price",
    params: { ids: "ethereum,bitcoin", vs_currencies: "usd" }
});

// Fetch from CoinCap
const capResponse = await Functions.makeHttpRequest({
    url: "https://api.coincap.io/v2/assets",
    params: { ids: "ethereum,bitcoin" }
});

// Aggregate and compute score
const avgEthPrice = (geckoETH + capETH) / 2;
const deviation = Math.abs(geckoETH - capETH) / geckoETH * 100;
const score = calculateDecisionScore(deviation, volatility);

// Return result
return Functions.encodeString(JSON.stringify({
    priceETH: Math.round(avgEthPrice * 100),
    priceBTC: Math.round(avgBtcPrice * 100),
    score: score,
    triggered: score >= threshold,
    reason: "Multi-source verified; Normal volatility",
    sources: "CoinGecko,CoinCap"
}));
```

### 4. On-Chain Fulfillment

```solidity
function fulfillRequest(
    bytes32 requestId,
    bytes memory response,
    bytes memory err
) internal override {
    // Mark as fulfilled
    requests[requestId].fulfilled = true;
    requests[requestId].response = response;
    requests[requestId].err = err;
    
    // Parse response and update state
    _processResponse(requestId, response);
    
    // Emit event
    emit RequestFulfilled(requestId, response, err, block.timestamp);
}
```

### 5. Frontend Display

```typescript
// Poll for fulfillment
const checkStatus = async (requestId: string) => {
    const status = await contract.getRequestStatus(requestId);
    
    if (status.fulfilled) {
        // Fetch latest state
        const state = await contract.getLatestState();
        
        // Display results
        setEthPrice(state.priceETH / 100);
        setBtcPrice(state.priceBTC / 100);
        setScore(state.aggregatedScore);
        setReason(state.decisionReason);
    }
};
```

---

## 🎯 Real-World Use Cases

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

### 4. Portfolio Rebalancing
```javascript
// Rebalance when market is stable
const state = await sentinel.getLatestState();

if (state.aggregatedScore < 60 && !state.thresholdTriggered) {
    // Low volatility - good time to rebalance
    await rebalancePortfolio();
}
```

---

## 🔐 Security & Trust

### Trustless Guarantees

- **❌ No Centralized Server** - Computation runs on decentralized Chainlink network
- **❌ No Single Point of Failure** - Multiple data sources aggregated
- **❌ No Arbitrary Execution** - Natural language maps only to predefined checks
- **✅ On-Chain Verification** - Every result has cryptographic proof
- **✅ Deterministic** - Same inputs produce same outputs
- **✅ Transparent** - Open-source code, verifiable on-chain

### Data Integrity

- Fetches from 2+ independent sources
- Cross-validates all data points
- Detects and flags discrepancies
- Stores verification proof on-chain

### Smart Contract Security

- Uses OpenZeppelin FunctionsClient
- Proper access control (only router can fulfill)
- Event emissions for transparency
- Tested extensively on testnet

---

## 📊 Performance

### Response Times
- Transaction confirmation: ~5-10 seconds
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

---

## 🐛 Troubleshooting

### Common Issues

**Issue:** Request timeout / no fulfillment
**Solution:** Check LINK balance in subscription #6239
- Visit: https://functions.chain.link/sepolia/6239
- Add LINK if balance < 1 LINK
- Get free testnet LINK: https://faucets.chain.link/sepolia

**Issue:** "Please switch to Sepolia testnet"
**Solution:** System will prompt automatically. Just approve in MetaMask.

**Issue:** "Insufficient balance" error
**Solution:** Get Sepolia ETH from faucet: https://sepoliafaucet.com/

**Issue:** AI translation not working
**Solution:** System has 3 fallbacks + keyword matching. Should always work.

### Debugging

```bash
# Check contract configuration
npx hardhat run scripts/verify-config.ts --network sepolia

# Check latest request status
npx hardhat run scripts/check-latest-request.ts --network sepolia

# Check subscription balance
npx hardhat run scripts/check-subscription.ts --network sepolia
```

---

## 📚 Documentation

- **API Integration:** `docs/API_INTEGRATION.md` - Complete developer guide
- **Architecture:** `docs/ARCHITECTURE.md` - System design and flow
- **Submission:** `docs/SUBMISSION.md` - Hackathon submission details
- **Demo Plan:** `docs/DEMO_PLAN.md` - Step-by-step demo walkthrough
- **Chainlink Functions:** `docs/CHAINLINK_FUNCTIONS.md` - CRE implementation details
- **Deployment:** `PRODUCTION_DEPLOYMENT.md` - Live deployment info
- **Troubleshooting:** `URGENT_FIX_LINK_BALANCE.md` - LINK balance guide

---

## 🔗 Important Links

| Resource | URL |
|----------|-----|
| **Live Demo** | http://157.180.26.112:3005 |
| **Smart Contract** | https://sepolia.etherscan.io/address/0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4 |
| **GitHub Repository** | https://github.com/tuvalsss/hackathonVc |
| **Chainlink Subscription** | https://functions.chain.link/sepolia/6239 |
| **Sepolia Faucet (ETH)** | https://sepoliafaucet.com/ |
| **Chainlink Faucet (LINK)** | https://faucets.chain.link/sepolia |

---

## 🏆 Hackathon Submission

**Event:** Convergence: A Chainlink Hackathon  
**Date:** February 2026  
**Category:** Best Use of Chainlink Functions

### Why AutoSentinel Wins

1. **Meaningful CRE Usage** ⭐⭐⭐⭐⭐
   - Core functionality depends on Chainlink Functions
   - Not just a wrapper - essential for trustless execution
   - Demonstrates HTTP, Compute, and Chain Write capabilities

2. **Innovation** ⭐⭐⭐⭐⭐
   - AI-enhanced UX while maintaining deterministic execution
   - Multiple interaction modes for different user types
   - Novel approach: Market intelligence as a service

3. **Production Quality** ⭐⭐⭐⭐⭐
   - Fully deployed and accessible
   - Comprehensive documentation
   - Clean, professional code
   - Real-world use cases

4. **Real Value** ⭐⭐⭐⭐⭐
   - Solves actual DeFi problems
   - Bot and smart contract integration
   - Trustless and verifiable
   - Multi-source data aggregation

---

## 👥 Team

**QuanticaLab** & **Tuval Zvigerbi**

---

## 📄 License

MIT License

Copyright © 2026 QuanticaLab & Tuval Zvigerbi. All Rights Reserved.

---

## 🙏 Acknowledgments

- **Chainlink** - For the powerful Functions platform
- **OpenAI** - For GPT-3.5 API
- **Google** - For Gemini Pro API
- **Anthropic** - For Claude API
- **CoinGecko** & **CoinCap** - For reliable market data APIs
- **Ethereum Foundation** - For the Sepolia testnet

---

## 🚀 Get Started Now!

Visit the live demo: **[http://157.180.26.112:3005](http://157.180.26.112:3005)**

No setup required - just connect MetaMask and start exploring trustless market intelligence!

For developers: Check out `docs/API_INTEGRATION.md` to integrate AutoSentinel into your DeFi protocol, trading bot, or DAO.

**Let's build the future of trustless decision-making together!** 🌐✨
