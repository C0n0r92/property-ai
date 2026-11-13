/**
 * Runs once when the server starts. Loads the sales (and the area profiles
 * built from them) before the first visitor arrives, so the first page view
 * after a deploy does not wait several seconds for the database.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { getSalesStore } = await import('./lib/real-price/store');
  const { getMarket } = await import('./lib/real-price/market');
  getSalesStore()
    .then(() => getMarket('all'))
    .catch((error) => console.error('Warming the sales data failed:', error));
}
