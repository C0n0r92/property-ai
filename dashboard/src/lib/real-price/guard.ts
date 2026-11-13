/**
 * Small request guards for the public Real Price endpoints: a per-caller
 * rate limit, and the public address of the site for links we hand out.
 */

/**
 * A fixed-window limiter held in memory. Good for a single app instance;
 * with several instances each one keeps its own count.
 */
export function createLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, { start: number; count: number }>();
  return function allow(key: string, now: number = Date.now()): boolean {
    if (hits.size > 10_000) {
      for (const [k, v] of hits) if (now - v.start >= windowMs) hits.delete(k);
    }
    const entry = hits.get(key);
    if (!entry || now - entry.start >= windowMs) {
      hits.set(key, { start: now, count: 1 });
      return true;
    }
    entry.count += 1;
    return entry.count <= limit;
  };
}

/** The caller's address as reported by the proxy in front of the app. */
export function clientKey(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

/**
 * The public address of the site. Behind a proxy the request origin can be
 * an internal host, so a configured address always wins.
 */
export function siteUrl(
  requestOrigin: string,
  env: Record<string, string | undefined> = process.env
): string {
  const url = env.NEXT_PUBLIC_SITE_URL || env.NEXT_PUBLIC_BASE_URL || requestOrigin;
  return url.replace(/\/+$/, '');
}
