/**
 * The visitor's answer to "can we use analytics cookies?", kept in their own
 * browser. Only Google Analytics depends on it; PostHog runs cookieless.
 */
export type Consent = "granted" | "denied";

const KEY = "ipd-analytics-consent";

/** Fired on window whenever the answer changes or is cleared. */
export const CONSENT_EVENT = "ipd-consent-changed";

export function readConsent(): Consent | null {
  try {
    const value = window.localStorage.getItem(KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function saveConsent(value: Consent | null): void {
  try {
    if (value) window.localStorage.setItem(KEY, value);
    else window.localStorage.removeItem(KEY);
  } catch {
    // Storage blocked: the banner simply asks again next visit
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

/** Analytics only counts the real site, never local development. */
export function isTrackedHost(): boolean {
  if (typeof window === "undefined") return false;
  return !/^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(window.location.hostname);
}
