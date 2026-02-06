import { ethers } from "hardhat";

async function main() {
  const contract = await ethers.getContractAt("AutoSentinelFunctions", "0xf328B08e1b3566Aa37CF8735B9ca781D8DEBA2c7");
  
  // Get all events from recent blocks
  const currentBlock = await ethers.provider.getBlockNumber();
  const fromBlock = currentBlock - 500;
  
  console.log("Checking events from block", fromBlock, "to", currentBlock);
  
  const requestSentFilter = contract.filters.RequestSent();
  const requestFulfilledFilter = contract.filters.RequestFulfilled();
  const stateUpdatedFilter = contract.filters.StateUpdated();
  
  const sentEvents = await contract.queryFilter(requestSentFilter, fromBlock);
  console.log("\nRequestSent events:", sentEvents.length);
  for (const e of sentEvents) {
    console.log("  - Block:", e.blockNumber, "RequestId:", e.args?.requestId?.slice(0, 20) + "...");
  }
  
  const fulfilledEvents = await contract.queryFilter(requestFulfilledFilter, fromBlock);
  console.log("\nRequestFulfilled events:", fulfilledEvents.length);
  for (const e of fulfilledEvents) {
    console.log("  - Block:", e.blockNumber, "RequestId:", e.args?.requestId?.slice(0, 20) + "...");
  }
  
  const stateEvents = await contract.queryFilter(stateUpdatedFilter, fromBlock);
  console.log("\nStateUpdated events:", stateEvents.length);
  
  // Check current stats
  const stats = await contract.getStatistics();
  console.log("\nContract Statistics:");
  console.log("  Total Updates:", stats._totalUpdates.toString());
  console.log("  Total Requests:", stats._totalRequests.toString());
  
  // Check subscription and DON config
  const subId = await contract.subscriptionId();
  const donId = await contract.donId();
  console.log("\nConfiguration:");
  console.log("  Subscription ID:", subId.toString());
  console.log("  DON ID:", ethers.decodeBytes32String(donId));
}
main().catch(console.error);
