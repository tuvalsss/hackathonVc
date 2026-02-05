/**
 * AutoSentinel - Chainlink Functions Source Code
 * 
 * This JavaScript code runs on the Chainlink Decentralized Oracle Network (DON)
 * as part of the Chainlink Runtime Environment (CRE).
 * 
 * Workflow:
 * 1. Fetch ETH and BTC prices from CoinGecko API
 * 2. Fetch ETH and BTC prices from CoinCap API
 * 3. Aggregate data from multiple sources
 * 4. Calculate decision score based on deviation and volatility
 * 5. Return encoded result for on-chain storage
 * 
 * Arguments:
 * - args[0]: threshold (number 0-100, default 75)
 */

// Get threshold from arguments (passed from smart contract)
const threshold = parseInt(args[0]) || 75;

// Fetch data from multiple sources in parallel
const [geckoResponse, capResponse] = await Promise.all([
  Functions.makeHttpRequest({
    url: "https://api.coingecko.com/api/v3/simple/price",
    params: {
      ids: "ethereum,bitcoin",
      vs_currencies: "usd",
      include_24hr_change: "true"
    }
  }),
  Functions.makeHttpRequest({
    url: "https://api.coincap.io/v2/assets",
    params: {
      ids: "ethereum,bitcoin"
    }
  })
]);

// Initialize price variables
let ethPriceCoinGecko = 0;
let btcPriceCoinGecko = 0;
let ethPriceCoinCap = 0;
let btcPriceCoinCap = 0;
let ethChange24h = 0;
let btcChange24h = 0;
let sources = [];

// Process CoinGecko response
if (!geckoResponse.error && geckoResponse.data) {
  const data = geckoResponse.data;
  ethPriceCoinGecko = data.ethereum?.usd || 0;
  btcPriceCoinGecko = data.bitcoin?.usd || 0;
  ethChange24h = data.ethereum?.usd_24h_change || 0;
  btcChange24h = data.bitcoin?.usd_24h_change || 0;
  
  if (ethPriceCoinGecko > 0) {
    sources.push("CoinGecko");
  }
}

// Process CoinCap response
if (!capResponse.error && capResponse.data?.data) {
  const assets = capResponse.data.data;
  const eth = assets.find(a => a.id === "ethereum");
  const btc = assets.find(a => a.id === "bitcoin");
  
  ethPriceCoinCap = eth ? parseFloat(eth.priceUsd) : 0;
  btcPriceCoinCap = btc ? parseFloat(btc.priceUsd) : 0;
  
  if (ethPriceCoinCap > 0) {
    sources.push("CoinCap");
  }
}

// Validate we have at least one source
if (sources.length === 0) {
  throw new Error("Failed to fetch prices from any source");
}

// Calculate aggregated prices
const avgEthPrice = (ethPriceCoinGecko + ethPriceCoinCap) / 
  (ethPriceCoinGecko > 0 && ethPriceCoinCap > 0 ? 2 : 1);
const avgBtcPrice = (btcPriceCoinGecko + btcPriceCoinCap) / 
  (btcPriceCoinGecko > 0 && btcPriceCoinCap > 0 ? 2 : 1);

// Calculate price deviation between sources
let ethDeviation = 0;
let btcDeviation = 0;

if (ethPriceCoinGecko > 0 && ethPriceCoinCap > 0) {
  ethDeviation = Math.abs(ethPriceCoinGecko - ethPriceCoinCap) / 
    Math.min(ethPriceCoinGecko, ethPriceCoinCap) * 100;
}

if (btcPriceCoinGecko > 0 && btcPriceCoinCap > 0) {
  btcDeviation = Math.abs(btcPriceCoinGecko - btcPriceCoinCap) / 
    Math.min(btcPriceCoinGecko, btcPriceCoinCap) * 100;
}

// Calculate decision score
let score = 50; // Base score
let reasons = [];

// Factor 1: Source deviation (potential arbitrage)
const maxDeviation = Math.max(ethDeviation, btcDeviation);
if (maxDeviation > 1) {
  score += 20;
  reasons.push(`High deviation: ${maxDeviation.toFixed(2)}%`);
}

// Factor 2: Multi-source verification
if (sources.length >= 2) {
  score += 15;
  reasons.push("Multi-source verified");
}

// Factor 3: 24h volatility
const maxChange = Math.max(Math.abs(ethChange24h), Math.abs(btcChange24h));
if (maxChange > 5) {
  score += 15;
  reasons.push(`High volatility: ${maxChange.toFixed(2)}%`);
}

// Cap score at 100
score = Math.min(score, 100);

// Determine if threshold is triggered
const triggered = score >= threshold;
if (triggered) {
  reasons.push("Threshold exceeded");
}

// Build reason string
const reason = reasons.length > 0 ? reasons.join("; ") : "Normal market conditions";

// Convert prices to 8 decimal format for Solidity
const priceETH = Math.round(avgEthPrice * 1e8);
const priceBTC = Math.round(avgBtcPrice * 1e8);

// Return result as JSON string (will be encoded for contract)
const result = {
  priceETH,
  priceBTC,
  score,
  triggered,
  reason,
  sources: sources.join(",")
};

console.log("AutoSentinel Result:", JSON.stringify(result, null, 2));

// Return encoded result
return Functions.encodeString(JSON.stringify(result));
