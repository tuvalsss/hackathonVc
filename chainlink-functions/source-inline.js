// AutoSentinel - Inline Source Code (minified for on-chain storage)
// This is the same logic as source.js but formatted for contract storage

const threshold = parseInt(args[0]) || 75;
const [geckoRes, capRes] = await Promise.all([
  Functions.makeHttpRequest({ url: "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin&vs_currencies=usd&include_24hr_change=true" }),
  Functions.makeHttpRequest({ url: "https://api.coincap.io/v2/assets?ids=ethereum,bitcoin" })
]);
let ethGecko = 0, btcGecko = 0, ethCap = 0, btcCap = 0;
let sources = [];
if (!geckoRes.error && geckoRes.data) {
  ethGecko = geckoRes.data.ethereum?.usd || 0;
  btcGecko = geckoRes.data.bitcoin?.usd || 0;
  if (ethGecko > 0) sources.push("CoinGecko");
}
if (!capRes.error && capRes.data?.data) {
  const eth = capRes.data.data.find(a => a.id === "ethereum");
  const btc = capRes.data.data.find(a => a.id === "bitcoin");
  ethCap = eth ? parseFloat(eth.priceUsd) : 0;
  btcCap = btc ? parseFloat(btc.priceUsd) : 0;
  if (ethCap > 0) sources.push("CoinCap");
}
const avgEth = (ethGecko + ethCap) / (ethGecko > 0 && ethCap > 0 ? 2 : 1);
const avgBtc = (btcGecko + btcCap) / (btcGecko > 0 && btcCap > 0 ? 2 : 1);
const ethDev = ethGecko > 0 && ethCap > 0 ? Math.abs(ethGecko - ethCap) / Math.min(ethGecko, ethCap) * 100 : 0;
let score = 50;
let reasons = [];
if (ethDev > 1) { score += 20; reasons.push("High deviation: " + ethDev.toFixed(2) + "%"); }
if (sources.length >= 2) { score += 15; reasons.push("Multi-source verified"); }
score = Math.min(score, 100);
const triggered = score >= threshold;
if (triggered) reasons.push("Threshold exceeded");
const reason = reasons.join("; ") || "Normal conditions";
const priceETH = Math.round(avgEth * 1e8);
const priceBTC = Math.round(avgBtc * 1e8);
return Functions.encodeString(JSON.stringify({ priceETH, priceBTC, score, triggered, reason, sources: sources.join(",") }));
