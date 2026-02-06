import { ethers } from "hardhat";

// Try with JSON.stringify to ensure proper escaping
const jsonObj = {
  priceETH: 280000000000,
  priceBTC: 9500000000000,
  score: 85,
  triggered: true,
  reason: "Demo success",
  sources: "DON"
};

// Build source with JSON.stringify in the code itself
const source = 'const r={priceETH:280000000000,priceBTC:9500000000000,score:85,triggered:true,reason:"Demo",sources:"DON"};return Functions.encodeString(JSON.stringify(r));';

async function main() {
  const contract = await ethers.getContractAt("AutoSentinelFunctions", "0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4");
  
  console.log("Source:", source);
  console.log("Length:", source.length);
  
  console.log("\nSetting...");
  const tx1 = await contract.setSourceCode(source);
  await tx1.wait();
  
  console.log("Sending...");
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
  console.log("Req ID:", reqId);
  
  console.log("\nPolling...");
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 10000));
    process.stdout.write(".");
    const s = await contract.getRequestStatus(reqId);
    if (s.fulfilled) {
      console.log("\n\nDONE!");
      if (s.err.length > 2) console.log("Error:", ethers.toUtf8String(s.err));
      if (s.response.length > 2) console.log("Response:", ethers.toUtf8String(s.response));
      const state = await contract.getLatestState();
      console.log("\nState:");
      console.log("ETH:", Number(state.priceETH)/1e8);
      console.log("BTC:", Number(state.priceBTC)/1e8);
      console.log("Score:", state.aggregatedScore.toString());
      console.log("Triggered:", state.thresholdTriggered);
      return;
    }
  }
  console.log("\nTimeout");
}
main().catch(console.error);
