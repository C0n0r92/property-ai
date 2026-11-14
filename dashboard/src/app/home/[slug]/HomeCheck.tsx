"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import type { TypeGroup } from "@/lib/real-price/model";

const euro = (v: number) => `€${Math.round(v).toLocaleString("en-IE")}`;
const signed = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}%`;

interface Query {
  areaKey: string;
  typeGroup: TypeGroup;
  beds: number;
  askingPrice: number;
}

/** The price check for this home, run as the page opens, with the report one click away. */
export default function HomeCheck({ query, address, priceLabel }: { query: Query; address: string; priceLabel: string }) {
  const [answer, setAnswer] = useState<{ mid: number; shareAbove: number; overPct: number; count: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/api/real-price", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(query) })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!live) return;
        if (!ok) return setFailed(true);
        setAnswer({
          mid: d.result.prediction.mid,
          shareAbove: d.result.prediction.shareAboveAsking,
          overPct: d.result.prediction.medianOverAskingPct,
          count: d.result.evidence.count,
        });
        trackEvent({ action: "home_page_check", category: "tools", label: query.areaKey });
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [query]);

  async function buy() {
    setBuying(true);
    trackEvent({ action: "real_price_report_checkout", category: "tools", label: `${query.areaKey}:home_page` });
    try {
      const res = await fetch("/api/real-price/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, address }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
    } catch {
      // fall through
    }
    setBuying(false);
    setFailed(true);
  }

  const full = `/?${new URLSearchParams({ area: query.areaKey, type: query.typeGroup, beds: String(query.beds), asking: String(query.askingPrice) })}`;
  if (failed && !answer) return <p className="rp-home-note">The price check couldn&apos;t run just now. Try again in a moment.</p>;
  if (!answer) return <p className="rp-home-note">Checking similar sales…</p>;
  return (
    <div className="rp-home-check">
      <p className="rp-home-check-label">Will likely sell for about</p>
      <p className="rp-home-check-figure">{euro(answer.mid)}</p>
      <p className="rp-home-check-sub">
        {Math.round(answer.shareAbove * 100)}% of {answer.count} similar homes sold above asking; typically{" "}
        {signed(answer.overPct)}.
      </p>
      <div className="rp-home-check-actions">
        <button type="button" className="rp-button rp-button--ink" onClick={buy} disabled={buying}>
          {buying ? "Opening payment…" : `Get the report · ${priceLabel}`}
        </button>
        <Link href={full} className="rp-link">
          Try a bid
        </Link>
      </div>
    </div>
  );
}
