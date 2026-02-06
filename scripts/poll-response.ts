import { ethers } from "hardhat";

const CONTRACT_ADDRESS = "0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4";
const REQUEST_ID = "0x8ea9e5e9a37021952ba3df587d2040a666d5ad478de6e7e8cee5bf41c0fc1f03";

async function main() {
  const contract = await ethers.getContractAt("AutoSentinelFunctions", CONTRACT_ADDRESS);
  
  console.log("Polling for fulfillment of request:", REQUEST_ID);
  console.log("Starting at:", new Date().toISOString());
  
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 10000));
    
    try {
      const status = await contract.getRequestStatus(REQUEST_ID);
      
      if (status.fulfilled) {
        console.log("\n\n=== REQUEST FULFILLED ===");
        console.log("Time:", new Date().toISOString());
        
        if (status.err.length > 2) {
          console.log("ERROR:", ethers.toUtf8String(status.err));
        }
        
        if (status.response.length > 2) {
          console.log("Response:", ethers.toUtf8String(status.response));
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
        
        return;
      }
      
      process.stdout.write(".");
    } catch (e) {
      process.stdout.write("x");
    }
  }
  
  console.log("\nTimeout after 5 minutes");
  
  // Check stats
  const stats = await contract.getStatistics();
  console.log("Total Updates:", stats._totalUpdates.toString());
  console.log("Total Requests:", stats._totalRequests.toString());
}

main().catch(console.error);
