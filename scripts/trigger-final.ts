import { ethers } from "hardhat";

async function main() {
  const contract = await ethers.getContractAt("AutoSentinelFunctions", "0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4");
  
  console.log("Triggering Chainlink Functions request...\n");
  
  const tx = await contract.sendRequest();
  console.log("Request TX:", tx.hash);
  const receipt = await tx.wait();
  console.log("Block:", receipt!.blockNumber);
  
  // Get request ID
  let requestId = "";
  for (const log of receipt!.logs) {
    try {
      const parsed = contract.interface.parseLog(log as any);
      if (parsed?.name === "RequestSent") {
        requestId = parsed.args.requestId;
        console.log("Request ID:", requestId);
      }
    } catch {}
  }
  
  console.log("\nWaiting for DON fulfillment (max 5 minutes)...");
  const startTime = Date.now();
  
  while (Date.now() - startTime < 300000) {
    await new Promise(r => setTimeout(r, 10000));
    process.stdout.write(".");
    
    try {
      const status = await contract.getRequestStatus(requestId);
      if (status.fulfilled) {
        console.log("\n\n========== FULFILLED ==========");
        console.log("Response length:", status.response.length);
        console.log("Error length:", status.err.length);
        
        if (status.err.length > 0) {
          console.log("Error:", ethers.toUtf8String(status.err));
        }
        
        const state = await contract.getLatestState();
        console.log("\n=== ON-CHAIN STATE ===");
        console.log("Timestamp:", new Date(Number(state.timestamp) * 1000).toISOString());
        console.log("ETH Price: $" + (Number(state.priceETH) / 1e8).toFixed(2));
        console.log("BTC Price: $" + (Number(state.priceBTC) / 1e8).toFixed(2));
        console.log("Score:", state.aggregatedScore.toString());
        console.log("Triggered:", state.thresholdTriggered);
        console.log("Reason:", state.decisionReason);
        console.log("Sources:", state.dataSources);
        console.log("Request ID:", state.requestId);
        
        console.log("\n=== VERIFICATION LINKS ===");
        console.log("Request TX:", "https://sepolia.etherscan.io/tx/" + tx.hash);
        console.log("Contract:", "https://sepolia.etherscan.io/address/0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4");
        return;
      }
    } catch (e) {}
  }
  
  console.log("\n\nTimeout - checking status...");
  const stats = await contract.getStatistics();
  console.log("Total Updates:", stats._totalUpdates.toString());
  console.log("Total Requests:", stats._totalRequests.toString());
}

main().catch(console.error);
