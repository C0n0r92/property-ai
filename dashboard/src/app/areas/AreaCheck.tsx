"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import type { ListingAnswer } from "@/lib/real-price/listing-lookup";
import type { TypeGroup } from "@/lib/real-price/model";

const TYPES: Array<{ value: TypeGroup; label: string }> = [
  { value: "apartment", label: "apartment" },
  { value: "terraced", label: "terraced house" },
  { value: "semi", label: "semi-detached house" },
  { value: "detached", label: "detached house" },
];
const euro = (v: number) => `€${Math.round(v).toLocaleString("en-IE")}`;
const looksLikeLink = (s: string) => /(daft\.ie|myhome\.ie)\//i.test(s);

interface Home {
  areaKey: string;
  typeGroup: TypeGroup;
  beds: number;
  askingPrice: number;
}

interface Suggestion {
  address: string;
  areaKey: string;
  typeGroup: TypeGroup | null;
  beds?: number;
  askingPrice: number;
  saleAgreed: boolean;
}

interface Answer {
  areaLabel: string;
  mid: number;
  shareAbove: number;
  count: number;
}

/**
 * The price check, on an area page: paste a MyHome or Daft link or start
 * typing an address (homes for sale now are suggested), or set the home by
 * hand. The answer appears here; nothing sends the visitor back to the home
 * page to start again.
 */
