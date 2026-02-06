import { ethers } from "hardhat";

async function main() {
  const contract = await ethers.getContractAt("AutoSentinelFunctions", "0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4");
  const requestId = "0x2ff6628b66258c170a85946ce22d2b42f11d29f66f1431ea91eba9d788305d7a";
  
  const status = await contract.getRequestStatus(requestId);
  console.log("Exists:", status.exists);
  console.log("Fulfilled:", status.fulfilled);
  console.log("Response length:", status.response.length);
  console.log("Error length:", status.err.length);
  console.log("Timestamp:", status.timestamp.toString());
  console.log("Requester:", status.requester);
  
  if (status.response.length > 0) {
    try {
      console.log("Response (string):", ethers.toUtf8String(status.response));
    } catch {
      console.log("Response (hex):", status.response);
    }
  }
  
  if (status.err.length > 0) {
    try {
      console.log("Error (string):", ethers.toUtf8String(status.err));
    } catch {
      console.log("Error (hex):", status.err);
    }
  }
  
  // Also check source code
  const src = await contract.sourceCode();
  console.log("\nSource code:");
  console.log(src);
}
main().catch(console.error);
