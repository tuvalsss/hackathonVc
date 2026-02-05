import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Configure AutoSentinelFunctions after deployment
 * 
 * Sets:
 * - DON ID
 * - Subscription ID
 * - Gas limit
 * - Source code (optional)
 */

// DON IDs for Chainlink Functions
const DON_IDS: Record<string, string> = {
  sepolia: "fun-ethereum-sepolia-1",
};

async function main() {
  console.log("=".repeat(60));
  console.log("AutoSentinelFunctions Configuration");
  console.log("=".repeat(60));
  
  // Load deployment info
  const deploymentPath = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment not found. Run deploy-functions.ts first.`);
  }
  
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  console.log(`Contract: ${deployment.contractAddress}`);
  
  // Get subscription ID from environment
  const subscriptionId = process.env.FUNCTIONS_SUBSCRIPTION_ID;
  if (!subscriptionId) {
    console.error("\nERROR: FUNCTIONS_SUBSCRIPTION_ID not set in .env");
    console.error("Create a subscription at https://functions.chain.link/");
    process.exit(1);
  }
  
  console.log(`Subscription ID: ${subscriptionId}`);
  
  // Get DON ID
  const donId = DON_IDS[network.name];
  const donIdBytes32 = ethers.encodeBytes32String(donId);
  console.log(`DON ID: ${donId}`);
  
  // Gas limit for callback
  const gasLimit = 300000;
  console.log(`Gas Limit: ${gasLimit}`);
  
  // Connect to contract
  const [signer] = await ethers.getSigners();
  const contract = await ethers.getContractAt(
    "AutoSentinelFunctions",
    deployment.contractAddress,
    signer
  );
  
  // Set configuration
  console.log("\nSetting configuration...");
  
  const tx = await contract.setConfig(
    donIdBytes32,
    BigInt(subscriptionId),
    gasLimit
  );
  
  console.log(`Transaction: ${tx.hash}`);
  await tx.wait();
  console.log("Configuration set successfully!");
  
  // Verify configuration
  console.log("\nVerifying configuration...");
  const currentDonId = await contract.donId();
  const currentSubId = await contract.subscriptionId();
  const currentGasLimit = await contract.gasLimit();
  
  console.log(`  DON ID: ${currentDonId}`);
  console.log(`  Subscription ID: ${currentSubId}`);
  console.log(`  Gas Limit: ${currentGasLimit}`);
  
  // Optionally update source code from file
  const sourceCodePath = path.join(__dirname, "..", "chainlink-functions", "source-inline.js");
  if (fs.existsSync(sourceCodePath) && process.env.UPDATE_SOURCE_CODE === "true") {
    console.log("\nUpdating source code...");
    const sourceCode = fs.readFileSync(sourceCodePath, "utf-8");
    
    const sourceTx = await contract.setSourceCode(sourceCode);
    console.log(`Transaction: ${sourceTx.hash}`);
    await sourceTx.wait();
    console.log("Source code updated!");
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("Configuration complete!");
  console.log("=".repeat(60));
  console.log(`
You can now trigger a request:
  npx hardhat run scripts/trigger-request.ts --network ${network.name}
  
Or use the frontend to trigger requests.
`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
