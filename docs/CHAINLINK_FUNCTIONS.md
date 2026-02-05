# Chainlink Functions Integration

## Overview

AutoSentinel uses **Chainlink Functions** as the Chainlink Runtime Environment (CRE) to perform off-chain computation with on-chain verified results.

## Architecture

### Request Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    CHAINLINK FUNCTIONS REQUEST FLOW                       │
└──────────────────────────────────────────────────────────────────────────┘

1. USER INITIATES
   └─▶ Calls sendRequest() on AutoSentinelFunctions contract
   └─▶ Contract creates FunctionsRequest with source code
   └─▶ Request sent to Chainlink Functions Router

2. DON PROCESSING
   └─▶ Router forwards request to Decentralized Oracle Network
   └─▶ Multiple Chainlink nodes execute JavaScript source code
   └─▶ Nodes fetch data from CoinGecko and CoinCap APIs
   └─▶ Nodes compute decision score off-chain
   └─▶ Consensus reached on result

3. FULFILLMENT
   └─▶ DON calls fulfillRequest() on contract
   └─▶ Contract validates requestId
   └─▶ Response decoded and stored in state
   └─▶ Events emitted for transparency

4. ON-CHAIN STATE
   └─▶ SentinelState struct updated
   └─▶ RequestId linked to state
   └─▶ Statistics incremented
```

## Contract Implementation

### Inheritance

```solidity
contract AutoSentinelFunctions is FunctionsClient, ConfirmedOwner {
    using FunctionsRequest for FunctionsRequest.Request;
    
    // ...
}
```

### Request Function

```solidity
function sendRequest() external returns (bytes32 requestId) {
    // Create request with inline JavaScript
    FunctionsRequest.Request memory req;
    req.initializeRequestForInlineJavaScript(sourceCode);
    
    // Add threshold as argument
    string[] memory args = new string[](1);
    args[0] = _uint2str(threshold);
    req.setArgs(args);
    
    // Send to DON
    requestId = _sendRequest(
        req.encodeCBOR(),
        subscriptionId,
        gasLimit,
        donId
    );
    
    // Track request
    requests[requestId] = RequestStatus({...});
    emit RequestSent(requestId, msg.sender, block.timestamp);
}
```

### Fulfillment Callback

```solidity
function fulfillRequest(
    bytes32 requestId,
    bytes memory response,
    bytes memory err
) internal override {
    // Validate request exists
    if (!requests[requestId].exists) {
        revert UnexpectedRequestID(requestId);
    }
    
    // Update request status
    requests[requestId].fulfilled = true;
    requests[requestId].response = response;
    
    emit RequestFulfilled(requestId, response, err, block.timestamp);
    
    // Process response if no error
    if (err.length == 0 && response.length > 0) {
        _processResponse(requestId, response);
    }
}
```

## JavaScript Source Code

### Full Version (source.js)

```javascript
// Arguments from smart contract
const threshold = parseInt(args[0]) || 75;

// Parallel API calls
const [geckoRes, capRes] = await Promise.all([
  Functions.makeHttpRequest({
    url: "https://api.coingecko.com/api/v3/simple/price",
    params: { ids: "ethereum,bitcoin", vs_currencies: "usd" }
  }),
  Functions.makeHttpRequest({
    url: "https://api.coincap.io/v2/assets",
    params: { ids: "ethereum,bitcoin" }
  })
]);

// Process responses and aggregate data
// ... (see chainlink-functions/source.js for full code)

// Return encoded result
return Functions.encodeString(JSON.stringify({
  priceETH: Math.round(avgEth * 1e8),
  priceBTC: Math.round(avgBtc * 1e8),
  score,
  triggered,
  reason,
  sources: sources.join(",")
}));
```

### Key Features

1. **Multi-Source Fetching**: CoinGecko + CoinCap for redundancy
2. **Graceful Degradation**: Works if one source fails
3. **Off-Chain Computation**: Score calculation happens on DON
4. **Threshold Logic**: Configurable via contract argument

## Configuration

### Sepolia Testnet

| Parameter | Value |
|-----------|-------|
| Router Address | `0xb83E47C2bC239B3bf370bc41e1459A34b41238D0` |
| DON ID | `fun-ethereum-sepolia-1` |
| DON ID (bytes32) | `0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000` |
| Gas Limit | 300,000 |

### Subscription Setup

1. Visit [functions.chain.link](https://functions.chain.link/)
2. Connect MetaMask to Sepolia
3. Create new subscription
4. Fund with LINK tokens (get from [faucet](https://faucets.chain.link/sepolia))
5. Add contract address as consumer

## Events

### RequestSent
Emitted when a new request is initiated:
```solidity
event RequestSent(
    bytes32 indexed requestId,
    address indexed requester,
    uint256 timestamp
);
```

### RequestFulfilled
Emitted when DON returns result:
```solidity
event RequestFulfilled(
    bytes32 indexed requestId,
    bytes response,
    bytes err,
    uint256 timestamp
);
```

### StateUpdated
Emitted when contract state is updated:
```solidity
event StateUpdated(
    bytes32 indexed requestId,
    uint256 timestamp,
    uint256 priceETH,
    uint256 priceBTC,
    uint256 aggregatedScore,
    bool thresholdTriggered,
    string dataSources
);
```

## Testing

### Local Testing

```bash
# Run contract tests
npm test

# Deploy to local Hardhat node
npm run node
npm run deploy:local
```

### Testnet Testing

```bash
# Deploy to Sepolia
npm run deploy:sepolia

# Configure subscription
npm run configure

# Trigger request
npm run trigger
```

## Troubleshooting

### Common Issues

1. **"Subscription ID not set"**
   - Run `npm run configure` with FUNCTIONS_SUBSCRIPTION_ID in .env

2. **"Insufficient LINK"**
   - Fund subscription at functions.chain.link

3. **"Consumer not added"**
   - Add contract address as consumer in subscription

4. **Request times out**
   - Normal fulfillment takes 1-3 minutes
   - Check subscription has sufficient LINK

## Resources

- [Chainlink Functions Docs](https://docs.chain.link/chainlink-functions)
- [Functions Playground](https://functions.chain.link/playground)
- [Sepolia Explorer](https://sepolia.etherscan.io)
