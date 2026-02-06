import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
  const contract = await ethers.getContractAt("AutoSentinelFunctions", "0xf328B08e1b3566Aa37CF8735B9ca781D8DEBA2c7");
  const src = fs.readFileSync("./chainlink-functions/source-static.js", "utf-8");
  console.log("Source:", src);
  console.log("Setting...");
  const tx1 = await contract.setSourceCode(src);
  await tx1.wait();
  console.log("Set:", tx1.hash);
  console.log("Requesting...");
  const tx2 = await contract.sendRequest();
  await tx2.wait();
  console.log("Sent:", tx2.hash);
  console.log("Waiting 3 min...");
  for (let i = 0; i < 36; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const s = await contract.getLatestState();
    if (Number(s.timestamp) > 0) {
      console.log("DONE!");
      console.log("ETH:", Number(s.priceETH)/1e8);
      console.log("BTC:", Number(s.priceBTC)/1e8);
      console.log("Score:", s.aggregatedScore.toString());
      return;
    }
    process.stdout.write(".");
  }
  console.log("Timeout");
}
main().catch(console.error);
