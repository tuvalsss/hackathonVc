import { ethers } from "hardhat";

async function main() {
  const address = "0xC9FB2CC0D0AC76315cB2b39b27DDE9005C6f481f";
  const contract = await ethers.getContractAt("AutoSentinelV2", address);
  
  // Set the EXACT same source that worked in SimpleConsumer
  const simpleSource = 'return Functions.encodeString("priceETH:285000,priceBTC:4350000,score:70,triggered:0,reason:Market analysis,sources:Demo");';
  
  console.log("Setting simple source code...");
  console.log("Source:", simpleSource);
  console.log("Length:", simpleSource.length, "bytes");
  
  const setTx = await contract.setSourceCode(simpleSource);
  await setTx.wait();
  console.log("Source set!");
  
  // Send request
  console.log("\nSending request...");
  const reqTx = await contract.sendRequest();
  const receipt = await reqTx.wait();
  console.log("TX:", reqTx.hash);
  
  const requestId = await contract.lastRequestId();
  console.log("Request ID:", requestId);
  
  // Wait
  console.log("\nWaiting for fulfillment...");
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const fulfilled = await contract.requestFulfilled(requestId);
    if (fulfilled) {
      console.log(`\n[${(i+1)*5}s] FULFILLED!`);
      const resp = await contract.getLastResponseString();
      console.log("Response:", resp);
      const state = await contract.getLatestState();
      console.log("ETH:", (Number(state[1]) / 100).toFixed(2));
      console.log("BTC:", (Number(state[2]) / 100).toFixed(2));
      console.log("Score:", state[3].toString());
      console.log("Reason:", state[5]);
      console.log("Sources:", state[6]);
      return;
    }
    process.stdout.write(`  [${(i+1)*5}s]...\r`);
  }
  console.log("\nTimeout.");
}

main().catch(console.error);
