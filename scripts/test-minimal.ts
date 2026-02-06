import { ethers } from "hardhat";

async function main() {
  const contract = await ethers.getContractAt("AutoSentinelFunctions", "0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4");
  
  // Ultra simple source - just return a hardcoded string
  const simpleSource = 'return Functions.encodeString("test");';
  
  console.log("Setting ultra-simple source code...");
  const tx1 = await contract.setSourceCode(simpleSource);
  await tx1.wait();
  console.log("Source set:", tx1.hash);
  
  console.log("\nSending request...");
  const tx2 = await contract.sendRequest();
  console.log("Request TX:", tx2.hash);
  await tx2.wait();
  
  console.log("\nWaiting 3 minutes for fulfillment...");
  for (let i = 0; i < 18; i++) {
    await new Promise(r => setTimeout(r, 10000));
    process.stdout.write(".");
    
    const stats = await contract.getStatistics();
    if (Number(stats._totalUpdates) > 0) {
      console.log("\nFulfilled!");
      const state = await contract.getLatestState();
      console.log("State:", state);
      return;
    }
  }
  
  // Check last request status
  const lastId = await contract.lastRequestId();
  const status = await contract.getRequestStatus(lastId);
  console.log("\nRequest status:");
  console.log("Fulfilled:", status.fulfilled);
  console.log("Response:", status.response);
  console.log("Error:", status.err);
}
main().catch(console.error);
