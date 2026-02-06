import { ethers } from 'hardhat';
import fs from 'fs';

async function main() {
  const CONTRACT_ADDRESS = '0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4';
  const sourceCode = fs.readFileSync('chainlink-functions/source.js', 'utf8');
  
  const contract = await ethers.getContractAt('AutoSentinelFunctions', CONTRACT_ADDRESS);
  
  console.log('Updating Chainlink Functions source code...');
  const tx = await contract.updateJavaScriptSource(sourceCode);
  console.log('Transaction sent:', tx.hash);
  
  await tx.wait();
  console.log('✅ Source code updated successfully');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
