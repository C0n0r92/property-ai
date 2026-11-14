/**
 * Runs once when the server starts. Loads the sales (and the area profiles
 * and track record built from them) before the first visitor arrives, so the first page view
 * after a deploy does not wait several seconds for the database.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { getSalesStore } = await import('./lib/real-price/store');
  const { getMarket } = await import('./lib/real-price/market');
  const { getMarketInsights } = await import('./lib/real-price/insights');
  const { trackRecord } = await import('./lib/real-price/track-record');
  const { loadStoredTrackRecord } = await import('./lib/real-price/track-record-store');
  // The pipeline's track record first, so the server never has to work it out; re-read hourly
  const haveStored = await loadStoredTrackRecord();
  setInterval(() => void loadStoredTrackRecord(), 60 * 60 * 1000).unref?.();
  getSalesStore()
    .then((store) => {
      if (!haveStored) trackRecord(store);
      return Promise.all([getMarket('all'), getMarketInsights()]);
    })
    // Then load the busiest pages once, so the first visitor after a deploy isn't the one who waits
    .then(async () => {
      const base = `http://127.0.0.1:${process.env.PORT ?? 3000}`;
      for (const path of ['/', '/areas', '/worth', '/streets']) {
        await fetch(base + path, { headers: { 'x-warm-up': '1' }, signal: AbortSignal.timeout(30_000) }).catch(() => {});
      }
    })
    .catch((error) => console.error('Warming the sales data failed:', error));

  // "Tell me what it sold for": check the register for alerts' homes every six hours
  const { runSoldAlerts } = await import('./lib/real-price/sold-alerts');
  const { siteUrl } = await import('./lib/real-price/guard');
  const site = siteUrl('https://irishpropertydata.com');
  const check = () =>
    runSoldAlerts(site).then((r) => {
      if (r.sent || r.expired) console.log('Sold alerts:', JSON.stringify(r));
    });
  setTimeout(check, 10 * 60 * 1000).unref?.();
  setInterval(check, 6 * 60 * 60 * 1000).unref?.();
}
