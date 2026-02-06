import { ethers } from "hardhat";

async function main() {
  const contract = await ethers.getContractAt("AutoSentinelFunctions", "0xf328B08e1b3566Aa37CF8735B9ca781D8DEBA2c7");
  
  const requestId = "0xc86defe6752501f8229b0a6731ba8a6b3688fd17096f8a93daf3dcd9b514e3b7";
  
  try {
    const status = await contract.getRequestStatus(requestId);
    console.log("Request exists:", status.exists);
    console.log("Request fulfilled:", status.fulfilled);
    console.log("Timestamp:", status.timestamp.toString());
  } catch (e: any) {
    console.log("Error:", e.message);
  }
  
  const state = await contract.getLatestState();
  console.log("\nLatest State:");
  console.log("  Timestamp:", state.timestamp.toString());
  console.log("  ETH Price:", Number(state.priceETH) / 1e8);
  console.log("  BTC Price:", Number(state.priceBTC) / 1e8);
  console.log("  Score:", state.aggregatedScore.toString());
  console.log("  Triggered:", state.thresholdTriggered);
  console.log("  Reason:", state.decisionReason);
  console.log("  Sources:", state.dataSources);
  
  const stats = await contract.getStatistics();
  console.log("\nStatistics:");
  console.log("  Total Updates:", stats._totalUpdates.toString());
  console.log("  Total Triggers:", stats._totalThresholdTriggers.toString());
  console.log("  Total Requests:", stats._totalRequests.toString());
}

main().catch(console.error);
