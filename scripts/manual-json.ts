import { ethers } from "hardhat";

// Build JSON manually without JSON.stringify
const source = `
var s = "{";
s = s + '"priceETH":280000000000,';
s = s + '"priceBTC":9500000000000,';
s = s + '"score":85,';
s = s + '"triggered":true,';
s = s + '"reason":"Demo",';
s = s + '"sources":"DON"';
s = s + "}";
return Functions.encodeString(s);
`;

async function main() {
  const contract = await ethers.getContractAt("AutoSentinelFunctions", "0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4");
  
  console.log("Testing manual JSON build...");
  console.log("Source:", source);
  
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
  console.log("Req:", reqId);
  
  console.log("Waiting...");
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 10000));
    process.stdout.write(".");
    const s = await contract.getRequestStatus(reqId);
    if (s.fulfilled) {
      console.log("\n\nFulfilled!");
      const resp = ethers.toUtf8String(s.response);
      console.log("Response:", resp);
      
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
