let cachedUsdtInrRate = 94.5; // Resilient fallback
let lastFetchedTime = 0;
let updateInterval = null;

/**
 * Fetches the latest live USDT to INR rate from multi-source APIs:
 * 1. CoinGecko Tether (USDT/INR)
 * 2. Open Exchange Rates USD/INR
 */
export const fetchLiveUsdtInrRate = async () => {
  // If manual override is configured in environment, use it
  if (process.env.USDT_INR_RATE_OVERRIDE) {
    const override = parseFloat(process.env.USDT_INR_RATE_OVERRIDE);
    if (!isNaN(override) && override > 0) {
      cachedUsdtInrRate = Number(override.toFixed(2));
      return cachedUsdtInrRate;
    }
  }

  // Source 1: CoinGecko (Primary crypto benchmark)
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=inr',
      { signal: AbortSignal.timeout(4000) }
    );
    if (res.ok) {
      const data = await res.json();
      const inrPrice = data?.tether?.inr;
      if (inrPrice && typeof inrPrice === 'number' && inrPrice > 50 && inrPrice < 200) {
        cachedUsdtInrRate = Number(inrPrice.toFixed(2));
        lastFetchedTime = Date.now();
        return cachedUsdtInrRate;
      }
    }
  } catch (err) {
    // Silently fall through to secondary source
  }

  // Source 2: Open Exchange Rates (Forex USD fallback)
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      const inrRate = data?.rates?.INR;
      if (inrRate && typeof inrRate === 'number' && inrRate > 50 && inrRate < 200) {
        cachedUsdtInrRate = Number(inrRate.toFixed(2));
        lastFetchedTime = Date.now();
        return cachedUsdtInrRate;
      }
    }
  } catch (err) {
    // Keep using last cached rate
  }

  return cachedUsdtInrRate;
};

/**
 * Returns the current cached USDT to INR rate synchronously (zero latency)
 */
export const getLiveUsdtInrRate = () => {
  return cachedUsdtInrRate;
};

/**
 * Initializes the background exchange rate updater (every 5 minutes)
 */
export const startExchangeRateAutoUpdater = () => {
  if (updateInterval) clearInterval(updateInterval);

  console.log('[Exchange Rates] Starting live USDT/INR rate monitor...');
  
  // Initial fetch immediately
  fetchLiveUsdtInrRate().then((rate) => {
    console.log(`[Exchange Rates] Current Live Rate: 1 USDT = ₹${rate} INR`);
  });

  // Refresh every 5 minutes (300,000 ms)
  updateInterval = setInterval(async () => {
    try {
      const newRate = await fetchLiveUsdtInrRate();
      console.log(`[Exchange Rates] Refreshed Live Rate: 1 USDT = ₹${newRate} INR`);
    } catch {
      // Keep cached
    }
  }, 5 * 60 * 1000);

  return updateInterval;
};
