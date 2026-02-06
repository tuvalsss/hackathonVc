import { ethers } from "hardhat";

// Simple comma-separated values - no JSON, no objects
const source = 'return Functions.encodeString("280000000000,9500000000000,85,true,Demo,DON");';

async function main() {
  const contract = await ethers.getContractAt("AutoSentinelFunctions", "0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4");
  
  console.log("Source:", source);
  console.log("Length:", source.length);
  
  const tx1 = await contract.setSourceCode(source);
  await tx1.wait();
  
  const tx2 = await contract.sendRequest();
  const receipt = await tx2.wait();
  console.log("TX:", tx2.hash);
  
  let reqId = "";
  for (const log of receipt!.logs) {
    try { 
      const p = contract.interface.parseLog(log as any);
      if (p?.name === "RequestSent") reqId = p.args.requestId;
    } catch {}
  }
  
  console.log("Waiting...");
  for (let i = 0; i < 12; i++) {
    await new Promise(r => setTimeout(r, 10000));
    process.stdout.write(".");
    const s = await contract.getRequestStatus(reqId);
    if (s.fulfilled) {
      console.log("\n\nDONE!");
      console.log("Response:", ethers.toUtf8String(s.response));
      return;
    }
  }
  console.log("\nTimeout");
}
main().catch(console.error);
