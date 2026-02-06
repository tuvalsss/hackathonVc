import { ethers } from "hardhat";

async function main() {
  const contract = await ethers.getContractAt("AutoSentinelFunctions", "0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4");
  const requestId = "0xbea2fa6531c0b6ad23558b97ce364b5c3c198b18ec0881844a4e7507bf7589de";
  
  const status = await contract.getRequestStatus(requestId);
  console.log("Request Status:");
  console.log("  Fulfilled:", status.fulfilled);
  
  if (status.fulfilled) {
    if (status.response.length > 2) {
      console.log("  Response:", ethers.toUtf8String(status.response));
    }
    if (status.err.length > 2) {
      console.log("  Error:", ethers.toUtf8String(status.err));
    }
  }
  
  const state = await contract.getLatestState();
  console.log("\nLatest State:");
  console.log("  Timestamp:", state.timestamp > 0 ? new Date(Number(state.timestamp) * 1000).toISOString() : "N/A");
  console.log("  ETH Price: $" + (Number(state.priceETH) / 1e8).toFixed(2));
  console.log("  BTC Price: $" + (Number(state.priceBTC) / 1e8).toFixed(2));
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
