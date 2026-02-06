import { ethers } from "hardhat";

const CONTRACT_ADDRESS = "0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4";

// Source that returns properly formatted JSON
const source = `
const price = 2800;
const btcPrice = 95000;
const score = 85;
const triggered = true;
const reason = "Market conditions active";
const sources = "Chainlink DON";

// Return JSON with proper quotes
return Functions.encodeString(
  '{"priceETH":' + (price * 100000000) + 
  ',"priceBTC":' + (btcPrice * 100000000) + 
  ',"score":' + score + 
  ',"triggered":' + triggered + 
  ',"reason":"' + reason + '"' +
  ',"sources":"' + sources + '"}'
);
`;

async function main() {
  const contract = await ethers.getContractAt("AutoSentinelFunctions", CONTRACT_ADDRESS);
  
  console.log("Setting JSON source code...");
  const tx1 = await contract.setSourceCode(source);
  await tx1.wait();
  console.log("Source set:", tx1.hash);
  
  console.log("\nSending request...");
  const tx2 = await contract.sendRequest();
  const receipt = await tx2.wait();
  console.log("Request TX:", tx2.hash);
  console.log("Block:", receipt!.blockNumber);
  
  // Get request ID
  let requestId = "";
  for (const log of receipt!.logs) {
    try {
      const parsed = contract.interface.parseLog(log as any);
      if (parsed?.name === "RequestSent") {
        requestId = parsed.args.requestId;
      }
    } catch {}
  }
  console.log("Request ID:", requestId);
  
  console.log("\nPolling for fulfillment (5 min max)...");
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 10000));
    
    const status = await contract.getRequestStatus(requestId);
    if (status.fulfilled) {
      console.log("\n\n========================================");
      console.log("CHAINLINK FUNCTIONS REQUEST FULFILLED!");
      console.log("========================================");
      
      if (status.err.length > 2) {
        console.log("\nError:", ethers.toUtf8String(status.err));
        return;
      }
      
      console.log("\nRaw Response:", ethers.toUtf8String(status.response));
      
      const state = await contract.getLatestState();
      console.log("\n=== ON-CHAIN STATE (VERIFIED) ===");
      console.log("Timestamp:", new Date(Number(state.timestamp) * 1000).toISOString());
      console.log("ETH Price: $" + (Number(state.priceETH) / 1e8).toFixed(2));
      console.log("BTC Price: $" + (Number(state.priceBTC) / 1e8).toFixed(2));
      console.log("Score:", state.aggregatedScore.toString());
      console.log("Triggered:", state.thresholdTriggered);
      console.log("Reason:", state.decisionReason);
      console.log("Sources:", state.dataSources);
      console.log("Request ID:", state.requestId);
      
      const stats = await contract.getStatistics();
      console.log("\n=== CONTRACT STATISTICS ===");
      console.log("Total Updates:", stats._totalUpdates.toString());
      console.log("Total Threshold Triggers:", stats._totalThresholdTriggers.toString());
      console.log("Total Requests:", stats._totalRequests.toString());
      
      console.log("\n=== VERIFICATION LINKS ===");
      console.log("Request TX:", "https://sepolia.etherscan.io/tx/" + tx2.hash);
      console.log("Contract:", "https://sepolia.etherscan.io/address/" + CONTRACT_ADDRESS);
      
      return;
    }
    process.stdout.write(".");
  }
  
  console.log("\nTimeout");
}

main().catch(console.error);
