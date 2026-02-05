/**
 * AutoSentinel CRE Workflow
 * 
 * This workflow demonstrates Chainlink Runtime Environment capabilities:
 * 1. HTTP Fetch - Pull data from multiple APIs
 * 2. Compute - Apply decision logic off-chain
 * 3. Chain Write - Execute on-chain transaction when threshold met
 */

import { fetchPriceData, PriceData } from "./services/dataFetcher";
import { calculateDecision, DecisionResult } from "./services/decisionEngine";
import { executeOnChain, TransactionResult } from "./services/chainWriter";
import { getConfig, WorkflowConfig } from "./config";
import { logger } from "./utils/logger";

interface WorkflowResult {
  success: boolean;
  timestamp: number;
  priceData: PriceData | null;
  decision: DecisionResult | null;
  transaction: TransactionResult | null;
  error?: string;
}

/**
 * Main CRE Workflow Execution
 * Simulates CRE workflow steps: Fetch -> Compute -> Execute
 */
async function runWorkflow(): Promise<WorkflowResult> {
  const timestamp = Date.now();
  logger.info("=".repeat(60));
  logger.info("AutoSentinel CRE Workflow Started");
  logger.info("=".repeat(60));
  logger.info(`Timestamp: ${new Date(timestamp).toISOString()}`);

  const config = getConfig();
  
  try {
    // ============================================
    // STEP 1: FETCH DATA (CRE http_fetch capability)
    // ============================================
    logger.info("\n--- Step 1: Fetching Price Data ---");
    const priceData = await fetchPriceData();
    
    if (!priceData) {
      throw new Error("Failed to fetch price data from any source");
    }
    
    logger.info(`ETH Price (CoinGecko): $${priceData.ethPriceCoinGecko}`);
    logger.info(`ETH Price (CoinCap): $${priceData.ethPriceCoinCap}`);
    logger.info(`BTC Price (CoinGecko): $${priceData.btcPriceCoinGecko}`);
    logger.info(`BTC Price (CoinCap): $${priceData.btcPriceCoinCap}`);

    // ============================================
    // STEP 2: COMPUTE DECISION (CRE compute capability)
    // ============================================
    logger.info("\n--- Step 2: Computing Decision ---");
    const decision = calculateDecision(priceData, config.threshold);
    
    logger.info(`Aggregated ETH Price: $${decision.aggregatedETHPrice.toFixed(2)}`);
    logger.info(`Aggregated BTC Price: $${decision.aggregatedBTCPrice.toFixed(2)}`);
    logger.info(`ETH Source Deviation: ${decision.ethDeviation.toFixed(4)}%`);
    logger.info(`BTC Source Deviation: ${decision.btcDeviation.toFixed(4)}%`);
    logger.info(`Decision Score: ${decision.score}/100`);
    logger.info(`Threshold (${config.threshold}): ${decision.thresholdTriggered ? "TRIGGERED" : "Not triggered"}`);
    logger.info(`Reason: ${decision.reason}`);

    // ============================================
    // STEP 3: EXECUTE ON-CHAIN (CRE chain_write capability)
    // ============================================
    logger.info("\n--- Step 3: On-Chain Execution ---");
    
    let transaction: TransactionResult | null = null;
    
    if (decision.shouldExecute) {
      logger.info("Threshold met or first run - executing on-chain update...");
      transaction = await executeOnChain(priceData, decision);
      
      if (transaction.success) {
        logger.info(`Transaction Hash: ${transaction.txHash}`);
        logger.info(`Block Number: ${transaction.blockNumber}`);
        logger.info(`Gas Used: ${transaction.gasUsed}`);
        logger.info(`Explorer: ${config.explorerUrl}/tx/${transaction.txHash}`);
      } else {
        logger.error(`Transaction failed: ${transaction.error}`);
      }
    } else {
      logger.info("Threshold not met - skipping on-chain execution");
      logger.info("(This saves gas by only updating when meaningful)");
    }

    // ============================================
    // WORKFLOW COMPLETE
    // ============================================
    logger.info("\n" + "=".repeat(60));
    logger.info("Workflow Completed Successfully");
    logger.info("=".repeat(60));

    return {
      success: true,
      timestamp,
      priceData,
      decision,
      transaction,
    };

  } catch (error: any) {
    logger.error("\n" + "=".repeat(60));
    logger.error("Workflow Failed");
    logger.error("=".repeat(60));
    logger.error(`Error: ${error.message}`);

    return {
      success: false,
      timestamp,
      priceData: null,
      decision: null,
      transaction: null,
      error: error.message,
    };
  }
}

/**
 * Run workflow with interval (for continuous monitoring demo)
 */
async function runContinuousWorkflow(intervalMs: number = 300000): Promise<void> {
  logger.info(`Starting continuous workflow with ${intervalMs / 1000}s interval`);
  
  // Run immediately
  await runWorkflow();
  
  // Then run at interval
  setInterval(async () => {
    await runWorkflow();
  }, intervalMs);
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes("--continuous")) {
    const interval = parseInt(args[args.indexOf("--interval") + 1]) || 300000;
    runContinuousWorkflow(interval);
  } else {
    runWorkflow()
      .then((result) => {
        console.log("\nWorkflow Result:");
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.success ? 0 : 1);
      })
      .catch((error) => {
        console.error("Fatal error:", error);
        process.exit(1);
      });
  }
}

export { runWorkflow, runContinuousWorkflow, WorkflowResult };
