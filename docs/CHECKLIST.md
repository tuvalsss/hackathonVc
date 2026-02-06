# AutoSentinel - Test & Submission Checklists

## Feature Test Checklist

### Smart Contract Tests

| Test | Status | Notes |
|------|--------|-------|
| Contract deploys successfully | [x] | 0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4 |
| Owner is set correctly | [x] | ConfirmedOwner pattern |
| FunctionsClient inheritance works | [x] | Inherits from @chainlink/contracts |
| sendRequest() creates request | [x] | Returns requestId |
| fulfillRequest() processes response | [x] | Updates currentState |
| State history is recorded | [x] | stateHistory array |
| Statistics are updated correctly | [x] | totalUpdates, totalRequests |
| Events are emitted properly | [x] | RequestSent, RequestFulfilled, StateUpdated |
| Threshold update works | [x] | setThreshold() onlyOwner |
| Source code update works | [x] | setSourceCode() onlyOwner |
| Config update works | [x] | setConfig() for DON ID, subscription |

### Chainlink Functions Tests

| Test | Status | Notes |
|------|--------|-------|
| sendRequest() creates valid request | [x] | Verified on Sepolia |
| DON receives and processes request | [x] | Multiple successful responses |
| fulfillRequest() callback works | [x] | Response stored on-chain |
| Request tracking (requestId) works | [x] | RequestStatus struct updated |
| Error handling for DON errors | [x] | err bytes stored in RequestStatus |
| Source code can be updated by owner | [x] | setSourceCode() tested |
| Subscription ID configured correctly | [x] | Subscription 6239 active |
| Gas limit is sufficient | [x] | 300,000 gas configured |

### Frontend Tests

| Test | Status | Notes |
|------|--------|-------|
| Connects to contract on Sepolia | [ ] | |
| Displays current state | [ ] | |
| Displays statistics | [ ] | |
| Displays history | [ ] | |
| Auto-refresh works | [ ] | |
| Manual refresh works | [ ] | |
| Explorer link works | [ ] | |
| Responsive on mobile | [ ] | |
| Error states display correctly | [ ] | |
| Loading states work | [ ] | |

### Integration Tests

| Test | Status | Notes |
|------|--------|-------|
| End-to-end: sendRequest → DON → fulfillRequest | [x] | Multiple successful runs |
| Contract state updated from DON response | [x] | Verified via getLatestState() |
| Frontend reads contract state | [x] | Displays prices, score, status |
| Frontend triggers sendRequest() | [x] | MetaMask integration works |
| Request status tracking works | [x] | Polls getRequestStatus() |

---

## Deployment Checklist

### Pre-Deployment

| Task | Status | Notes |
|------|--------|-------|
| All tests passing | [ ] | |
| .env configured | [ ] | |
| Wallet funded with Sepolia ETH | [ ] | |
| Private key secured | [ ] | |
| Infura/Alchemy key valid | [ ] | |
| Etherscan API key valid | [ ] | |

### Contract Deployment

| Task | Status | Notes |
|------|--------|-------|
| `npm install` completed | [x] | All dependencies installed |
| `npx hardhat compile` succeeds | [x] | AutoSentinelFunctions compiled |
| Deploy to Sepolia successful | [x] | TX confirmed |
| Contract address recorded | [x] | 0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4 |
| Contract verified on Etherscan | [ ] | Optional - can verify with hardhat verify |
| Owner functions tested | [x] | setConfig, setSourceCode, setThreshold |

### Chainlink Functions Setup

| Task | Status | Notes |
|------|--------|-------|
| Subscription created on functions.chain.link | [x] | ID: 6239 |
| Subscription funded with LINK | [x] | 20 LINK balance |
| Contract added as consumer | [x] | TX: 0xde1e508bf99080842895edbfb9c3c8a8a17cec2b5dbb31fa825fa71ec8f8b263 |
| DON ID configured on contract | [x] | fun-ethereum-sepolia-1 |
| Source code set on contract | [x] | Dynamic or static source |
| Test request sent and fulfilled | [x] | Multiple successful responses |

### Frontend Deployment

| Task | Status | Notes |
|------|--------|-------|
| `cd frontend && npm install` | [ ] | |
| `.env.local` configured | [ ] | |
| `npm run build` succeeds | [ ] | |
| Local dev works (`npm run dev`) | [ ] | |
| Vercel deployment (optional) | [ ] | |

---

## Final Submission Readiness Checklist

### Code Quality

| Item | Status | Notes |
|------|--------|-------|
| Code is well-commented | [ ] | |
| README is comprehensive | [ ] | |
| No hardcoded secrets | [ ] | |
| .gitignore includes sensitive files | [ ] | |
| All dependencies listed | [ ] | |
| License file included | [ ] | |

### Repository Structure

| Item | Status | Notes |
|------|--------|-------|
| Clean folder structure | [ ] | |
| BRAINSTORMING.md present | [ ] | |
| docs/ARCHITECTURE.md present | [ ] | |
| docs/DEMO_PLAN.md present | [ ] | |
| docs/SUBMISSION.md present | [ ] | |
| README.md complete | [ ] | |
| .env.example files present | [ ] | |

### Demo Video

| Item | Status | Notes |
|------|--------|-------|
| Under 5 minutes | [ ] | |
| Shows architecture | [ ] | |
| Shows CRE workflow running | [ ] | |
| Shows on-chain transaction | [ ] | |
| Shows Etherscan confirmation | [ ] | |
| Audio is clear | [ ] | |
| Video quality is good | [ ] | |
| Uploaded to YouTube | [ ] | |

### Submission Form

| Item | Status | Notes |
|------|--------|-------|
| Project name entered | [ ] | |
| Description (~250 words) | [ ] | |
| GitHub link added | [ ] | |
| Demo video link added | [ ] | |
| Contract address added | [ ] | |
| Team members listed | [ ] | |
| Track selected (CRE) | [ ] | |
| All required fields filled | [ ] | |

---

## Emergency Fixes

### If API Calls Fail
1. Check API rate limits
2. Enable mock data mode: `USE_MOCK=true npm run workflow:run`
3. Verify network connectivity

### If Transaction Fails
1. Check wallet balance
2. Verify contract address
3. Check gas settings
4. Verify authorized caller

### If Frontend Won't Connect
1. Verify RPC URL in `.env.local`
2. Check contract address
3. Verify network (Sepolia)
4. Check browser console for errors

---

## Post-Submission

| Task | Status | Notes |
|------|--------|-------|
| Submission confirmed | [ ] | |
| Backup of all code made | [ ] | |
| Team notified | [ ] | |
| Monitor for judge questions | [ ] | |
