import { ethers } from 'hardhat';

async function main() {
  const ROUTER_ADDRESS = '0xb83E47C2bC239B3bf370bc41e1459A34b41238D0';
  const SUBSCRIPTION_ID = 6239;
  
  const routerAbi = [
    'function getSubscription(uint64 subscriptionId) external view returns (uint96 balance, uint96 reqCount, address owner, address[] memory consumers)'
  ];
  
  const router = await ethers.getContractAt(routerAbi, ROUTER_ADDRESS);
  
  try {
    const sub = await router.getSubscription(SUBSCRIPTION_ID);
    console.log('\n📊 Subscription Status:');
    console.log('  Balance (LINK):', ethers.formatEther(sub.balance));
    console.log('  Request Count:', sub.reqCount.toString());
    console.log('  Owner:', sub.owner);
    console.log('  Consumers:', sub.consumers.length);
    
    const balanceNum = parseFloat(ethers.formatEther(sub.balance));
    if (balanceNum < 0.5) {
      console.log('\n⚠️  WARNING: Low LINK balance! Need to refill.');
    } else {
      console.log('\n✅ Sufficient LINK balance');
    }
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

main();
