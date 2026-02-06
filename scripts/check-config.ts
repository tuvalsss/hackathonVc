import { ethers } from "hardhat";

async function main() {
  const contractAddress = "0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4";
  const contract = await ethers.getContractAt("AutoSentinelFunctions", contractAddress);
  
  console.log("\n📋 Contract Configuration:");
  
  try {
    const stats = await contract.getStatistics();
    console.log("  Total Requests:", stats[2].toString());
    console.log("  Total Updates:", stats[0].toString());
    console.log("  Success Rate:", `${(Number(stats[0]) / Number(stats[2]) * 100).toFixed(1)}%`);
  } catch (e) {
    console.log("  Error fetching stats:", e);
  }
  
  console.log("\n🔍 Checking latest request...");
  try {
    const latestState = await contract.getLatestState();
    const requestId = latestState[7];
    console.log("  Latest Request ID:", requestId);
    
    if (requestId !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
      const status = await contract.getRequestStatus(requestId);
      console.log("  Fulfilled:", status.fulfilled);
      console.log("  Response Length:", status.response.length);
      console.log("  Error:", status.err);
      console.log("  Timestamp:", new Date(Number(status.timestamp) * 1000).toISOString());
    }
  } catch (e) {
    console.log("  Error:", e);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
