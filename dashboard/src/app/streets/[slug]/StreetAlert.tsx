"use client";

import { useState } from "react";
import SoldAlert from "@/components/rp/SoldAlert";

/**
 * "Watching a home here?": the visitor gives its house number, and the
 * sold-price alert takes it from there.
 */
export default function StreetAlert({ street, area, county }: { street: string; area: string; county: string }) {
  const [number, setNumber] = useState("");
  const clean = number.trim().replace(/[^0-9a-zA-Z]/g, "").slice(0, 6);
  const ready = /^\d+[a-zA-Z]?$/.test(clean);

  return (
    <div className="rp-street-alert">
      <h2 className="rp-h2">Watching a home here?</h2>
      <p className="rp-street-alert-lede">We&apos;ll email you what it sells for, once, when the sale is registered.</p>
      <label className="rp-street-alert-number">
        <span>House number on {street}</span>
        <input
          inputMode="numeric"
          autoComplete="off"
          placeholder="12"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          maxLength={6}
        />
      </label>
      {ready && <SoldAlert address={`${clean} ${street}, ${area}`} county={county} compact />}
    </div>
  );
}
