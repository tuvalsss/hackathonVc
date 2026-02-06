import { ethers } from 'hardhat';

async function main() {
  const CONTRACT_ADDRESS = '0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4';
  const abi = [
    'function getStatistics() external view returns (uint256 _totalUpdates, uint256 _totalThresholdTriggers, uint256 _totalRequests, uint256 _currentThreshold, uint256 _lastUpdateTime, bytes32 _lastRequestId)',
    'function getRequestStatus(bytes32 requestId) external view returns (tuple(bool exists, bool fulfilled, bytes response, bytes err, uint256 timestamp, address requester))',
    'function getLatestState() external view returns (tuple(uint256 timestamp, uint256 priceETH, uint256 priceBTC, uint256 aggregatedScore, bool thresholdTriggered, string decisionReason, string dataSources, bytes32 requestId))'
  ];
  
  const contract = await ethers.getContractAt(abi, CONTRACT_ADDRESS);
  
  console.log('\n📊 Contract Statistics:');
  const stats = await contract.getStatistics();
  console.log('  Total Requests:', stats._totalRequests.toString());
  console.log('  Total Updates:', stats._totalUpdates.toString());
  console.log('  Last Request ID:', stats._lastRequestId);
  
  console.log('\n📝 Latest State:');
  const state = await contract.getLatestState();
  console.log('  Timestamp:', new Date(Number(state.timestamp) * 1000).toISOString());
  console.log('  ETH Price:', (Number(state.priceETH) / 100).toFixed(2), 'USD');
  console.log('  BTC Price:', (Number(state.priceBTC) / 100).toFixed(2), 'USD');
  console.log('  Score:', state.aggregatedScore.toString());
  console.log('  Triggered:', state.thresholdTriggered);
  console.log('  Reason:', state.decisionReason);
  console.log('  Sources:', state.dataSources);
  
  if (stats._lastRequestId !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
    console.log('\n🔍 Last Request Status:');
    const reqStatus = await contract.getRequestStatus(stats._lastRequestId);
    console.log('  Exists:', reqStatus.exists);
    console.log('  Fulfilled:', reqStatus.fulfilled);
    console.log('  Response length:', reqStatus.response.length);
    console.log('  Error:', reqStatus.err);
    
    if (!reqStatus.fulfilled) {
      console.log('\n⚠️  Last request NOT fulfilled yet!');
    } else {
      console.log('\n✅ Last request was fulfilled');
    }
  }
}

main();
