"use client";

import { useEffect, useRef, useState } from "react";
import SoldAlert from "@/components/rp/SoldAlert";
import WorthCard, { type WorthHome } from "@/components/rp/WorthCard";

/**
 * "A home on this street": the visitor gives its house number and sees what
 * it's likely worth (from its last sale), with a sold-price alert. A home
 * with no sale on record gets the alert alone.
 */
export default function StreetAlert({ street, area, county }: { street: string; area: string; county: string }) {
  const [number, setNumber] = useState("");
  const [home, setHome] = useState<WorthHome | null>(null);
  const [looked, setLooked] = useState(false);
  const request = useRef(0);
  const clean = number.trim().replace(/[^0-9a-zA-Z]/g, "").slice(0, 6);
  const ready = /^\d+[a-zA-Z]?$/.test(clean);
  const address = `${clean} ${street}, ${area}`;

  useEffect(() => {
    setHome(null);
    setLooked(false);
    if (!ready) return;
    const id = ++request.current;
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/worth?address=${encodeURIComponent(address)}`);
        const data = await res.json();
        if (id !== request.current) return;
        setHome(res.ok && data.homes?.length ? data.homes[0] : null);
      } catch {
        // The alert still works without an estimate
      } finally {
        if (id === request.current) setLooked(true);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [address, ready]);

  return (
    <div className="rp-street-alert">
      <h2 className="rp-h2">A home on {street}?</h2>
      <p className="rp-street-alert-lede">Its house number gives what it&apos;s likely worth, and we can email you when it sells.</p>
      <label className="rp-street-alert-number">
        <span>House number</span>
        <input
          inputMode="numeric"
          autoComplete="off"
          placeholder="12"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          maxLength={6}
        />
      </label>
      {ready && home && <WorthCard home={home} showStreetLink={false} />}
      {ready && looked && !home && (
        <>
          <p className="rp-street-alert-lede">No sale of number {clean} on record since 2010, so no estimate.</p>
          <SoldAlert address={address} county={county} compact />
        </>
      )}
    </div>
  );
}
