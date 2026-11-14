/**
 * Runs once when the server starts. Loads the sales (and the area profiles
 * and track record built from them) before the first visitor arrives, so the first page view
 * after a deploy does not wait several seconds for the database.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { getSalesStore } = await import('./lib/real-price/store');
  const { getMarket } = await import('./lib/real-price/market');
  const { trackRecord } = await import('./lib/real-price/track-record');
  getSalesStore()
    .then((store) => {
      trackRecord(store);
      return getMarket('all');
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
