import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
  const contractAddress = "0xf328B08e1b3566Aa37CF8735B9ca781D8DEBA2c7";
  const contract = await ethers.getContractAt("AutoSentinelFunctions", contractAddress);
  
  const sourceCode = fs.readFileSync("./chainlink-functions/source-minimal.js", "utf-8");
  
  console.log("Setting minimal source code...");
  const tx1 = await contract.setSourceCode(sourceCode);
  await tx1.wait();
  console.log("Source updated:", tx1.hash);
  
  console.log("\nTriggering request...");
  const tx2 = await contract.sendRequest();
  const receipt = await tx2.wait();
  console.log("Request tx:", tx2.hash);
  console.log("Block:", receipt.blockNumber);
  
  // Parse events
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log as any);
      if (parsed?.name === "RequestSent") {
        console.log("Request ID:", parsed.args.requestId);
      }
    } catch {}
  }
  
  console.log("\nPolling for 3 minutes...");
  for (let i = 0; i < 36; i++) {
    await new Promise(r => setTimeout(r, 5000));
    process.stdout.write(".");
    
    const state = await contract.getLatestState();
    if (Number(state.timestamp) > 0) {
      console.log("\n\n=== FULFILLED ===");
      console.log("ETH: $" + (Number(state.priceETH) / 1e8));
      console.log("BTC: $" + (Number(state.priceBTC) / 1e8));
      console.log("Score:", state.aggregatedScore.toString());
      console.log("Triggered:", state.thresholdTriggered);
      console.log("Reason:", state.decisionReason);
      return;
    }
  }
  console.log("\nTimeout");
}

main().catch(console.error);
