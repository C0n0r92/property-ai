/**
 * An access token for Google's APIs, acting as the project's analytics
 * service account (it is a user in GA4 and an owner in Search Console).
 *
 * Set GOOGLE_ACCESS_TOKEN to use a token you already have; otherwise gcloud
 * (logged in as someone allowed to act as the service account) issues one.
 */
import { execFileSync } from 'node:child_process';

export const SERVICE_ACCOUNT = process.env.GOOGLE_SERVICE_ACCOUNT ?? 'zero-analytics@ipd-2025-481921.iam.gserviceaccount.com';

export function googleToken(scopes) {
  if (process.env.GOOGLE_ACCESS_TOKEN) return process.env.GOOGLE_ACCESS_TOKEN;
  return execFileSync(
    'gcloud',
    ['auth', 'print-access-token', `--impersonate-service-account=${SERVICE_ACCOUNT}`, `--scopes=${scopes.join(',')}`],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
  ).trim();
}

/** fetch with retries, for flaky networks; returns parsed JSON. */
export async function googleJson(url, token, init = {}) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(init.headers ?? {}) },
        signal: AbortSignal.timeout(60_000),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`${res.status} ${data?.error?.message ?? ''}`.trim());
      return data;
    } catch (error) {
      lastError = error;
      if (/^4\d\d /.test(String(error.message)) && !/^429/.test(error.message)) break;
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  throw lastError;
}
