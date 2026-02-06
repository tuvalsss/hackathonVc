import { ethers } from "hardhat";

const ROUTER_ABI = [
  "function getSubscription(uint64 subscriptionId) view returns (uint96 balance, uint96 blockedBalance, address owner, address[] consumers, bytes32 flags)"
];

async function main() {
  const [signer] = await ethers.getSigners();
  const router = new ethers.Contract("0xb83E47C2bC239B3bf370bc41e1459A34b41238D0", ROUTER_ABI, signer);
  
  try {
    const sub = await router.getSubscription(6239);
    console.log("Subscription 6239:");
    console.log("  Balance:", ethers.formatUnits(sub.balance, 18), "LINK");
    console.log("  Blocked:", ethers.formatUnits(sub.blockedBalance, 18), "LINK");
    console.log("  Owner:", sub.owner);
    console.log("  Consumers:", sub.consumers);
  } catch (e: any) {
    console.log("Error:", e.message);
    
    // Try alternative method
    const altABI = [
      "function getSubscription(uint64) view returns (tuple(uint96,uint96,address,address[],bytes32))"
    ];
    const router2 = new ethers.Contract("0xb83E47C2bC239B3bf370bc41e1459A34b41238D0", altABI, signer);
    const sub = await router2.getSubscription(6239);
    console.log("\nAlternative decode:");
    console.log(sub);
  }
}
main().catch(console.error);
