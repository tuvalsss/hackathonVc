/**
 * Decision Engine Service
 * Demonstrates CRE Compute capability by applying decision logic off-chain
 */

import { PriceData } from "./dataFetcher";
import { logger } from "../utils/logger";

export interface DecisionResult {
  aggregatedETHPrice: number;
  aggregatedBTCPrice: number;
  ethDeviation: number;
  btcDeviation: number;
  score: number;
  thresholdTriggered: boolean;
  reason: string;
  shouldExecute: boolean;
}

// State storage for tracking previous values
let previousState: {
  ethPrice: number;
  btcPrice: number;
  timestamp: number;
} | null = null;

/**
 * Calculate price deviation between two sources (as percentage)
 */
function calculateDeviation(price1: number, price2: number): number {
  if (price1 === 0 || price2 === 0) return 0;
  return Math.abs(price1 - price2) / Math.min(price1, price2) * 100;
}

/**
 * Calculate percentage change from previous price
 */
function calculateChange(currentPrice: number, previousPrice: number): number {
  if (previousPrice === 0) return 0;
  return Math.abs(currentPrice - previousPrice) / previousPrice * 100;
}

/**
 * Main decision calculation function
 * 
 * Scoring Logic:
 * - Base score starts at 50
 * - +20 points if source deviation > 1% (potential arbitrage)
 * - +20 points if price change from last update > 2%
 * - +10 points if 24h change > 5%
 * - Score capped at 100
 */
export function calculateDecision(
  priceData: PriceData,
  threshold: number = 75
): DecisionResult {
  logger.debug("Calculating decision...");

  // Calculate aggregated prices (average of sources)
  const aggregatedETHPrice = (priceData.ethPriceCoinGecko + priceData.ethPriceCoinCap) / 2;
  const aggregatedBTCPrice = (priceData.btcPriceCoinGecko + priceData.btcPriceCoinCap) / 2;

  // Calculate deviation between sources
  const ethDeviation = calculateDeviation(
    priceData.ethPriceCoinGecko,
    priceData.ethPriceCoinCap
  );
  const btcDeviation = calculateDeviation(
    priceData.btcPriceCoinGecko,
    priceData.btcPriceCoinCap
  );

  // Calculate change from previous state
  let priceChange = 0;
  if (previousState) {
    const ethChange = calculateChange(aggregatedETHPrice, previousState.ethPrice);
    const btcChange = calculateChange(aggregatedBTCPrice, previousState.btcPrice);
    priceChange = Math.max(ethChange, btcChange);
  }

  // Build reasoning
  const reasons: string[] = [];
  let score = 50; // Base score

  // Factor 1: Source deviation (potential arbitrage opportunity)
  if (ethDeviation > 1 || btcDeviation > 1) {
    score += 20;
    reasons.push(`High source deviation (ETH: ${ethDeviation.toFixed(2)}%, BTC: ${btcDeviation.toFixed(2)}%)`);
  }

  // Factor 2: Price change since last update
  if (priceChange > 2) {
    score += 20;
    reasons.push(`Significant price movement (${priceChange.toFixed(2)}% since last update)`);
  }

  // Factor 3: 24-hour volatility
  const maxChange24h = Math.max(
    Math.abs(priceData.ethChange24h),
    Math.abs(priceData.btcChange24h)
  );
  if (maxChange24h > 5) {
    score += 10;
    reasons.push(`High 24h volatility (${maxChange24h.toFixed(2)}%)`);
  }

  // Factor 4: First run bonus (always execute first time)
  const isFirstRun = previousState === null;
  if (isFirstRun) {
    score = Math.max(score, threshold); // Ensure first run triggers
    reasons.push("Initial state update");
  }

  // Cap score at 100
  score = Math.min(score, 100);

  // Determine if threshold is triggered
  const thresholdTriggered = score >= threshold;

  // Build final reason string
  const reason = reasons.length > 0 
    ? reasons.join("; ") 
    : "Normal market conditions";

  // Update previous state for next calculation
  previousState = {
    ethPrice: aggregatedETHPrice,
    btcPrice: aggregatedBTCPrice,
    timestamp: priceData.timestamp,
  };

  const result: DecisionResult = {
    aggregatedETHPrice,
    aggregatedBTCPrice,
    ethDeviation,
    btcDeviation,
    score,
    thresholdTriggered,
    reason,
    shouldExecute: thresholdTriggered || isFirstRun,
  };

  logger.debug(`Decision result: score=${score}, triggered=${thresholdTriggered}`);
  
  return result;
}

/**
 * Reset the decision engine state (for testing)
 */
export function resetDecisionState(): void {
  previousState = null;
  logger.debug("Decision state reset");
}

/**
 * Get the current previous state (for debugging)
 */
export function getPreviousState() {
  return previousState;
}
