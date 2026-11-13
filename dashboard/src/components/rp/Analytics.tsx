"use client";

import Link from "next/link";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { Suspense, useEffect, useState } from "react";
import {
  CONSENT_EVENT,
  isTrackedHost,
  readConsent,
  saveConsent,
  type Consent,
} from "@/lib/consent";

const POSTHOG_KEY = "phc_nLfA33WKEloZwBPM7QvjW4EiioDbjpvYnM7sCSYB4Zp";
const POSTHOG_HOST = "https://eu.i.posthog.com";
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/**
 * PostHog runs for every visitor in cookieless mode: no cookies or local
 * storage, so it needs no consent. (Cookieless mode must also be switched on
 * in the PostHog project settings, or these events are dropped.)
 */
function usePostHog() {
  useEffect(() => {
    if (!isTrackedHost() || posthog.__loaded) return;
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      cookieless_mode: "always",
      person_profiles: "identified_only",
      capture_pageview: false, // sent on each route change below
      capture_pageleave: true,
      autocapture: true,
    });
  }, []);
}

function Pageviews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    if (!isTrackedHost() || !posthog.__loaded) return;
    const query = searchParams?.toString();
    posthog.capture("$pageview", {
      $current_url: `${window.location.origin}${pathname}${query ? `?${query}` : ""}`,
    });
  }, [pathname, searchParams]);
  return null;
}

/** Google Analytics sets cookies, so it loads only after the visitor agrees. */
function GoogleAnalytics() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${GA_ID}', { anonymize_ip: true });`}
      </Script>
    </>
  );
}

function ConsentBanner({ onChoose }: { onChoose: (choice: Consent) => void }) {
  return (
    <div
      className="rp-consent rp-no-print"
      role="dialog"
      aria-live="polite"
      aria-label="Cookies"
    >
      <p>
        Can we use Google Analytics cookies to see how the site is used? We
        count visits without cookies either way.{" "}
        <Link href="/real-price/privacy#cookies">More about this</Link>
      </p>
      <div className="rp-consent-actions">
        <button
          type="button"
          className="rp-consent-button"
          onClick={() => onChoose("denied")}
        >
          No thanks
        </button>
        <button
          type="button"
          className="rp-consent-button rp-consent-button--yes"
          onClick={() => onChoose("granted")}
        >
          Allow
        </button>
      </div>
    </div>
  );
}

/** Analytics for every page: PostHog always, GA with consent, the banner. */
export default function Analytics() {
  usePostHog();
  // Unknown until mounted, so the banner never flashes on the server render
  const [consent, setConsent] = useState<Consent | "unset" | null>(null);

  useEffect(() => {
    const sync = () => setConsent(readConsent() ?? "unset");
    sync();
    // "Cookie settings" in a footer clears the choice to ask again
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  function choose(choice: Consent) {
    saveConsent(choice);
    if (choice === "denied" && consent === "granted") {
      // GA already ran on this page; reload so it stops
      window.location.reload();
    }
  }

  return (
    <>
      <Suspense fallback={null}>
        <Pageviews />
      </Suspense>
      {GA_ID && consent === "granted" && isTrackedHost() && <GoogleAnalytics />}
      {GA_ID && consent === "unset" && <ConsentBanner onChoose={choose} />}
    </>
  );
}
