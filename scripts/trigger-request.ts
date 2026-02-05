import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("=".repeat(60));
  console.log("AutoSentinel - Trigger Chainlink Functions Request");
  console.log("=".repeat(60));
  
  const deploymentPath = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  if (!fs.existsSync(deploymentPath)) {
    throw new Error("Deployment not found. Run deploy-functions.ts first.");
  }
  
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  console.log("Contract:", deployment.contractAddress);
  
  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);
  
  const contract = await ethers.getContractAt(
    "AutoSentinelFunctions",
    deployment.contractAddress,
    signer
  );
  
  const subId = await contract.subscriptionId();
  if (subId === 0n) {
    throw new Error("Contract not configured. Run configure-functions.ts first.");
  }
  console.log("Subscription ID:", subId.toString());
  
  console.log("\nSending Chainlink Functions request...");
  const tx = await contract.sendRequest();
  console.log("Transaction:", tx.hash);
  
  const receipt = await tx.wait();
  console.log("Confirmed in block:", receipt?.blockNumber);
  
  let requestId: string | null = null;
  for (const log of receipt?.logs || []) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed?.name === "RequestSent") {
        requestId = parsed.args[0];
        console.log("\nRequest ID:", requestId);
        break;
      }
    } catch {}
  }
  
  console.log("\nWaiting for fulfillment (may take 1-3 minutes)...");
  
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    
    if (requestId) {
      try {
        const status = await contract.getRequestStatus(requestId);
        if (status.fulfilled) {
          console.log("\n\nREQUEST FULFILLED!");
          
          const state = await contract.getLatestState();
          console.log("\n--- Sentinel State ---");
          console.log("ETH Price: $" + (Number(state.priceETH) / 1e8).toFixed(2));
          console.log("BTC Price: $" + (Number(state.priceBTC) / 1e8).toFixed(2));
          console.log("Score:", state.aggregatedScore.toString() + "/100");
          console.log("Triggered:", state.thresholdTriggered);
          console.log("Reason:", state.decisionReason);
          console.log("Sources:", state.dataSources);
          
          console.log("\nExplorer: https://sepolia.etherscan.io/tx/" + tx.hash);
          return;
        }
      } catch {}
    }
    process.stdout.write(".");
  }
  
  console.log("\n\nTimeout waiting for fulfillment.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
