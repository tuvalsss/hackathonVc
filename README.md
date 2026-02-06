# AutoSentinel

**Autonomous Market Intelligence Engine powered by Chainlink Functions**

[![Solidity](https://img.shields.io/badge/Solidity-0.8.19-blue)](https://soliditylang.org/)
[![Chainlink Functions](https://img.shields.io/badge/Chainlink-Functions-375BD2)](https://functions.chain.link/)
[![Network](https://img.shields.io/badge/Network-Sepolia-yellow)](https://sepolia.etherscan.io/)

---

## Overview

AutoSentinel demonstrates **meaningful use of the Chainlink Runtime Environment (CRE)** through Chainlink Functions. It creates a trustless autonomous decision engine that bridges off-chain market intelligence with verifiable on-chain execution.

### Key Features

- **Chainlink Functions Integration**: Uses official Chainlink DON for off-chain computation
- **Multi-Source Data Aggregation**: Fetches from CoinGecko and CoinCap APIs
- **Verifiable Execution**: All decisions are recorded on-chain with request IDs
- **Request/Fulfillment Pattern**: Proper async workflow with status tracking
- **Interactive Frontend**: Trigger workflows directly from the UI

---

## How Chainlink Functions (CRE) Is Used

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CHAINLINK FUNCTIONS WORKFLOW                             │
└─────────────────────────────────────────────────────────────────────────────┘

  User                    Smart Contract              Chainlink DON
   │                           │                           │
   │  1. triggerWorkflow()     │                           │
   │─────────────────────────▶ │                           │
   │                           │                           │
   │                           │  2. sendRequest()         │
   │                           │ ────────────────────────▶ │
   │                           │                           │
   │                           │      3. Execute JS        │
   │                           │      - Fetch CoinGecko    │
   │                           │      - Fetch CoinCap      │
   │                           │      - Compute Score      │
   │                           │                           │
   │                           │  4. fulfillRequest()      │
   │                           │ ◀──────────────────────── │
   │                           │                           │
   │                           │  5. Store Result On-Chain │
   │                           │  6. Emit Events           │
   │                           │                           │
   │  7. View Updated State    │                           │
   │◀───────────────────────── │                           │
```

### CRE Capabilities Demonstrated

1. **HTTP Fetch**: JavaScript code fetches data from external APIs
2. **Off-Chain Compute**: Decision logic runs on Chainlink nodes
3. **On-Chain Callback**: Results are delivered via fulfillRequest()
4. **Verified Execution**: Each request has a unique ID for tracking

---

## Deployed Contract

| Network | Contract Address | Explorer |
|---------|-----------------|----------|
| Sepolia | `0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4` | [View on Etherscan](https://sepolia.etherscan.io/address/0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4) |

### Chainlink Functions Configuration

| Parameter | Value |
|-----------|-------|
| Subscription ID | 6239 |
| DON ID | `fun-ethereum-sepolia-1` |
| Router | `0xb83E47C2bC239B3bf370bc41e1459A34b41238D0` |

---

## Quick Start

### Prerequisites

- Node.js 18+
- MetaMask wallet with Sepolia ETH
- Chainlink Functions subscription (funded with LINK)

### 1. Clone and Install

```bash
git clone https://github.com/tuvalsss/hackathonVc.git
cd hackathonVc
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
PRIVATE_KEY=your_wallet_private_key
INFURA_KEY=your_infura_api_key
ETHERSCAN_API_KEY=your_etherscan_key
FUNCTIONS_SUBSCRIPTION_ID=your_subscription_id
```

### 3. Deploy Contract

```bash
npm run deploy:sepolia
```

### 4. Create Chainlink Functions Subscription

1. Go to [functions.chain.link](https://functions.chain.link/)
2. Connect wallet to Sepolia
3. Create a new subscription
4. Fund with LINK tokens
5. Add your contract as a consumer

### 5. Configure Contract

```bash
npm run configure
```

### 6. Trigger a Request

```bash
npm run trigger
```

### 7. Run Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# .env.example already has the deployed contract address
npm run dev
```

Open http://localhost:3000

---

## Project Structure

```
hackathonVc/
├── contracts/
│   └── AutoSentinelFunctions.sol   # Main contract with Chainlink Functions
├── chainlink-functions/
│   ├── source.js                   # Full source code (documented)
│   └── source-inline.js            # Minified for on-chain storage
├── scripts/
│   ├── deploy-functions.ts         # Deploy contract
│   ├── configure-functions.ts      # Set subscription & DON ID
│   └── trigger-request.ts          # Trigger and monitor request
├── frontend/
│   └── app/page.tsx               # React dashboard with trigger button
├── docs/
│   ├── ARCHITECTURE.md            # Technical architecture
│   └── CHAINLINK_FUNCTIONS.md     # CRE integration details
└── README.md
```

---

## Smart Contract

### AutoSentinelFunctions.sol

Inherits from `FunctionsClient` for proper Chainlink Functions integration:

```solidity
contract AutoSentinelFunctions is FunctionsClient, ConfirmedOwner {
    
    // Send request to Chainlink DON
    function sendRequest() external returns (bytes32 requestId);
    
    // Callback from DON with result
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override;
    
    // View current state
    function getLatestState() external view returns (SentinelState memory);
    
    // View request status
    function getRequestStatus(bytes32 requestId) external view returns (RequestStatus memory);
}
```

### Events

```solidity
event RequestSent(bytes32 indexed requestId, address indexed requester, uint256 timestamp);
event RequestFulfilled(bytes32 indexed requestId, bytes response, bytes err, uint256 timestamp);
event StateUpdated(bytes32 indexed requestId, uint256 timestamp, ...);
event ThresholdTriggered(bytes32 indexed requestId, uint256 timestamp, string reason, uint256 score);
```

---

## Chainlink Functions Source Code

The JavaScript runs on the Chainlink DON:

```javascript
// Fetch from multiple sources
const [geckoRes, capRes] = await Promise.all([
  Functions.makeHttpRequest({ url: "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin&vs_currencies=usd" }),
  Functions.makeHttpRequest({ url: "https://api.coincap.io/v2/assets?ids=ethereum,bitcoin" })
]);

// Aggregate data
const avgEth = (ethGecko + ethCap) / 2;
const avgBtc = (btcGecko + btcCap) / 2;

// Calculate decision score
let score = 50;
if (ethDeviation > 1) score += 20;
if (sources.length >= 2) score += 15;

// Return encoded result
return Functions.encodeString(JSON.stringify({
  priceETH, priceBTC, score, triggered, reason, sources
}));
```

---

## Frontend Features

- **Trigger Workflow Button**: Send Chainlink Functions request from UI
- **Status Tracking**: Shows requested → pending → fulfilled
- **Transaction Links**: Direct links to Etherscan
- **Request ID Display**: Track specific requests
- **Data Source Indicators**: Shows which APIs provided data
- **Auto-Refresh**: Polls for updated state

---

## Example Transaction

| Field | Value |
|-------|-------|
| Request ID | `0x1234...abcd` |
| ETH Price | $2,450.32 |
| BTC Price | $43,210.00 |
| Score | 85/100 |
| Triggered | Yes |
| Sources | CoinGecko, CoinCap |

---

## Network Configuration

### Sepolia Testnet

| Parameter | Value |
|-----------|-------|
| Chain ID | 11155111 |
| Functions Router | `0xb83E47C2bC239B3bf370bc41e1459A34b41238D0` |
| DON ID | `fun-ethereum-sepolia-1` |
| LINK Token | `0x779877A7B0D9E8603169DdbD7836e478b4624789` |

---

## Hackathon Compliance

This project meets **Convergence: A Chainlink Hackathon** requirements:

- [x] **Meaningful use of Chainlink Runtime Environment (CRE)**
- [x] **On-chain state change triggered by CRE workflow**
- [x] **Uses official Chainlink Functions infrastructure**
- [x] **Request/fulfillment pattern with tracking**
- [x] **Working demo on Sepolia testnet**
- [x] **Interactive frontend for demonstration**

---

## License

MIT License

---

## Links

- [GitHub Repository](https://github.com/tuvalsss/hackathonVc)
- [Chainlink Functions Docs](https://docs.chain.link/chainlink-functions)
- [Sepolia Faucet](https://sepoliafaucet.com)
- [LINK Faucet](https://faucets.chain.link/sepolia)
