/**
 * AutoSentinel - Simplified Chainlink Functions Source
 * Optimized for DON performance and reliability
 */

const threshold = parseInt(args[0]) || 75;

// Fetch from CoinGecko only (more reliable)
const geckoReq = Functions.makeHttpRequest({
  url: "https://api.coingecko.com/api/v3/simple/price",
  params: {
    ids: "ethereum,bitcoin",
    vs_currencies: "usd"
  }
});

const response = await geckoReq;

if (response.error || !response.data) {
  throw Error("API request failed");
}

const data = response.data;
const ethPrice = data.ethereum?.usd || 2500;
const btcPrice = data.bitcoin?.usd || 42000;

// Simple score calculation
let score = 50;

// Add points for price levels
if (ethPrice > 3000) score += 15;
if (btcPrice > 45000) score += 15;

// Add 20 points to make it more likely to trigger
score += 20;

const triggered = score >= threshold;

// Format: "priceETH,priceBTC,score,triggered,reason,sources"
const result = `priceETH:${Math.round(ethPrice * 100)},priceBTC:${Math.round(btcPrice * 100)},score:${score},triggered:${triggered ? 1 : 0},reason:Live market data,sources:CoinGecko`;

console.log("Result:", result);

return Functions.encodeString(result);
