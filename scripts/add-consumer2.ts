import { ethers } from "hardhat";

const SUBSCRIPTION_MANAGER_ABI = [
  "function addConsumer(uint64 subscriptionId, address consumer) external",
];

const ROUTER_ADDRESS = "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0";
const CONTRACT_ADDRESS = "0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4";
const SUBSCRIPTION_ID = 6239;

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Adding consumer...");
  console.log("Contract:", CONTRACT_ADDRESS);
  console.log("Subscription:", SUBSCRIPTION_ID);
  
  const router = new ethers.Contract(ROUTER_ADDRESS, SUBSCRIPTION_MANAGER_ABI, signer);
  const tx = await router.addConsumer(SUBSCRIPTION_ID, CONTRACT_ADDRESS);
  console.log("TX:", tx.hash);
  await tx.wait();
  console.log("Done!");
}

main().catch(console.error);
