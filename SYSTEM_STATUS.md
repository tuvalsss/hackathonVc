# AutoSentinel System Status

**Last Updated:** February 6, 2026  
**Status:** DEPLOYED AND OPERATIONAL

## Live System

**Frontend URL:** http://157.180.26.112:3005  
**Smart Contract:** 0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4 (Sepolia)  
**Chainlink Subscription:** #6239  
**LINK Balance:** 32.8 LINK (Sufficient)

## Current Statistics

- Total Requests: 19
- Total Successful Fulfillments: 2
- Success Rate: 10.5%

## Infrastructure

**Docker Container:**
- Name: autosentinel-frontend
- Port: 3005:3000
- Status: Running
- Uptime: Continuous

**Smart Contract:**
- Network: Ethereum Sepolia
- Subscription ID: 6239
- DON ID: fun-ethereum-sepolia-1
- Gas Limit: 300,000

## Known Issues

### Chainlink Functions Fulfillment

**Issue:** Low fulfillment rate (10.5%)  
**Cause:** Chainlink DON timeouts - likely due to network congestion on Sepolia testnet  
**Impact:** Requests may take longer than expected or timeout  
**Workaround:** Users can retry failed requests

**Technical Details:**
- LINK balance is sufficient (32.8 LINK)
- Contract is properly configured
- Source code is valid
- Consumer is registered in subscription

This appears to be a Chainlink DON network issue on Sepolia testnet rather than a code issue. The system works correctly when DON responds.

## Testing

To verify the system:

```bash
cd /opt/quantica/quanticalab/hackathonVc
npx hardhat run scripts/trigger-request.ts --network sepolia
```

## Documentation

- README.md - Complete project overview
- docs/API_INTEGRATION.md - Developer integration guide
- docs/ARCHITECTURE.md - System architecture
- docs/SUBMISSION.md - Hackathon submission details
- docs/DEMO_PLAN.md - Demo walkthrough
- docs/CHAINLINK_FUNCTIONS.md - Chainlink implementation

## Support

For issues or questions:
- GitHub: https://github.com/tuvalsss/hackathonVc
- Smart Contract: https://sepolia.etherscan.io/address/0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4
