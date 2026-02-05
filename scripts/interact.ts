import { ethers } from "hardhat";

/**
 * Script to interact with deployed AutoSentinel contract
 * Usage: npx hardhat run scripts/interact.ts --network sepolia
 */

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "";

async function main() {
  if (!CONTRACT_ADDRESS) {
    console.error("ERROR: CONTRACT_ADDRESS not set in environment");
    process.exit(1);
  }

  console.log("=".repeat(60));
  console.log("AutoSentinel Contract Interaction");
  console.log("=".repeat(60));
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log("");

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log(`Signer: ${signer.address}`);

  // Get contract instance
  const autoSentinel = await ethers.getContractAt("AutoSentinel", CONTRACT_ADDRESS);

  // Read current state
  console.log("\n--- Current State ---");
  const currentState = await autoSentinel.getLatestState();
  console.log("Timestamp:", currentState.timestamp.toString());
  console.log("ETH Price:", ethers.formatUnits(currentState.priceETH, 8), "USD");
  console.log("BTC Price:", ethers.formatUnits(currentState.priceBTC, 8), "USD");
  console.log("Score:", currentState.aggregatedScore.toString());
  console.log("Threshold Triggered:", currentState.thresholdTriggered);
  console.log("Reason:", currentState.decisionReason);

  // Read statistics
  console.log("\n--- Statistics ---");
  const stats = await autoSentinel.getStatistics();
  console.log("Total Updates:", stats._totalUpdates.toString());
  console.log("Total Triggers:", stats._totalThresholdTriggers.toString());
  console.log("Current Threshold:", stats._currentThreshold.toString());

  // Read history
  console.log("\n--- Recent History ---");
  const historyLength = await autoSentinel.getHistoryLength();
  console.log("History Length:", historyLength.toString());
  
  if (historyLength > 0n) {
    const history = await autoSentinel.getStateHistory(5);
    history.forEach((state: any, index: number) => {
      console.log(`\n  Entry ${index + 1}:`);
      console.log(`    Time: ${new Date(Number(state.timestamp) * 1000).toISOString()}`);
      console.log(`    Score: ${state.aggregatedScore}`);
      console.log(`    Triggered: ${state.thresholdTriggered}`);
    });
  }

  // Check authorization
  console.log("\n--- Authorization Check ---");
  const isAuthorized = await autoSentinel.isAuthorized(signer.address);
  console.log(`Signer is authorized: ${isAuthorized}`);

  // Time until next update
  const timeUntil = await autoSentinel.timeUntilNextUpdate();
  console.log(`Time until next update: ${timeUntil} seconds`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
