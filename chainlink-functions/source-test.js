/**
 * TEST SOURCE - No HTTP requests, just return hardcoded values
 * Use this to verify the DON can fulfill requests at all
 */

const threshold = parseInt(args[0]) || 75;

// Hardcoded values - no API calls
const ethPrice = 2800;
const btcPrice = 43000;
const score = 85;
const triggered = score >= threshold;

const result = `priceETH:${Math.round(ethPrice * 100)},priceBTC:${Math.round(btcPrice * 100)},score:${score},triggered:${triggered ? 1 : 0},reason:Test data,sources:Hardcoded`;

console.log("Test Result:", result);

return Functions.encodeString(result);
