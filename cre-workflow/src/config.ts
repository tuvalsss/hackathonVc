/**
 * Configuration for AutoSentinel CRE Workflow
 */

import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: "../../.env" });
dotenv.config(); // Also check current directory

export interface WorkflowConfig {
  // Network configuration
  rpcUrl: string;
  chainId: number;
  explorerUrl: string;
  
  // Contract configuration
  contractAddress: string;
  privateKey: string;
  
  // Workflow parameters
  threshold: number;
  updateIntervalMs: number;
  
  // API configuration
  coinGeckoEnabled: boolean;
  coinCapEnabled: boolean;
  
  // Debug settings
  debug: boolean;
  dryRun: boolean;
}

const DEFAULT_CONFIG: WorkflowConfig = {
  // Sepolia testnet defaults
  rpcUrl: "https://sepolia.infura.io/v3/YOUR_KEY",
  chainId: 11155111,
  explorerUrl: "https://sepolia.etherscan.io",
  
  // Must be set via environment
  contractAddress: "",
  privateKey: "",
  
  // Workflow defaults
  threshold: 75,
  updateIntervalMs: 300000, // 5 minutes
  
  // API defaults
  coinGeckoEnabled: true,
  coinCapEnabled: true,
  
  // Debug defaults
  debug: false,
  dryRun: false,
};

/**
 * Get configuration from environment variables
 */
export function getConfig(): WorkflowConfig {
  const infuraKey = process.env.INFURA_KEY || "";
  const alchemyKey = process.env.ALCHEMY_KEY || "";
  
  // Determine RPC URL
  let rpcUrl = DEFAULT_CONFIG.rpcUrl;
  if (infuraKey) {
    rpcUrl = `https://sepolia.infura.io/v3/${infuraKey}`;
  } else if (alchemyKey) {
    rpcUrl = `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`;
  } else if (process.env.RPC_URL) {
    rpcUrl = process.env.RPC_URL;
  }

  return {
    // Network
    rpcUrl,
    chainId: parseInt(process.env.CHAIN_ID || "11155111"),
    explorerUrl: process.env.EXPLORER_URL || DEFAULT_CONFIG.explorerUrl,
    
    // Contract
    contractAddress: process.env.CONTRACT_ADDRESS || DEFAULT_CONFIG.contractAddress,
    privateKey: process.env.PRIVATE_KEY || DEFAULT_CONFIG.privateKey,
    
    // Workflow
    threshold: parseInt(process.env.THRESHOLD || "75"),
    updateIntervalMs: parseInt(process.env.UPDATE_INTERVAL_MS || "300000"),
    
    // API
    coinGeckoEnabled: process.env.COINGECKO_ENABLED !== "false",
    coinCapEnabled: process.env.COINCAP_ENABLED !== "false",
    
    // Debug
    debug: process.env.DEBUG === "true",
    dryRun: process.env.DRY_RUN === "true",
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: WorkflowConfig): string[] {
  const errors: string[] = [];
  
  if (!config.contractAddress) {
    errors.push("CONTRACT_ADDRESS is required");
  }
  
  if (!config.privateKey) {
    errors.push("PRIVATE_KEY is required");
  }
  
  if (!config.rpcUrl || config.rpcUrl.includes("YOUR_KEY")) {
    errors.push("Valid RPC_URL (or INFURA_KEY/ALCHEMY_KEY) is required");
  }
  
  if (config.threshold < 0 || config.threshold > 100) {
    errors.push("THRESHOLD must be between 0 and 100");
  }
  
  return errors;
}

/**
 * Print configuration (hiding sensitive values)
 */
export function printConfig(config: WorkflowConfig): void {
  console.log("Configuration:");
  console.log(`  RPC URL: ${config.rpcUrl.substring(0, 30)}...`);
  console.log(`  Chain ID: ${config.chainId}`);
  console.log(`  Contract: ${config.contractAddress || "(not set)"}`);
  console.log(`  Threshold: ${config.threshold}`);
  console.log(`  Update Interval: ${config.updateIntervalMs / 1000}s`);
  console.log(`  Debug: ${config.debug}`);
  console.log(`  Dry Run: ${config.dryRun}`);
}
