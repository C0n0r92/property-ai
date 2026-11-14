"use client";

import { useState } from "react";
import WorthCard, { type WorthHome } from "@/components/rp/WorthCard";
import { trackEvent } from "@/lib/analytics";

const REASONS: Record<string, string> = {
  no_number: "Add the house number, e.g. 12 Butterfield Avenue, Dublin 14.",
  not_found: "No sale of that home on the Property Price Register since 2010. Check the spelling, or try without the town.",
  unavailable: "Estimates are unavailable just now. Try again in a minute.",
};

/** Search an address, show its estimate. */
export default function WorthLookup({ initial = "" }: { initial?: string }) {
  const [address, setAddress] = useState(initial);
  const [homes, setHomes] = useState<WorthHome[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function look(event?: React.FormEvent) {
    event?.preventDefault();
    if (address.trim().length < 4) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/worth?address=${encodeURIComponent(address.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setHomes(null);
        setMessage(data.error === "too_many_requests" ? "That's a lot of searches. Try again in a minute." : REASONS.unavailable);
        return;
      }
      setHomes(data.homes ?? []);
      setMessage(data.reason ? REASONS[data.reason] ?? null : null);
      trackEvent({ action: "worth_lookup", category: "tools", label: data.homes?.[0]?.county ?? data.reason ?? "" });
    } catch {
      setMessage(REASONS.unavailable);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rp-worth">
      <form className="rp-areacheck-search rp-worth-search" onSubmit={look}>
        <label className="rp-visually-hidden" htmlFor="worth-address">
          The home&apos;s address
        </label>
        <input
          id="worth-address"
          value={address}
          autoComplete="street-address"
          placeholder="12 Butterfield Avenue, Dublin 14"
          onChange={(e) => setAddress(e.target.value)}
        />
        <button type="submit" disabled={busy || address.trim().length < 4}>
          {busy ? "Looking…" : "Estimate"}
        </button>
      </form>
      {message && (
        <p className="rp-worth-message" role="status">
          {message}
        </p>
      )}
      {homes && homes.length > 1 && (
        <p className="rp-worth-message">{homes.length} homes match: add the town to narrow it down.</p>
      )}
      <div className="rp-worth-results">
        {homes?.map((h) => (
          <WorthCard key={`${h.county}-${h.address}`} home={h} />
        ))}
      </div>
    </div>
  );
}
