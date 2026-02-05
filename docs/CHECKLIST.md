# AutoSentinel - Test & Submission Checklists

## Feature Test Checklist

### Smart Contract Tests

| Test | Status | Notes |
|------|--------|-------|
| Contract deploys successfully | [ ] | |
| Owner is set correctly | [ ] | |
| Authorized caller can update state | [ ] | |
| Unauthorized caller cannot update state | [ ] | |
| Rate limiting works (60s minimum) | [ ] | |
| State history is recorded | [ ] | |
| Statistics are updated correctly | [ ] | |
| Events are emitted properly | [ ] | |
| Threshold update works | [ ] | |
| Ownership transfer works | [ ] | |
| Invalid inputs are rejected | [ ] | |

### CRE Workflow Tests

| Test | Status | Notes |
|------|--------|-------|
| CoinGecko API fetch works | [ ] | |
| CoinCap API fetch works | [ ] | |
| Graceful degradation (one API fails) | [ ] | |
| Price aggregation is correct | [ ] | |
| Decision score calculation is accurate | [ ] | |
| First run always triggers | [ ] | |
| Threshold logic is correct | [ ] | |
| On-chain execution succeeds | [ ] | |
| Error handling works | [ ] | |
| Logging is comprehensive | [ ] | |

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
| End-to-end workflow: Fetch → Compute → Execute | [ ] | |
| Contract state matches workflow output | [ ] | |
| Frontend reflects contract state | [ ] | |
| Multiple consecutive workflows work | [ ] | |
| Workflow handles network issues | [ ] | |

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
| `npm install` completed | [ ] | |
| `npx hardhat compile` succeeds | [ ] | |
| Deploy to Sepolia successful | [ ] | |
| Contract address recorded | [ ] | |
| Contract verified on Etherscan | [ ] | |
| Owner functions tested | [ ] | |

### Workflow Deployment

| Task | Status | Notes |
|------|--------|-------|
| `cd cre-workflow && npm install` | [ ] | |
| CONTRACT_ADDRESS set in .env | [ ] | |
| `npm run test` passes | [ ] | |
| `npm run start` executes successfully | [ ] | |
| Transaction confirmed on Etherscan | [ ] | |

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
