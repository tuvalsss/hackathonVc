// AutoSentinel Multi-Source Intelligence Engine
// Fetches from: CoinGecko, CoinCap, Polymarket
// Computes cross-market decision score

const threshold = parseInt(args[0]) || 75;

let ethPrice = 0, btcPrice = 0;
let polyVolume = 0, polyTopYes = 0;
let sourcesUsed = [];
let score = 50;

// 1. Fetch crypto prices from CoinGecko
try {
  const geckoRes = await Functions.makeHttpRequest({
    url: "https://api.coingecko.com/api/v3/simple/price",
    params: { ids: "ethereum,bitcoin", vs_currencies: "usd" },
    timeout: 5000
  });
  if (!geckoRes.error && geckoRes.data) {
    ethPrice = geckoRes.data.ethereum?.usd || 0;
    btcPrice = geckoRes.data.bitcoin?.usd || 0;
    sourcesUsed.push("CoinGecko");
  }
} catch (e) {}

// 2. Fetch crypto prices from CoinCap as backup/cross-validation
try {
  const capRes = await Functions.makeHttpRequest({
    url: "https://api.coincap.io/v2/assets",
    params: { ids: "ethereum,bitcoin" },
    timeout: 5000
  });
  if (!capRes.error && capRes.data && capRes.data.data) {
    const assets = capRes.data.data;
    const capEth = parseFloat(assets.find(a => a.id === "ethereum")?.priceUsd || "0");
    const capBtc = parseFloat(assets.find(a => a.id === "bitcoin")?.priceUsd || "0");
    
    if (ethPrice === 0) ethPrice = capEth;
    if (btcPrice === 0) btcPrice = capBtc;
    
    // Cross-source deviation adds to score
    if (ethPrice > 0 && capEth > 0) {
      const deviation = Math.abs(ethPrice - capEth) / ethPrice * 100;
      if (deviation > 1) score += Math.min(Math.round(deviation * 5), 15);
    }
    sourcesUsed.push("CoinCap");
  }
} catch (e) {}

// 3. Fetch Polymarket prediction market data
try {
  const polyRes = await Functions.makeHttpRequest({
    url: "https://gamma-api.polymarket.com/markets",
    params: { closed: "false", limit: "5", order: "volume" },
    timeout: 5000
  });
  if (!polyRes.error && polyRes.data && Array.isArray(polyRes.data)) {
    const markets = polyRes.data;
    // Total volume of top markets
    for (const m of markets) {
      polyVolume += parseFloat(m.volume || "0");
      const yesPrice = parseFloat(m.outcomePrices?.[0] || "0");
      if (yesPrice > polyTopYes) polyTopYes = Math.round(yesPrice * 100);
    }
    polyVolume = Math.round(polyVolume);
    
    // High volume = market activity = potential volatility
    if (polyVolume > 1000000) score += 10;
    if (polyVolume > 5000000) score += 5;
    
    sourcesUsed.push("Polymarket");
  }
} catch (e) {}

// Fallback if no API data
if (ethPrice === 0) { ethPrice = 2850; sourcesUsed.push("Fallback"); }
if (btcPrice === 0) btcPrice = 43500;

// Score adjustments based on crypto conditions
if (ethPrice > 3000) score += 8;
if (ethPrice < 2000) score += 12;
if (btcPrice > 50000) score += 5;
if (btcPrice < 30000) score += 10;

// Cap score
score = Math.min(score, 100);

const triggered = score >= threshold;
const srcStr = sourcesUsed.length > 0 ? sourcesUsed.join("+") : "None";

// Build reason
let reason = "Multi-source analysis";
if (score >= 80) reason = "High activity across markets";
else if (score >= 60) reason = "Moderate market signals";
else reason = "Markets stable";

// Encode polymarket data into the response
// polyVol in thousands, polyTop as percentage
const polyVolK = Math.round(polyVolume / 1000);

const result = `priceETH:${Math.round(ethPrice * 100)},priceBTC:${Math.round(btcPrice * 100)},score:${score},triggered:${triggered ? 1 : 0},polyVol:${polyVolK},polyTop:${polyTopYes},reason:${reason},sources:${srcStr}`;

return Functions.encodeString(result);
