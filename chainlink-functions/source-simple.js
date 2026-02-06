// Simple AutoSentinel source - more reliable for demo
const threshold = parseInt(args[0] || "75");

// Fetch ETH price from CoinGecko
const response = await Functions.makeHttpRequest({
  url: "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin&vs_currencies=usd"
});

if (response.error) {
  throw Error("Failed to fetch prices");
}

const ethPrice = response.data.ethereum?.usd || 0;
const btcPrice = response.data.bitcoin?.usd || 0;

if (ethPrice === 0) {
  throw Error("ETH price is 0");
}

// Calculate a simple score based on price
const score = Math.min(100, Math.round(50 + (ethPrice > 2500 ? 30 : 0) + (btcPrice > 60000 ? 20 : 0)));
const triggered = score >= threshold;
const reason = triggered ? "Market conditions active" : "Normal conditions";

const result = {
  priceETH: Math.round(ethPrice * 1e8),
  priceBTC: Math.round(btcPrice * 1e8),
  score: score,
  triggered: triggered,
  reason: reason,
  sources: "CoinGecko"
};

return Functions.encodeString(JSON.stringify(result));
