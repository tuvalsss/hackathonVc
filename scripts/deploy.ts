import { ethers, network, run } from "hardhat";

async function main() {
  console.log("=".repeat(60));
  console.log("AutoSentinel Deployment Script");
  console.log("=".repeat(60));
  console.log(`Network: ${network.name}`);
  console.log(`Chain ID: ${network.config.chainId}`);
  console.log("");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance: ${ethers.formatEther(balance)} ETH`);
  console.log("");

  // Check minimum balance
  if (balance < ethers.parseEther("0.01")) {
    console.error("ERROR: Insufficient balance for deployment");
    console.error("Please fund your wallet with testnet ETH from:");
    console.error("  - https://sepoliafaucet.com");
    console.error("  - https://www.alchemy.com/faucets/ethereum-sepolia");
    process.exit(1);
  }

  // Deploy AutoSentinel contract
  console.log("Deploying AutoSentinel contract...");
  const AutoSentinel = await ethers.getContractFactory("AutoSentinel");
  const autoSentinel = await AutoSentinel.deploy();
  
  await autoSentinel.waitForDeployment();
  const contractAddress = await autoSentinel.getAddress();
  
  console.log("");
  console.log("=".repeat(60));
  console.log("DEPLOYMENT SUCCESSFUL!");
  console.log("=".repeat(60));
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Owner: ${deployer.address}`);
  console.log("");

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.config.chainId,
    contractAddress: contractAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
  };

  console.log("Deployment Info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  console.log("");

  // Verify on Etherscan if on testnet
  if (network.name === "sepolia" && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for block confirmations before verification...");
    // Wait for 5 block confirmations
    const deployTx = autoSentinel.deploymentTransaction();
    if (deployTx) {
      await deployTx.wait(5);
    }

    console.log("Verifying contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
      console.log("Contract verified successfully!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract already verified!");
      } else {
        console.error("Verification failed:", error.message);
      }
    }
  }

  // Output helpful links
  console.log("");
  console.log("=".repeat(60));
  console.log("NEXT STEPS:");
  console.log("=".repeat(60));
  console.log("");
  console.log("1. Update .env with CONTRACT_ADDRESS:");
  console.log(`   CONTRACT_ADDRESS=${contractAddress}`);
  console.log("");
  console.log("2. View on Etherscan:");
  if (network.name === "sepolia") {
    console.log(`   https://sepolia.etherscan.io/address/${contractAddress}`);
  }
  console.log("");
  console.log("3. Run CRE workflow:");
  console.log("   npm run workflow:run");
  console.log("");
  console.log("4. Start frontend:");
  console.log("   cd frontend && npm run dev");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
