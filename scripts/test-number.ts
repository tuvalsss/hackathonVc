import { ethers } from "hardhat";

// Just return a simple string with numbers
const source = 'return Functions.encodeString("priceETH:2800,score:85");';

async function main() {
  const contract = await ethers.getContractAt("AutoSentinelFunctions", "0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4");
  
  console.log("Testing simple string with numbers...");
  const tx1 = await contract.setSourceCode(source);
  await tx1.wait();
  
  const tx2 = await contract.sendRequest();
  await tx2.wait();
  console.log("TX:", tx2.hash);
  
  let reqId = "";
  for (const log of (await tx2.wait())!.logs) {
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
      console.log("\nFulfilled!");
      console.log("Response:", ethers.toUtf8String(s.response));
      return;
    }
  }
  console.log("\nTimeout");
}
main().catch(console.error);
