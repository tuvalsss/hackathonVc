# AutoSentinel - Demo Video Plan

## Overview
5-minute demo video showcasing AutoSentinel, an autonomous decision engine built on Chainlink Runtime Environment (CRE).

---

## Demo Script Timeline

### 0:00 - 0:30 | Introduction (30 seconds)

**Script:**
> "Hi, I'm [Name] and this is AutoSentinel - an autonomous market intelligence engine built for the Chainlink Hackathon.
>
> AutoSentinel demonstrates meaningful use of the Chainlink Runtime Environment by creating a bridge between off-chain data and on-chain execution."

**Visual:**
- Show project logo/title slide
- Quick transition to architecture overview

---

### 0:30 - 1:30 | Architecture Overview (60 seconds)

**Script:**
> "Let me walk you through our architecture.
>
> AutoSentinel has three main components:
> 1. **Data Fetching** - We use CRE's HTTP capability to pull real-time price data from multiple sources: CoinGecko and CoinCap APIs.
>
> 2. **Decision Engine** - CRE's compute capability processes this data off-chain, calculating price deviations and generating a decision score.
>
> 3. **On-Chain Execution** - When our threshold is met, CRE's chain-write capability triggers an update to our smart contract on Sepolia.
>
> This design is gas-efficient because we only write on-chain when there's meaningful market activity."

**Visual:**
- Show architecture diagram (from `docs/ARCHITECTURE.md`)
- Highlight each component as mentioned
- Show the flow arrows

**Action:**
- Display the diagram full screen
- Use cursor/pointer to highlight each section

---

### 1:30 - 2:30 | Chainlink Functions Demo (60 seconds)

**Script:**
> "Now let's see Chainlink Functions in action from our frontend.
>
> When I click 'Trigger Workflow':
> 1. The contract sends a request to the Chainlink DON
> 2. The DON executes our JavaScript code off-chain
> 3. It fetches prices from CoinGecko and CoinCap APIs
> 4. Computes the decision score
> 5. Returns the result via the fulfillRequest callback
> 6. The contract stores the verified result on-chain
>
> Watch the status change from 'Sending' to 'Pending' to 'Fulfilled'."

**Visual:**
- Frontend dashboard with "Trigger Workflow" button
- Show status updates in real-time
- Show transaction hash and request ID appearing

**Action:**
1. Open frontend at `localhost:3000`
2. Connect MetaMask to Sepolia
3. Click "Trigger Workflow"
4. Wait for DON fulfillment (30-60 seconds)

**Expected Flow:**
```
Status: Sending request... → Transaction: 0xabc...
Status: Waiting for DON fulfillment... → Request ID: 0xdef...
Status: Request fulfilled! → State updated on-chain
```

---

### 2:30 - 3:30 | Smart Contract & On-Chain State (60 seconds)

**Script:**
> "Let's verify this on-chain. Here's our AutoSentinel smart contract on Sepolia.
>
> The contract stores:
> - The latest price data
> - The decision score
> - Whether the threshold was triggered
> - And the human-readable reason
>
> Looking at the events, you can see each StateUpdated event with the full context of the decision.
>
> The contract also maintains statistics - total updates, trigger counts - all verifiable on-chain."

**Visual:**
- Etherscan showing the contract
- Click on the transaction from the workflow
- Show the event logs
- Show the contract read functions

**Action:**
1. Open Etherscan: `https://sepolia.etherscan.io/address/0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4`
2. Click on the recent transaction
3. Expand "Logs" to show events
4. Go to "Read Contract" and call `getLatestState()`

---

### 3:30 - 4:15 | Frontend Dashboard (45 seconds)

**Script:**
> "We've also built a simple dashboard to visualize the workflow in action.
>
> Here you can see:
> - Real-time price data from our last update
> - The current decision score with a visual gauge
> - Whether the threshold was triggered
> - And a history of recent state changes
>
> The dashboard reads directly from the smart contract, so everything you see is verifiable on-chain."

**Visual:**
- Frontend dashboard running at `localhost:3000`
- Show the data updating
- Click refresh to show real-time capability

**Action:**
```bash
cd frontend
npm run dev
# Open http://localhost:3000
```

---

### 4:15 - 4:45 | Key Highlights & CRE Value (30 seconds)

**Script:**
> "To summarize what makes AutoSentinel special:
>
> 1. **Meaningful CRE Use** - We use HTTP fetch, compute, and chain-write capabilities as designed
>
> 2. **Gas Efficient** - By computing off-chain and only writing when thresholds are met, we save significant gas
>
> 3. **Multi-Source Reliability** - Aggregating from multiple APIs prevents single-source manipulation
>
> 4. **Transparent Decisions** - Every decision reason is recorded on-chain for full auditability"

**Visual:**
- Bullet points appearing one by one
- Or split screen showing code/architecture

---

### 4:45 - 5:00 | Closing (15 seconds)

**Script:**
> "Thank you for watching! AutoSentinel demonstrates how Chainlink Runtime Environment enables intelligent, verifiable, and gas-efficient connections between off-chain data and on-chain execution.
>
> Check out our GitHub repository for the full source code. Thanks!"

**Visual:**
- Thank you slide with:
  - Project name
  - GitHub link
  - Team name

---

## Pre-Demo Checklist

### Environment Setup
- [ ] Contract deployed to Sepolia
- [ ] Contract address updated in `.env`
- [ ] Wallet funded with Sepolia ETH
- [ ] Workflow tested successfully
- [ ] Frontend running and connected

### Screen Setup
- [ ] Terminal window (large font, 14pt+)
- [ ] Browser with Etherscan open
- [ ] Browser with frontend open
- [ ] Architecture diagram ready

### Recording Settings
- [ ] Resolution: 1920x1080
- [ ] Frame rate: 30fps
- [ ] Audio: Clear microphone
- [ ] Hide any sensitive data (private keys, etc.)

---

## Backup Plan

If live demo fails:
1. Have pre-recorded workflow output ready
2. Have screenshots of Etherscan transactions
3. Have frontend running against previous state

---

## Post-Production

1. Add captions/subtitles
2. Add intro/outro slides
3. Ensure audio levels are consistent
4. Upload to YouTube (unlisted)
5. Submit link to Devpost

---

## Demo Assets to Prepare

1. **Architecture Diagram** - `docs/architecture-diagram.png`
2. **Logo/Title Slide** - Create with project name
3. **Bullet Point Slides** - Key highlights summary
4. **Thank You Slide** - GitHub link, team info
