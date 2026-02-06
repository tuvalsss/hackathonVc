import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
  const contractAddress = "0xf328B08e1b3566Aa37CF8735B9ca781D8DEBA2c7";
  const contract = await ethers.getContractAt("AutoSentinelFunctions", contractAddress);
  
  // Read the simpler source code
  const sourceCode = fs.readFileSync("./chainlink-functions/source-simple.js", "utf-8");
  
  console.log("Updating source code on contract...");
  console.log("Source length:", sourceCode.length, "bytes");
  
  const tx = await contract.setSourceCode(sourceCode);
  console.log("Transaction:", tx.hash);
  await tx.wait();
  console.log("Source code updated!");
  
  // Trigger a new request
  console.log("\nTriggering new request...");
  const tx2 = await contract.sendRequest();
  console.log("Request tx:", tx2.hash);
  const receipt = await tx2.wait();
  console.log("Confirmed in block:", receipt.blockNumber);
  
  // Get request ID from events
  const event = receipt.logs.find((log: any) => {
    try {
      const parsed = contract.interface.parseLog(log as any);
      return parsed?.name === "RequestSent";
    } catch { return false; }
  });
  
  if (event) {
    const parsed = contract.interface.parseLog(event as any);
    console.log("Request ID:", parsed?.args?.requestId);
  }
  
  console.log("\nWaiting for fulfillment (2 min max)...");
  const startTime = Date.now();
  const maxWait = 120000;
  
  while (Date.now() - startTime < maxWait) {
    await new Promise(r => setTimeout(r, 5000));
    process.stdout.write(".");
    
    const stats = await contract.getStatistics();
    if (Number(stats._totalUpdates) > 0) {
      console.log("\n\nFulfillment received!");
      
      const state = await contract.getLatestState();
      console.log("\n============ ON-CHAIN STATE ============");
      console.log("ETH Price: $" + (Number(state.priceETH) / 1e8).toFixed(2));
      console.log("BTC Price: $" + (Number(state.priceBTC) / 1e8).toFixed(2));
      console.log("Score:", state.aggregatedScore.toString());
      console.log("Triggered:", state.thresholdTriggered);
      console.log("Reason:", state.decisionReason);
      console.log("Sources:", state.dataSources);
      console.log("========================================");
      return;
    }
  }
  
  console.log("\nTimeout - check manually");
}

main().catch(console.error);
