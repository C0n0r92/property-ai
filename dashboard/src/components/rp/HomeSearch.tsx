"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { trackEvent } from "@/lib/analytics";

interface Hit {
  slug: string;
  address: string;
  county: string;
  sales: number;
  lastSold: string | null;
  lastPrice: number | null;
}

const REASONS: Record<string, string> = {
  no_number: "Add the house number, e.g. 12 Butterfield Avenue, Dublin 14.",
  not_found: "We have no record of that home. Check the spelling, or try without the town.",
  bad_link: "That doesn’t look like a MyHome.ie or Daft.ie listing link.",
};
const euro = (v: number) => `€${Math.round(v).toLocaleString("en-IE")}`;

/** The one search box: an address, Eircode or listing link, to that home's page. */
export default function HomeSearch({ autoFocus = false, placeholder = "Address, Eircode or a Daft/MyHome link" }: { autoFocus?: boolean; placeholder?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function go(event?: React.FormEvent, value = q) {
    event?.preventDefault();
    if (value.trim().length < 3) return;
    setBusy(true);
    setMessage(null);
    setHits(null);
    try {
      const res = await fetch(`/api/home/search?q=${encodeURIComponent(value.trim())}`);
      const data = await res.json();
      trackEvent({ action: "home_search", category: "tools", label: data.kind ?? "error" });
      if (!res.ok) return setMessage("The search didn’t work just now. Try again in a moment.");
      if (data.kind === "homes" && data.homes.length === 1) return router.push(`/home/${data.homes[0].slug}`);
      if (data.kind === "homes") return setHits(data.homes);
      if (data.kind === "check") return router.push(data.href);
      setMessage(REASONS[data.reason] ?? REASONS.not_found);
    } catch {
      setMessage("The search didn’t work just now. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rp-homesearch">
      <form className="rp-areacheck-search" onSubmit={go}>
        <label className="rp-visually-hidden" htmlFor="home-search">
          A home&apos;s address, Eircode or listing link
        </label>
        <input
          id="home-search"
          value={q}
          autoFocus={autoFocus}
          autoComplete="street-address"
          spellCheck={false}
          placeholder={placeholder}
          onChange={(e) => setQ(e.target.value)}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData("text");
            if (/(daft\.ie|myhome\.ie)\//i.test(pasted)) {
              e.preventDefault();
              setQ(pasted);
              go(undefined, pasted);
            }
          }}
        />
        <button type="submit" disabled={busy || q.trim().length < 3}>
          {busy ? "Looking…" : "Look up"}
        </button>
      </form>
      {message && (
        <p className="rp-homesearch-message" role="status">
          {message}
        </p>
      )}
      {hits && (
        <div className="rp-homesearch-hits">
          <p className="rp-homesearch-message">{hits.length} homes match. Which one?</p>
          <ul>
            {hits.map((h) => (
              <li key={h.slug}>
                <Link href={`/home/${h.slug}`}>
                  <span>{h.address}</span>
                  <small>{h.lastSold && h.lastPrice ? `sold ${euro(h.lastPrice)} in ${h.lastSold.slice(0, 4)}` : h.county}</small>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
