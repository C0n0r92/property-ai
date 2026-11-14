"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { encodeHome, verdict, type CompareHome, type CompareResult } from "@/lib/real-price/compare";
import type { TypeGroup } from "@/lib/real-price/model";
import { trackEvent } from "@/lib/analytics";

const TYPES: Array<{ value: TypeGroup; label: string }> = [
  { value: "apartment", label: "apartment" },
  { value: "terraced", label: "terraced house" },
  { value: "semi", label: "semi-detached house" },
  { value: "detached", label: "detached house" },
];
const euro = (v: number) => `€${Math.round(v).toLocaleString("en-IE")}`;
const signed = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}%`;
const looksLikeLink = (s: string) => /(daft\.ie|myhome\.ie)\//i.test(s);

interface Area {
  key: string;
  label: string;
}

interface Slot {
  home: CompareHome;
  link: string;
  /** Address from a pasted listing */
  address: string | null;
  note: string | null;
}

function HomeInput({
  name,
  slot,
  areas,
  busy,
  onChange,
  onLink,
}: {
  name: string;
  slot: Slot;
  areas: Area[];
  busy: boolean;
  onChange: (home: CompareHome) => void;
  onLink: (link: string) => void;
}) {
  const { home } = slot;
  const id = name.replace(/\s+/g, "-").toLowerCase();
  return (
    <fieldset className="rp-compare-home">
      <legend>{name}</legend>
      <label className="rp-compare-field rp-compare-field--wide">
        <span>Listing link (optional)</span>
        <input
          id={`${id}-link`}
          value={slot.link}
          placeholder="Paste a Daft or MyHome link"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => onLink(e.target.value)}
          disabled={busy}
        />
      </label>
      {slot.address && <p className="rp-compare-address">{slot.address}</p>}
      {slot.note && <p className="rp-compare-note">{slot.note}</p>}
      <label className="rp-compare-field rp-compare-field--wide">
        <span>Area</span>
        <select value={home.areaKey} onChange={(e) => onChange({ ...home, areaKey: e.target.value })}>
          {areas.map((a) => (
            <option key={a.key} value={a.key}>
              {a.label}
            </option>
          ))}
        </select>
      </label>
      <label className="rp-compare-field">
        <span>Bedrooms</span>
        <select value={home.beds} onChange={(e) => onChange({ ...home, beds: Number(e.target.value) })}>
          {[1, 2, 3, 4, 5, 6].map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </label>
      <label className="rp-compare-field">
        <span>Type</span>
        <select value={home.typeGroup} onChange={(e) => onChange({ ...home, typeGroup: e.target.value as TypeGroup })}>
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className="rp-compare-field rp-compare-field--wide">
        <span>Asking price</span>
        <input
          inputMode="numeric"
          value={`€${home.askingPrice.toLocaleString("en-IE")}`}
          onChange={(e) => {
            const v = Number(e.target.value.replace(/[^0-9]/g, ""));
            if (Number.isFinite(v)) onChange({ ...home, askingPrice: v });
          }}
        />
      </label>
    </fieldset>
  );
}

export default function CompareHomes({
  areas,
  initial,
  priceLabel,
}: {
  areas: Area[];
  initial: [CompareHome, CompareHome];
  /** The report's price, e.g. "€9.99" */
  priceLabel: string;
}) {
  const [slots, setSlots] = useState<[Slot, Slot]>([
    { home: initial[0], link: "", address: null, note: null },
    { home: initial[1], link: "", address: null, note: null },
  ]);
  const [results, setResults] = useState<[CompareResult, CompareResult] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [buying, setBuying] = useState<0 | 1 | null>(null);

  /** The full bidding report for one of the two homes */
  async function buy(i: 0 | 1) {
    setBuying(i);
    trackEvent({ action: "real_price_report_checkout", category: "tools", label: `${slots[i].home.areaKey}:compare` });
    try {
      const res = await fetch("/api/real-price/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: slots[i].home, address: slots[i].address ?? undefined }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setMessage("Payment could not be opened just now. Try again in a moment.");
    } catch {
      setMessage("Payment could not be opened just now. Try again in a moment.");
    }
    setBuying(null);
  }

  const setSlot = (i: 0 | 1, next: Partial<Slot>) =>
    setSlots((s) => (i === 0 ? [{ ...s[0], ...next }, s[1]] : [s[0], { ...s[1], ...next }]));

  async function readLink(i: 0 | 1, link: string) {
    setSlot(i, { link });
    if (!looksLikeLink(link)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/real-price/listing?url=${encodeURIComponent(link.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setSlot(i, { note: "That doesn’t look like a MyHome.ie or Daft.ie listing link." });
        return;
      }
      const found = data.home as Partial<CompareHome>;
      setSlots((s) => {
        const home = { ...s[i].home, ...Object.fromEntries(Object.entries(found).filter(([, v]) => v != null)) } as CompareHome;
        const note = data.estimatedAsking
          ? "Asking price estimated from similar homes on the same street. Change it if you know it."
          : data.missing?.includes("asking")
            ? "The asking price isn’t in our records: enter it below."
            : null;
        const slot = { home, link, address: data.listing?.address ?? null, note };
        return i === 0 ? [slot, s[1]] : [s[0], slot];
      });
      trackEvent({ action: "compare_link", category: "tools", label: found.areaKey ?? "" });
    } catch {
      setSlot(i, { note: "The link couldn’t be read just now." });
    } finally {
      setBusy(false);
    }
  }

  async function checkOne(home: CompareHome): Promise<CompareResult | string> {
    const res = await fetch("/api/real-price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(home),
    });
    const data = await res.json();
    if (!res.ok) return data.error === "not_enough_sales" ? "not enough similar sales" : "the check did not complete";
    return {
      label: data.areaLabel,
      asking: data.askingPrice,
      mid: data.result.prediction.mid,
      likelyLow: data.result.prediction.likelyLow,
      medianOverAskingPct: data.result.prediction.medianOverAskingPct,
      shareAbove: data.result.prediction.shareAboveAsking,
      count: data.result.evidence.count,
    };
  }

  async function compare(homes: [CompareHome, CompareHome] = [slots[0].home, slots[1].home]) {
    setBusy(true);
    setMessage(null);
    try {
      const [a, b] = await Promise.all(homes.map(checkOne));
      if (typeof a === "string" || typeof b === "string") {
        setResults(null);
        setMessage(
          `Couldn’t compare: ${typeof a === "string" ? `Home A, ${a}` : ""}${typeof a === "string" && typeof b === "string" ? "; " : ""}${typeof b === "string" ? `Home B, ${b}` : ""}. Try a different type or size.`,
        );
        return;
      }
      setResults([a, b]);
      const params = new URLSearchParams({ a: encodeHome(homes[0]), b: encodeHome(homes[1]) });
      window.history.replaceState(null, "", `/compare?${params}`);
      trackEvent({ action: "compare_result", category: "tools", label: `${homes[0].areaKey}:${homes[1].areaKey}` });
    } catch {
      setMessage("The comparison did not complete. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  // A shared comparison opens with its answer
  useEffect(() => {
    if (window.location.search.includes("a=")) compare(initial);
    // Once, with the homes from the address
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const names: [string, string] = ["Home A", "Home B"];
  const lines = results ? verdict(results[0], results[1], names) : [];
  const rows: Array<[string, (r: CompareResult, i: number) => string]> = [
    ["Area", (r) => r.label],
    ["Home", (_, i) => `${slots[i].home.beds}-bed ${TYPES.find((t) => t.value === slots[i].home.typeGroup)!.label}`],
    ["Asking price", (r) => euro(r.asking)],
    ["Likely to sell for", (r) => euro(r.mid)],
    ["Likely range starts at", (r) => euro(r.likelyLow)],
    ["Typical result on asking", (r) => signed(r.medianOverAskingPct)],
    ["Sold above asking", (r) => `${Math.round(r.shareAbove * 100)}%`],
    ["Expected over asking", (r) => euro(Math.max(0, r.mid - r.asking))],
    ["Similar sales behind it", (r) => String(r.count)],
  ];

  return (
    <div className="rp-compare">
      <form
        className="rp-compare-form"
        onSubmit={(e) => {
          e.preventDefault();
          compare();
        }}
      >
        <div className="rp-compare-homes">
          {([0, 1] as const).map((i) => (
            <HomeInput
              key={i}
              name={names[i]}
              slot={slots[i]}
              areas={areas}
              busy={busy}
              onChange={(home) => setSlot(i, { home, address: null })}
              onLink={(link) => readLink(i, link)}
            />
          ))}
        </div>
        <button type="submit" className="rp-button rp-button--ink" disabled={busy}>
          {busy ? "Comparing…" : "Compare the two"}
        </button>
      </form>

      {message && (
        <p className="rp-compare-message" role="status">
          {message}
        </p>
      )}

      {results && (
        <section className="rp-compare-answer" aria-live="polite">
          <div className="rp-compare-verdict">
            {lines.map((l) => (
              <p key={l}>{l}</p>
            ))}
          </div>
          <div className="rp-area-table">
            <table>
              <thead>
                <tr>
                  <th scope="col">
                    <span className="rp-visually-hidden">Measure</span>
                  </th>
                  <th scope="col">Home A</th>
                  <th scope="col">Home B</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, value]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    <td>{value(results[0], 0)}</td>
                    <td>{value(results[1], 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rp-compare-buy">
            <p>
              <strong>Bidding on one of them?</strong> The full report has every comparable sale, a bid-by-bid plan and
              how the area is moving.
            </p>
            <div className="rp-compare-buy-actions">
              {([0, 1] as const).map((i) => (
                <button
                  key={i}
                  type="button"
                  className="rp-button rp-button--ink"
                  onClick={() => buy(i)}
                  disabled={buying !== null}
                >
                  {buying === i ? "Opening payment…" : `Report for ${names[i]}, ${priceLabel}`}
                </button>
              ))}
            </div>
          </div>
          <p className="rp-compare-foot">
            Likely prices come from recent sales of similar homes in each area, relative to their asking prices. Not a
            valuation.{" "}
            {([0, 1] as const).map((i) => (
              <span key={i}>
                <Link
                  className="rp-link"
                  href={`/?${new URLSearchParams({
                    area: slots[i].home.areaKey,
                    type: slots[i].home.typeGroup,
                    beds: String(slots[i].home.beds),
                    asking: String(slots[i].home.askingPrice),
                  })}`}
                >
                  Full answer for {names[i]}
                </Link>
                {i === 0 ? " · " : ""}
              </span>
            ))}
          </p>
        </section>
      )}
    </div>
  );
}
