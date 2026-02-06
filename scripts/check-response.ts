import { ethers } from "hardhat";

async function main() {
  const contractAddress = "0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4";
  const contract = await ethers.getContractAt("AutoSentinelFunctions", contractAddress);
  
  console.log("\n📊 Latest State from Contract:");
  const state = await contract.getLatestState();
  
  console.log("  Timestamp:", new Date(Number(state[0]) * 1000).toISOString());
  console.log("  ETH Price:", (Number(state[1]) / 100).toFixed(2), "USD");
  console.log("  BTC Price:", (Number(state[2]) / 100).toFixed(2), "USD");
  console.log("  Score:", state[3].toString());
  console.log("  Triggered:", state[4]);
  console.log("  Reason:", state[5]);
  console.log("  Sources:", state[6]);
  console.log("  Request ID:", state[7]);
  
  console.log("\n🔍 Checking if request was fulfilled:");
  const requestId = state[7];
  const status = await contract.getRequestStatus(requestId);
  console.log("  Fulfilled:", status.fulfilled);
  console.log("  Raw Response:", ethers.hexlify(status.response));
  console.log("  Decoded Response:", ethers.toUtf8String(status.response));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
