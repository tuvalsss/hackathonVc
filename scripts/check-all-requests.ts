import { ethers } from "hardhat";

async function main() {
  const contract = await ethers.getContractAt("AutoSentinelFunctions", "0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4");
  
  const requests = await contract.getRecentRequests(10);
  console.log("Recent requests:", requests.length);
  
  for (const reqId of requests) {
    try {
      const status = await contract.getRequestStatus(reqId);
      console.log("\n" + reqId.slice(0, 20) + "...");
      console.log("  Fulfilled:", status.fulfilled);
      console.log("  Response len:", status.response.length);
      console.log("  Error len:", status.err.length);
      if (status.fulfilled && status.response.length > 2) {
        try {
          console.log("  Response:", ethers.toUtf8String(status.response));
        } catch {
          console.log("  Response (hex):", status.response);
        }
      }
      if (status.fulfilled && status.err.length > 2) {
        try {
          console.log("  Error:", ethers.toUtf8String(status.err));
        } catch {
          console.log("  Error (hex):", status.err);
        }
      }
    } catch (e: any) {
      console.log("Error getting status:", e.message);
    }
  }
}
main().catch(console.error);
