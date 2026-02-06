# AutoSentinel - Technical Architecture

## What This System Does (Plain English)

**AutoSentinel is an autonomous decision engine that:**
1. **Triggers on demand** - A user clicks "Trigger Workflow" to start the process
2. **Executes code off-chain** - JavaScript runs on Chainlink's decentralized nodes (DON), NOT on a centralized server
3. **Fetches real data** - The code pulls ETH/BTC prices from CoinGecko and CoinCap APIs
4. **Computes a decision** - Calculates a "decision score" based on price deviation and volatility
5. **Returns to blockchain** - The result is sent back to our smart contract via `fulfillRequest()` callback
6. **Stores verified state** - The contract stores prices, score, and reasoning permanently on-chain

**Why this matters:** The computation happens on decentralized Chainlink nodes, not our servers. This means no single party can manipulate the results. The data and decision are cryptographically verified before being stored on-chain.

## System Overview

AutoSentinel uses **Chainlink Functions** as the Chainlink Runtime Environment (CRE) to create a trustless bridge between off-chain data and on-chain state.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AUTOSENTINEL ARCHITECTURE                          │
│                      Powered by Chainlink Functions                          │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────┐
                              │   FRONTEND      │
                              │   (Next.js)     │
                              │                 │
                              │ • Trigger Button│
                              │ • Status Display│
                              │ • State View    │
                              └────────┬────────┘
                                       │ sendRequest()
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    AUTOSENTINEL SMART CONTRACT                                │
│                    (Sepolia Testnet)                                          │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  FunctionsClient                                                        │  │
│  │  ├── sendRequest() ─────────────────────────────────────────────────┐  │  │
│  │  │   • Creates FunctionsRequest                                     │  │  │
│  │  │   • Encodes JavaScript source                                    │  │  │
│  │  │   • Sends to Router                                              │  │  │
│  │  │                                                                   │  │  │
│  │  └── fulfillRequest() ◀─────────────────────────────────────────────┤  │  │
│  │      • Receives DON response                                        │  │  │
│  │      • Stores raw bytes (gas efficient)                             │  │  │
│  │      • Marks request fulfilled                                      │  │  │
│  │      • Emits Response event                                         │  │  │
│  └─────────────────────────────────────────────────────────────────────┘  │  │
└──────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    CHAINLINK FUNCTIONS ROUTER                                 │
│                    0xb83E47C2bC239B3bf370bc41e1459A34b41238D0                │
└──────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│               CHAINLINK DECENTRALIZED ORACLE NETWORK (DON)                    │
│               fun-ethereum-sepolia-1                                          │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                    JAVASCRIPT EXECUTION                                 │  │
│  │                                                                         │  │
│  │   ┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐     │  │
│  │   │   FETCH     │────▶│   COMPUTE   │────▶│   ENCODE            │     │  │
│  │   │   DATA      │     │   SCORE     │     │   RESPONSE          │     │  │
│  │   └─────────────┘     └─────────────┘     └─────────────────────┘     │  │
│  │         │                                                              │  │
│  │         ▼                                                              │  │
│  │  ┌──────────────┐                                                      │  │
│  │  │ • CoinGecko  │ Functions.makeHttpRequest()                          │  │
│  │  │ • CoinCap    │                                                      │  │
│  │  └──────────────┘                                                      │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Smart Contract (AutoSentinelFunctions.sol)

**Inherits from**: `FunctionsClient`, `ConfirmedOwner`

**Key Functions**:

```solidity
// Initiate Chainlink Functions request
function sendRequest() external returns (bytes32 requestId)

// Ultra-lightweight callback from DON (internal, called by router)
// Stores only raw bytes for gas efficiency
function fulfillRequest(bytes32 requestId, bytes memory response, bytes memory err) internal override

// View functions (gas-free, all parsing done here)
function getLatestState() external view returns (
    uint256 timestamp, uint256 priceETH, uint256 priceBTC,
    uint256 aggregatedScore, bool thresholdTriggered,
    string memory decisionReason, string memory dataSources, bytes32 requestId
)
function getRequestStatus(bytes32 requestId) external view returns (
    bool exists, bool fulfilled, bytes memory response, bytes memory err, uint256 timestamp
)
function getStatistics() external view returns (...)
```

**State Storage**:

```solidity
// Raw storage (written in fulfillRequest callback)
bytes32 public s_lastRequestId;
bytes public s_lastResponse;        // Raw DON response
bytes public s_lastError;           // Raw DON error
uint256 public s_lastTimestamp;
uint256 public totalRequests;
uint256 public totalFulfilled;

mapping(bytes32 => bool) s_requestExists;
mapping(bytes32 => bool) s_requestFulfilled;
```

All data parsing (prices, scores, reasons) is performed in view functions, making
callbacks extremely gas-efficient while providing full data access off-chain.

### 2. Chainlink Functions Source Code

**Location**: `chainlink-functions/source.js`

**Execution Flow**:
1. Parse threshold from args
2. Fetch CoinGecko API in parallel with CoinCap API
3. Aggregate prices from both sources
4. Calculate deviation between sources
5. Compute decision score
6. Return encoded JSON result

**APIs Used**:
- CoinGecko: `api.coingecko.com/api/v3/simple/price`
- CoinCap: `api.coincap.io/v2/assets`

### 3. Frontend (Next.js)

**Features**:
- Connect MetaMask wallet
- Trigger workflow button
- Real-time status tracking
- Transaction hash links
- Request ID display
- Data source indicators
- Auto-refresh state

## Data Flow

```
1. User clicks "Trigger Workflow"
           │
           ▼
2. Frontend calls contract.sendRequest()
           │
           ▼
3. Contract creates FunctionsRequest
   ├── Source code (JavaScript)
   ├── Arguments (threshold)
   └── Subscription ID
           │
           ▼
4. Request sent to Chainlink Router
           │
           ▼
5. Router distributes to DON nodes
           │
           ▼
6. Each node executes JavaScript:
   ├── Fetches CoinGecko
   ├── Fetches CoinCap
   ├── Computes score
   └── Returns result
           │
           ▼
7. DON reaches consensus
           │
           ▼
8. Router calls fulfillRequest()
           │
           ▼
9. Contract:
   ├── Marks requestId as fulfilled
   ├── Stores raw response bytes
   ├── Updates timestamp
   └── Emits Response event
           │
           ▼
10. Frontend polls and displays result
```

## Security Considerations

1. **Access Control**: Only owner can configure contract
2. **Request Validation**: Only router can call fulfillRequest
3. **Request Tracking**: Each request has unique ID
4. **Multi-Source**: Data from multiple APIs prevents manipulation

## Network Configuration

### Sepolia Testnet

| Component | Address/Value |
|-----------|---------------|
| Functions Router | `0xb83E47C2bC239B3bf370bc41e1459A34b41238D0` |
| DON ID | `fun-ethereum-sepolia-1` |
| Chain ID | 11155111 |
| LINK Token | `0x779877A7B0D9E8603169DdbD7836e478b4624789` |

## Gas Costs

| Operation | Estimated Gas |
|-----------|---------------|
| sendRequest | ~150,000 |
| fulfillRequest (callback) | ~200,000 |
| Total per workflow | ~350,000 |

Note: Actual costs depend on response size and computation.
