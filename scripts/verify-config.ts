import { ethers } from "hardhat";

async function main() {
  const contract = await ethers.getContractAt("AutoSentinelFunctions", "0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4");
  
  const donId = await contract.donId();
  const subId = await contract.subscriptionId();
  const gasLimit = await contract.gasLimit();
  
  console.log("Contract configuration:");
  console.log("  DON ID (bytes32):", donId);
  console.log("  DON ID (string):", ethers.decodeBytes32String(donId));
  console.log("  Subscription ID:", subId.toString());
  console.log("  Gas Limit:", gasLimit.toString());
  
  // Expected DON ID
  const expectedDonId = ethers.encodeBytes32String("fun-ethereum-sepolia-1");
  console.log("\nExpected DON ID:", expectedDonId);
  console.log("Match:", donId === expectedDonId);
}
main().catch(console.error);
