import { ethers } from "hardhat";

async function main() {
  const contract = await ethers.getContractAt("AutoSentinelFunctions", "0xf328B08e1b3566Aa37CF8735B9ca781D8DEBA2c7");
  
  const stats = await contract.getStatistics();
  console.log("Total Updates:", stats._totalUpdates.toString());
  console.log("Total Requests:", stats._totalRequests.toString());
  
  const subId = await contract.subscriptionId();
  const donId = await contract.donId();
  const gasLimit = await contract.gasLimit();
  console.log("Subscription:", subId.toString());
  console.log("DON ID:", ethers.decodeBytes32String(donId));
  console.log("Gas Limit:", gasLimit.toString());
  
  // Get source code
  const src = await contract.sourceCode();
  console.log("Source code length:", src.length);
  console.log("Source:", src.slice(0, 100));
}
main().catch(console.error);
