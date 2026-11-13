"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics";
import type { ListingAnswer } from "@/lib/real-price/listing-lookup";

const euro = (value: number) => `€${Math.round(value).toLocaleString("en-IE")}`;
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IE", { day: "numeric", month: "short" });

const MISSING_WORDS: Record<ListingAnswer["missing"][number], string> = {
  area: "the area",
  type: "the type of home",
  beds: "the bedrooms",
  asking: "the asking price",
};

/**
 * "Paste a listing link": reads a MyHome.ie or Daft.ie link and fills in the
 * sentence above with the home it describes.
 */
export default function PasteListing({
  onHome,
  autoFocus = false,
}: {
  onHome: (home: ListingAnswer["home"], missing: ListingAnswer["missing"]) => void;
  /** Focus the box when it appears (it opens from the hint) */
  autoFocus?: boolean;
}) {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [answer, setAnswer] = useState<ListingAnswer | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function read(link: string) {
    if (!link.trim()) return;
    setState("busy");
    setMessage(null);
    try {
      const response = await fetch(`/api/real-price/listing?url=${encodeURIComponent(link.trim())}`);
      const data = await response.json();
      if (!response.ok) {
        setState("error");
        setAnswer(null);
        setMessage(
          data.error === "unrecognised_link"
            ? "That doesn’t look like a MyHome.ie or Daft.ie listing link."
            : "The link couldn’t be read just now. Try again in a moment.",
        );
        return;
      }
      const result = data as ListingAnswer;
      setAnswer(result);
      setState("idle");
      onHome(result.home, result.missing);
      const still = result.missing.map((m) => MISSING_WORDS[m]);
      setMessage(
        still.length
          ? `Filled in what the link says. Add ${still.join(" and ")} above.`
          : null,
      );
      trackEvent({
        action: "real_price_paste_listing",
        category: "tools",
        label: result.status,
      });
    } catch {
      setState("error");
      setMessage("The link couldn’t be read just now. Try again in a moment.");
    }
  }

  const listing = answer?.listing;
  const history = listing?.priceHistory ?? [];
  const first = history[0];
  const last = history[history.length - 1];

  return (
    <div className="rp-paste">
      <form
        className="rp-paste-form"
        onSubmit={(e) => {
          e.preventDefault();
          read(url);
        }}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" className="rp-paste-icon">
          <path
            d="M6.8 9.2a2.6 2.6 0 0 0 3.7 0l2.2-2.2a2.6 2.6 0 0 0-3.7-3.7l-.8.8M9.2 6.8a2.6 2.6 0 0 0-3.7 0L3.3 9a2.6 2.6 0 0 0 3.7 3.7l.8-.8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        <label className="rp-visually-hidden" htmlFor="rp-paste-url">
          Listing link
        </label>
        <input
          id="rp-paste-url"
          autoFocus={autoFocus}
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="Paste a MyHome or Daft link"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData("text");
            if (pasted) {
              e.preventDefault();
              setUrl(pasted);
              read(pasted);
            }
          }}
        />
        <button type="submit" disabled={state === "busy" || !url.trim()}>
          {state === "busy" ? "Reading…" : "Check it"}
        </button>
      </form>

      {listing && (
        <p className="rp-paste-found" role="status">
          <b>{listing.address}</b>
          <span>
            {listing.saleAgreed ? "Sale agreed" : `Listed ${shortDate(listing.listedSince)}`}
          </span>
          {first && last && first.price !== last.price && (
            <span className={last.price < first.price ? "rp-paste-cut" : ""}>
              Asking {last.price < first.price ? "cut" : "raised"} from{" "}
              {euro(first.price)} to {euro(last.price)}
            </span>
          )}
        </p>
      )}
      {message && (
        <p className={`rp-paste-note${state === "error" ? " rp-paste-note--error" : ""}`} role="status">
          {message}
        </p>
      )}
    </div>
  );
}
