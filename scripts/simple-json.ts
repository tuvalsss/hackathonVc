import { ethers } from "hardhat";

// Super simple JSON source - no variables, just hardcoded
const source = 'return Functions.encodeString(\'{"priceETH":280000000000,"priceBTC":9500000000000,"score":85,"triggered":true,"reason":"Demo success","sources":"DON"}\');';

async function main() {
  const contract = await ethers.getContractAt("AutoSentinelFunctions", "0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4");
  
  console.log("Source:", source);
  console.log("\nSetting source...");
  const tx1 = await contract.setSourceCode(source);
  await tx1.wait();
  
  console.log("Sending request...");
  const tx2 = await contract.sendRequest();
  const receipt = await tx2.wait();
  console.log("TX:", tx2.hash);
  
  let requestId = "";
  for (const log of receipt!.logs) {
    try {
      const p = contract.interface.parseLog(log as any);
      if (p?.name === "RequestSent") requestId = p.args.requestId;
    } catch {}
  }
  console.log("Request ID:", requestId);
  
  console.log("\nWaiting...");
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 10000));
    process.stdout.write(".");
    const s = await contract.getRequestStatus(requestId);
    if (s.fulfilled) {
      console.log("\n\nFULFILLED!");
      console.log("Response:", ethers.toUtf8String(s.response));
      const state = await contract.getLatestState();
      console.log("\nON-CHAIN STATE:");
      console.log("ETH: $" + (Number(state.priceETH)/1e8));
      console.log("BTC: $" + (Number(state.priceBTC)/1e8));
      console.log("Score:", state.aggregatedScore.toString());
      console.log("Triggered:", state.thresholdTriggered);
      console.log("Reason:", state.decisionReason);
      console.log("Sources:", state.dataSources);
      return;
    }
  }
  console.log("\nTimeout");
}
main().catch(console.error);
