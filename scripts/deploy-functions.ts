import { ethers, network, run } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deployment script for AutoSentinelFunctions
 * 
 * This deploys the Chainlink Functions-powered contract to Sepolia
 */

// Chainlink Functions Router addresses
const ROUTER_ADDRESSES: Record<string, string> = {
  sepolia: "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0",
  // Add other networks as needed
};

// DON IDs for Chainlink Functions
const DON_IDS: Record<string, string> = {
  sepolia: "fun-ethereum-sepolia-1",
};

async function main() {
  console.log("=".repeat(60));
  console.log("AutoSentinelFunctions Deployment");
  console.log("=".repeat(60));
  console.log(`Network: ${network.name}`);
  
  const routerAddress = ROUTER_ADDRESSES[network.name];
  if (!routerAddress) {
    throw new Error(`No router address configured for network: ${network.name}`);
  }
  
  console.log(`Router Address: ${routerAddress}`);
  console.log("");

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);
  
  if (balance < ethers.parseEther("0.05")) {
    console.error("\nERROR: Insufficient balance. Need at least 0.05 ETH");
    console.error("Get Sepolia ETH from: https://sepoliafaucet.com");
    process.exit(1);
  }
  
  console.log("");

  // Deploy contract
  console.log("Deploying AutoSentinelFunctions...");
  
  const AutoSentinelFunctions = await ethers.getContractFactory("AutoSentinelFunctions");
  const contract = await AutoSentinelFunctions.deploy(routerAddress);
  
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  
  console.log(`\nContract deployed to: ${contractAddress}`);
  
  // Get DON ID as bytes32
  const donId = DON_IDS[network.name];
  const donIdBytes32 = ethers.encodeBytes32String(donId);
  
  console.log(`\nDON ID: ${donId}`);
  console.log(`DON ID (bytes32): ${donIdBytes32}`);
  
  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    contractAddress,
    routerAddress,
    donId,
    donIdBytes32,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };
  
  const deploymentPath = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\nDeployment info saved to: ${deploymentPath}`);
  
  // Print next steps
  console.log("\n" + "=".repeat(60));
  console.log("NEXT STEPS");
  console.log("=".repeat(60));
  console.log(`
1. Create a Chainlink Functions subscription:
   - Go to: https://functions.chain.link/
   - Connect wallet and create subscription on Sepolia
   - Fund subscription with LINK tokens
   - Add consumer contract: ${contractAddress}
   
2. Configure the contract:
   npx hardhat run scripts/configure-functions.ts --network ${network.name}
   
3. Update frontend .env:
   NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}
   
4. Verify contract on Etherscan:
   npx hardhat verify --network ${network.name} ${contractAddress} ${routerAddress}
`);
  
  // Verify if Etherscan key is available
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("\nVerifying contract...");
    try {
      const tx = contract.deploymentTransaction();
      if (tx) await tx.wait(5);
      
      await run("verify:verify", {
        address: contractAddress,
        constructorArguments: [routerAddress],
      });
      console.log("Contract verified successfully!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract already verified!");
      } else {
        console.log("Verification failed:", error.message);
        console.log("You can verify manually later.");
      }
    }
  }
  
  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
