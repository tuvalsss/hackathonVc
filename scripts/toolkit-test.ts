import { ethers } from "hardhat";
import {
  SubscriptionManager,
  simulateScript,
  ResponseListener,
  ReturnType,
  decodeResult,
} from "@chainlink/functions-toolkit";

const routerAddress = "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0";
const donId = "fun-ethereum-sepolia-1";
const subscriptionId = 6239;
const contractAddress = "0x2fF07e0213Bf4653C7B2f5b1e71f3d04be6005C4";

// Simple test source
const source = `return Functions.encodeString("hello world");`;

async function main() {
  const [signer] = await ethers.getSigners();
  
  console.log("Testing Chainlink Functions with toolkit...\n");
  console.log("Signer:", await signer.getAddress());
  
  // 1. First, simulate locally
  console.log("\n1. Simulating locally...");
  try {
    const result = await simulateScript({
      source,
      args: ["75"],
      bytesArgs: [],
      secrets: {},
    });
    console.log("Simulation result:", result);
    if (result.responseBytesHexstring) {
      const decoded = decodeResult(result.responseBytesHexstring, ReturnType.string);
      console.log("Decoded:", decoded);
    }
  } catch (e: any) {
    console.log("Simulation error:", e.message);
  }
  
  // 2. Send actual request via contract
  console.log("\n2. Sending request via contract...");
  const contract = await ethers.getContractAt("AutoSentinelFunctions", contractAddress);
  
  // Set source
  console.log("Setting source code...");
  const tx1 = await contract.setSourceCode(source);
  await tx1.wait();
  console.log("Source set!");
  
  // Send request
  console.log("Sending request...");
  const tx2 = await contract.sendRequest();
  const receipt = await tx2.wait();
  console.log("Request TX:", tx2.hash);
  
  // Get request ID from logs
  let requestId = "";
  for (const log of receipt!.logs) {
    try {
      const parsed = contract.interface.parseLog(log as any);
      if (parsed?.name === "RequestSent") {
        requestId = parsed.args.requestId;
      }
    } catch {}
  }
  console.log("Request ID:", requestId);
  
  // 3. Listen for response
  console.log("\n3. Waiting for response...");
  const provider = signer.provider!;
  const responseListener = new ResponseListener({
    provider,
    functionsRouterAddress: routerAddress,
  });
  
  try {
    const response = await responseListener.listenForResponseFromTransaction(tx2.hash);
    console.log("\nResponse received!");
    console.log("Response:", response);
    
    if (response.errorString) {
      console.log("Error:", response.errorString);
    }
    if (response.responseBytesHexstring && response.responseBytesHexstring !== "0x") {
      const decoded = decodeResult(response.responseBytesHexstring, ReturnType.string);
      console.log("Decoded response:", decoded);
    }
  } catch (e: any) {
    console.log("Listener error:", e.message);
  }
}

main().catch(console.error);
