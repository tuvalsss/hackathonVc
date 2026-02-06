import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("\n🔧 Updating AutoSentinel source code with fixed version...\n");

  const contractAddress = "0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4";
  
  // Read the fixed source code
  const sourcePath = path.join(__dirname, "../chainlink-functions/source.js");
  const sourceCode = fs.readFileSync(sourcePath, "utf8");
  
  console.log("📄 Source code loaded:");
  console.log("   Length:", sourceCode.length, "bytes");
  console.log("   First 100 chars:", sourceCode.substring(0, 100) + "...");
  
  // Get contract instance
  const contract = await ethers.getContractAt("AutoSentinelFunctions", contractAddress);
  
  console.log("\n📤 Sending update transaction...");
  const tx = await contract.setSourceCode(sourceCode);
  console.log("   TX Hash:", tx.hash);
  
  console.log("\n⏳ Waiting for confirmation...");
  const receipt = await tx.wait();
  console.log("   ✅ Confirmed in block:", receipt?.blockNumber);
  
  console.log("\n✨ Source code updated successfully!");
  console.log("\n💡 Next: Trigger a new request from the frontend to test the fix");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
