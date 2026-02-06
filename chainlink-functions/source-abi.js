// ABI encode the result as expected by the contract
const price = 280000000000;  // $2800 * 1e8
const btcPrice = 9500000000000;  // $95000 * 1e8
const score = 80;
const triggered = true;
const reason = "Demo execution";
const sources = "DON";

// Manually ABI encode: (uint256, uint256, uint256, bool, string, string)
const abiCoder = new ethers.utils.AbiCoder();
const encoded = abiCoder.encode(
  ["uint256", "uint256", "uint256", "bool", "string", "string"],
  [price, btcPrice, score, triggered, reason, sources]
);

return encoded;