export default function AreaCheck({
  areaKey,
  areaLabel,
  defaults,
  priceLabel,
}: {
  areaKey: string;
  areaLabel: string;
  defaults: Omit<Home, "areaKey">;
  priceLabel: string;
}) {
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [home, setHome] = useState<Home>({ areaKey, ...defaults });
  const [address, setAddress] = useState<string | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const request = useRef(0);

  // Suggest homes for sale as the visitor types an address
  useEffect(() => {
    if (looksLikeLink(text) || text.trim().length < 3 || text === address) {
      setSuggestions([]);
      return;
    }
    const id = ++request.current;
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/real-price/search?q=${encodeURIComponent(text.trim())}&area=${areaKey}`);
        const data = await res.json();
        if (id === request.current) setSuggestions(data.results ?? []);
      } catch {
        // Suggestions are a help, not a requirement
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [text, areaKey, address]);

  async function check(next: Home, label: string | null, typicalAsking = false) {
    setBusy(true);
    if (!typicalAsking) setMessage(null);
    try {
      const res = await fetch("/api/real-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...next, autoAsking: typicalAsking }),
      });
      const data = await res.json();
      // The typical asking price for this home, when the listing gave none
      if (typicalAsking && typeof data.askingPrice === "number") {
        next = { ...next, askingPrice: data.askingPrice };
        setHome(next);
      }
      if (!res.ok) {
        setAnswer(null);
        setMessage(
          data.error === "not_enough_sales"
            ? "Not enough similar sales for that home yet. Try a different type or size."
            : "The check did not complete. Try again in a moment.",
        );
        return;
      }
      setAnswer({
        areaLabel: data.areaLabel,
        mid: data.result.prediction.mid,
        shareAbove: data.result.prediction.shareAboveAsking,
        count: data.result.evidence.count,
      });
      trackEvent({ action: "area_check_result", category: "tools", label: `${areaKey}${label ? ":address" : ":manual"}` });
    } catch {
      setMessage("The check did not complete. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  function applyHome(found: Partial<Home>, label: string | null, typicalAsking = false) {
    const next: Home = {
      areaKey: found.areaKey ?? home.areaKey,
      typeGroup: found.typeGroup ?? home.typeGroup,
      beds: found.beds ?? home.beds,
      askingPrice: found.askingPrice ?? home.askingPrice,
    };
    setHome(next);
    setAddress(label);
    if (label) setText(label);
    setSuggestions([]);
    check(next, label, typicalAsking);
  }

  async function readLink(link: string) {
    setBusy(true);
    setMessage(null);
    trackEvent({ action: "area_check_link", category: "tools", label: areaKey });
    try {
      const res = await fetch(`/api/real-price/listing?url=${encodeURIComponent(link.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setBusy(false);
        setMessage("That doesn’t look like a MyHome.ie or Daft.ie listing link.");
        return;
      }
      const result = data as ListingAnswer;
      const noPrice = result.missing.includes("asking");
      applyHome(result.home as Partial<Home>, result.listing?.address ?? null, noPrice);
      if (result.inferredFrom) {
        setMessage(
          `We don't have this listing's details yet: the type and size come from ${result.inferredFrom.count} homes for sale on ${result.inferredFrom.street}, with a typical asking price. Check them and enter its asking price below.`,
        );
      } else if (noPrice) {
        setMessage("The listing’s asking price isn’t in our records: a typical one is shown; enter the real one below.");
      }
    } catch {
      setBusy(false);
      setMessage("The link couldn’t be read just now. Try again in a moment.");
    }
  }

  async function buy() {
    setBuying(true);
    trackEvent({ action: "real_price_report_checkout", category: "tools", label: `${areaKey}:area_page` });
    try {
      const res = await fetch("/api/real-price/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: home, address: address ?? undefined }),
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
    setBuying(false);
  }

  const type = TYPES.find((t) => t.value === home.typeGroup)!;
  const fullAnswer = `/?${new URLSearchParams({
    area: home.areaKey,
    type: home.typeGroup,
    beds: String(home.beds),
    asking: String(home.askingPrice),
  })}`;

  return (
    <div className="rp-areacheck" id="check">
      <form
        className="rp-areacheck-search"
        onSubmit={(e) => {
          e.preventDefault();
          if (looksLikeLink(text)) readLink(text);
          else if (suggestions[0]) applyHome(suggestions[0] as Partial<Home>, suggestions[0].address);
        }}
      >
        <label className="rp-visually-hidden" htmlFor="area-check-input">
          Address or listing link
        </label>
        <input
          id="area-check-input"
          value={text}
          autoComplete="off"
          spellCheck={false}
          placeholder="An address, or a Daft or MyHome link"
          title={`An address in ${areaLabel} (or anywhere in Dublin), or a Daft or MyHome listing link`}
          onChange={(e) => {
            setText(e.target.value);
            setAddress(null);
          }}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData("text");
            if (looksLikeLink(pasted)) {
              e.preventDefault();
              setText(pasted);
              readLink(pasted);
            }
          }}
        />
        <button type="submit" disabled={busy || !text.trim()}>
          {busy ? "Checking…" : "Check"}
        </button>
        {suggestions.length > 0 && (
          <ul className="rp-areacheck-suggest" role="listbox">
            {suggestions.map((s) => (
              <li key={s.address} role="option" aria-selected="false">
                <button type="button" onClick={() => applyHome(s as Partial<Home>, s.address)}>
                  <span>{s.address}</span>
                  <small>
                    {[s.beds && `${s.beds}-bed`, s.typeGroup && TYPES.find((t) => t.value === s.typeGroup)?.label, `asking ${euro(s.askingPrice)}`, s.saleAgreed && "sale agreed"]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>

      <div className="rp-areacheck-manual">
        <span>Or describe it:</span>
        <select
          aria-label="Bedrooms"
          value={home.beds}
          onChange={(e) => setHome({ ...home, beds: Number(e.target.value) })}
        >
          {[1, 2, 3, 4, 5, 6].map((b) => (
            <option key={b} value={b}>
              {b}-bed
            </option>
          ))}
        </select>
        <select
          aria-label="Type of home"
          value={home.typeGroup}
          onChange={(e) => setHome({ ...home, typeGroup: e.target.value as TypeGroup })}
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <label className="rp-areacheck-asking">
          €
          <input
            aria-label="Asking price in euro"
            inputMode="numeric"
            value={home.askingPrice.toLocaleString("en-IE")}
            onChange={(e) => {
              const v = Number(e.target.value.replace(/[^0-9]/g, ""));
              if (Number.isFinite(v)) setHome({ ...home, askingPrice: v });
            }}
          />
        </label>
        <button
          type="button"
          className="rp-areacheck-go"
          disabled={busy || home.askingPrice < 50_000}
          onClick={() => {
            setAddress(null);
            check(home, null);
          }}
        >
          Check
        </button>
      </div>

      {message && (
        <p className="rp-areacheck-message" role="status">
          {message}
        </p>
      )}

      {answer && (
        <div className="rp-areacheck-answer" role="status">
          <p className="rp-areacheck-home">
            {address ?? `A ${home.beds}-bed ${type.label} in ${answer.areaLabel}`} · asking {euro(home.askingPrice)}
          </p>
          <p className="rp-areacheck-price">
            will really sell for about <strong>{euro(answer.mid)}</strong>
          </p>
          <p className="rp-areacheck-sub">
            {Math.round(answer.shareAbove * 100)}% of {answer.count} similar homes sold above asking.
          </p>
          <div className="rp-areacheck-actions">
            <button type="button" className="rp-button rp-button--ink" onClick={buy} disabled={buying}>
              {buying ? "Opening payment…" : `Get the full report for ${priceLabel}`}
            </button>
            <Link className="rp-link" href={fullAnswer}>
              See the full breakdown
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
