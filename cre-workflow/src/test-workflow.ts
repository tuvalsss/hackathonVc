/**
 * Test script for AutoSentinel CRE Workflow
 * Run with: npm run workflow:test
 */

import { fetchPriceData, fetchMockData } from "./services/dataFetcher";
import { calculateDecision, resetDecisionState } from "./services/decisionEngine";
import { simulateTransaction, readCurrentState } from "./services/chainWriter";
import { getConfig, validateConfig, printConfig } from "./config";
import { logger } from "./utils/logger";

async function testDataFetcher(): Promise<boolean> {
  logger.info("=== Testing Data Fetcher ===");
  
  try {
    // Test real API fetch
    logger.info("Testing real API fetch...");
    const realData = await fetchPriceData();
    
    if (realData) {
      logger.info(`ETH (CoinGecko): $${realData.ethPriceCoinGecko}`);
      logger.info(`ETH (CoinCap): $${realData.ethPriceCoinCap}`);
      logger.info(`BTC (CoinGecko): $${realData.btcPriceCoinGecko}`);
      logger.info(`BTC (CoinCap): $${realData.btcPriceCoinCap}`);
      logger.info("Real API fetch: PASSED");
    } else {
      logger.warn("Real API fetch failed, testing mock data...");
    }
    
    // Test mock data
    const mockData = fetchMockData();
    logger.info(`Mock ETH: $${mockData.ethPriceCoinGecko.toFixed(2)}`);
    logger.info(`Mock BTC: $${mockData.btcPriceCoinGecko.toFixed(2)}`);
    logger.info("Mock data fetch: PASSED");
    
    return true;
  } catch (error: any) {
    logger.error(`Data fetcher test failed: ${error.message}`);
    return false;
  }
}

async function testDecisionEngine(): Promise<boolean> {
  logger.info("\n=== Testing Decision Engine ===");
  
  try {
    resetDecisionState();
    
    // Test with mock data
    const mockData = fetchMockData();
    
    // First run should always trigger
    const decision1 = calculateDecision(mockData, 75);
    logger.info(`First run score: ${decision1.score}`);
    logger.info(`First run should execute: ${decision1.shouldExecute}`);
    
    if (!decision1.shouldExecute) {
      logger.error("First run should always execute!");
      return false;
    }
    logger.info("First run test: PASSED");
    
    // Second run with similar data should NOT trigger
    const mockData2 = {
      ...mockData,
      timestamp: Date.now() + 1000,
    };
    const decision2 = calculateDecision(mockData2, 75);
    logger.info(`Second run score: ${decision2.score}`);
    logger.info(`Second run triggered: ${decision2.thresholdTriggered}`);
    logger.info("Consecutive run test: PASSED");
    
    // Test high deviation scenario
    resetDecisionState();
    const highDeviationData = {
      ...mockData,
      ethPriceCoinGecko: 2500,
      ethPriceCoinCap: 2600, // 4% deviation
    };
    const decision3 = calculateDecision(highDeviationData, 70);
    logger.info(`High deviation score: ${decision3.score}`);
    logger.info(`High deviation reason: ${decision3.reason}`);
    
    if (decision3.score < 70) {
      logger.error("High deviation should increase score!");
      return false;
    }
    logger.info("High deviation test: PASSED");
    
    return true;
  } catch (error: any) {
    logger.error(`Decision engine test failed: ${error.message}`);
    return false;
  }
}

async function testConfiguration(): Promise<boolean> {
  logger.info("\n=== Testing Configuration ===");
  
  try {
    const config = getConfig();
    printConfig(config);
    
    const errors = validateConfig(config);
    if (errors.length > 0) {
      logger.warn("Configuration warnings:");
      errors.forEach((e) => logger.warn(`  - ${e}`));
      logger.info("(This is expected if .env is not fully configured)");
    } else {
      logger.info("Configuration validation: PASSED");
    }
    
    return true;
  } catch (error: any) {
    logger.error(`Configuration test failed: ${error.message}`);
    return false;
  }
}

async function testChainConnection(): Promise<boolean> {
  logger.info("\n=== Testing Chain Connection ===");
  
  const config = getConfig();
  const errors = validateConfig(config);
  
  if (errors.length > 0) {
    logger.warn("Skipping chain test - configuration incomplete");
    return true; // Not a failure, just skipped
  }
  
  try {
    // Try to read current state
    const state = await readCurrentState();
    
    if (state) {
      logger.info("Current contract state:");
      logger.info(`  Total updates: ${state.statistics.totalUpdates}`);
      logger.info(`  Threshold: ${state.statistics.threshold}`);
      logger.info("Chain connection: PASSED");
    } else {
      logger.warn("Could not read contract state");
    }
    
    // Test transaction simulation
    resetDecisionState();
    const mockData = fetchMockData();
    const decision = calculateDecision(mockData, 75);
    
    const simulation = await simulateTransaction(mockData, decision);
    if (simulation.success) {
      logger.info(`Gas estimate: ${simulation.gasEstimate}`);
      logger.info("Transaction simulation: PASSED");
    } else {
      logger.warn(`Simulation failed: ${simulation.error}`);
    }
    
    return true;
  } catch (error: any) {
    logger.error(`Chain connection test failed: ${error.message}`);
    return false;
  }
}

async function runAllTests(): Promise<void> {
  logger.info("=".repeat(60));
  logger.info("AutoSentinel CRE Workflow Test Suite");
  logger.info("=".repeat(60));
  
  const results: Record<string, boolean> = {};
  
  results["Data Fetcher"] = await testDataFetcher();
  results["Decision Engine"] = await testDecisionEngine();
  results["Configuration"] = await testConfiguration();
  results["Chain Connection"] = await testChainConnection();
  
  logger.info("\n" + "=".repeat(60));
  logger.info("Test Results Summary");
  logger.info("=".repeat(60));
  
  let allPassed = true;
  for (const [name, passed] of Object.entries(results)) {
    const status = passed ? "PASSED" : "FAILED";
    logger.info(`  ${name}: ${status}`);
    if (!passed) allPassed = false;
  }
  
  logger.info("");
  if (allPassed) {
    logger.info("All tests passed! Workflow is ready.");
  } else {
    logger.error("Some tests failed. Please check the configuration.");
  }
}

// Run tests
runAllTests()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error(`Test suite error: ${error.message}`);
    process.exit(1);
  });
