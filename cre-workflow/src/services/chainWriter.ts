/**
 * Chain Writer Service
 * Demonstrates CRE Chain Write capability by executing on-chain transactions
 */

import { ethers } from "ethers";
import { PriceData } from "./dataFetcher";
import { DecisionResult } from "./decisionEngine";
import { getConfig } from "../config";
import { logger } from "../utils/logger";

// AutoSentinel ABI (minimal for interaction)
const AUTO_SENTINEL_ABI = [
  "function updateSentinelState(uint256 _priceETH, uint256 _priceBTC, uint256 _aggregatedScore, bool _thresholdTriggered, string calldata _decisionReason) external",
  "function getLatestState() external view returns (tuple(uint256 timestamp, uint256 priceETH, uint256 priceBTC, uint256 aggregatedScore, bool thresholdTriggered, string decisionReason))",
  "function getStatistics() external view returns (uint256 _totalUpdates, uint256 _totalThresholdTriggers, uint256 _currentThreshold, uint256 _lastUpdateTime)",
  "event StateUpdated(uint256 indexed timestamp, uint256 priceETH, uint256 priceBTC, uint256 aggregatedScore, bool thresholdTriggered)",
  "event ThresholdTriggered(uint256 indexed timestamp, string reason, uint256 score)",
];

export interface TransactionResult {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  error?: string;
}

/**
 * Convert USD price to contract format (8 decimals)
 * e.g., $2450.32 -> 245032000000
 */
function priceToContractFormat(price: number): bigint {
  return BigInt(Math.round(price * 100000000)); // 8 decimals
}

/**
 * Execute on-chain state update
 */
export async function executeOnChain(
  priceData: PriceData,
  decision: DecisionResult
): Promise<TransactionResult> {
  const config = getConfig();

  try {
    // Validate configuration
    if (!config.contractAddress) {
      throw new Error("CONTRACT_ADDRESS not configured");
    }
    if (!config.privateKey) {
      throw new Error("PRIVATE_KEY not configured");
    }

    logger.debug(`Connecting to ${config.rpcUrl}...`);

    // Create provider and wallet
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const wallet = new ethers.Wallet(config.privateKey, provider);

    logger.debug(`Wallet address: ${wallet.address}`);

    // Create contract instance
    const contract = new ethers.Contract(
      config.contractAddress,
      AUTO_SENTINEL_ABI,
      wallet
    );

    // Prepare parameters
    const priceETH = priceToContractFormat(decision.aggregatedETHPrice);
    const priceBTC = priceToContractFormat(decision.aggregatedBTCPrice);
    const score = BigInt(decision.score);
    const triggered = decision.thresholdTriggered;
    const reason = decision.reason;

    logger.debug(`Calling updateSentinelState...`);
    logger.debug(`  priceETH: ${priceETH.toString()}`);
    logger.debug(`  priceBTC: ${priceBTC.toString()}`);
    logger.debug(`  score: ${score}`);
    logger.debug(`  triggered: ${triggered}`);
    logger.debug(`  reason: ${reason}`);

    // Estimate gas first
    const gasEstimate = await contract.updateSentinelState.estimateGas(
      priceETH,
      priceBTC,
      score,
      triggered,
      reason
    );
    logger.debug(`Gas estimate: ${gasEstimate.toString()}`);

    // Execute transaction
    const tx = await contract.updateSentinelState(
      priceETH,
      priceBTC,
      score,
      triggered,
      reason,
      {
        gasLimit: gasEstimate * 120n / 100n, // 20% buffer
      }
    );

    logger.debug(`Transaction sent: ${tx.hash}`);
    logger.debug("Waiting for confirmation...");

    // Wait for confirmation
    const receipt = await tx.wait();

    logger.debug(`Transaction confirmed in block ${receipt.blockNumber}`);

    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    };
  } catch (error: any) {
    logger.error(`Chain write failed: ${error.message}`);

    // Parse common errors
    let errorMessage = error.message;
    if (error.message.includes("insufficient funds")) {
      errorMessage = "Insufficient funds for gas";
    } else if (error.message.includes("nonce")) {
      errorMessage = "Nonce error - transaction may be pending";
    } else if (error.message.includes("update too frequent")) {
      errorMessage = "Rate limited - wait before next update";
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Read current state from contract (for verification)
 */
export async function readCurrentState(): Promise<any> {
  const config = getConfig();

  try {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const contract = new ethers.Contract(
      config.contractAddress,
      AUTO_SENTINEL_ABI,
      provider
    );

    const state = await contract.getLatestState();
    const stats = await contract.getStatistics();

    return {
      currentState: {
        timestamp: Number(state.timestamp),
        priceETH: Number(state.priceETH) / 100000000,
        priceBTC: Number(state.priceBTC) / 100000000,
        score: Number(state.aggregatedScore),
        thresholdTriggered: state.thresholdTriggered,
        reason: state.decisionReason,
      },
      statistics: {
        totalUpdates: Number(stats._totalUpdates),
        totalTriggers: Number(stats._totalThresholdTriggers),
        threshold: Number(stats._currentThreshold),
        lastUpdateTime: Number(stats._lastUpdateTime),
      },
    };
  } catch (error: any) {
    logger.error(`Failed to read state: ${error.message}`);
    return null;
  }
}

/**
 * Simulate transaction without executing (for testing)
 */
export async function simulateTransaction(
  priceData: PriceData,
  decision: DecisionResult
): Promise<{ success: boolean; gasEstimate?: string; error?: string }> {
  const config = getConfig();

  try {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const wallet = new ethers.Wallet(config.privateKey, provider);
    const contract = new ethers.Contract(
      config.contractAddress,
      AUTO_SENTINEL_ABI,
      wallet
    );

    const priceETH = priceToContractFormat(decision.aggregatedETHPrice);
    const priceBTC = priceToContractFormat(decision.aggregatedBTCPrice);

    const gasEstimate = await contract.updateSentinelState.estimateGas(
      priceETH,
      priceBTC,
      BigInt(decision.score),
      decision.thresholdTriggered,
      decision.reason
    );

    return {
      success: true,
      gasEstimate: gasEstimate.toString(),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}
