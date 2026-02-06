import { ethers, network } from "hardhat";

// Chainlink Functions SubscriptionManager ABI (partial)
const SUBSCRIPTION_MANAGER_ABI = [
  "function addConsumer(uint64 subscriptionId, address consumer) external",
  "function getSubscription(uint64 subscriptionId) external view returns (uint96 balance, uint96 blockedBalance, address owner, address[] memory consumers)",
];

// Router address for Sepolia
const ROUTER_ADDRESS = "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0";

async function main() {
  const subscriptionId = process.env.FUNCTIONS_SUBSCRIPTION_ID;
  const contractAddress = "0xf328B08e1b3566Aa37CF8735B9ca781D8DEBA2c7";
  
  console.log("Adding consumer to Chainlink Functions subscription...");
  console.log("Subscription ID:", subscriptionId);
  console.log("Consumer (Contract):", contractAddress);
  
  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);
  
  const router = new ethers.Contract(ROUTER_ADDRESS, SUBSCRIPTION_MANAGER_ABI, signer);
  
  // Check current subscription
  try {
    const sub = await router.getSubscription(subscriptionId);
    console.log("\nCurrent subscription state:");
    console.log("  Balance:", ethers.formatUnits(sub.balance, 18), "LINK");
    console.log("  Owner:", sub.owner);
    console.log("  Consumers:", sub.consumers.length);
    
    if (sub.consumers.includes(contractAddress)) {
      console.log("\nContract is already a consumer!");
      return;
    }
  } catch (e: any) {
    console.log("Could not read subscription:", e.message);
  }
  
  // Add consumer
  console.log("\nAdding consumer...");
  const tx = await router.addConsumer(subscriptionId, contractAddress);
  console.log("Transaction:", tx.hash);
  
  await tx.wait();
  console.log("Consumer added successfully!");
}

main().catch(console.error);
