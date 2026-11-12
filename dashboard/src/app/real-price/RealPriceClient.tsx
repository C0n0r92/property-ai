"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Tier, TypeGroup } from "@/lib/real-price/model";
import type { PublicResult } from "@/lib/real-price/public";
import type { AreaOption } from "@/lib/real-price/store";
import { trackEvent } from "@/lib/analytics";
import DotPlot from "./DotPlot";
import HeroScene from "./HeroScene";
import RealPriceNav from "./RealPriceNav";
import EmailResult from "./EmailResult";
import MarketExplorer from "./MarketExplorer";
import type { Market } from "@/lib/real-price/market";
import ReportPreview from "./ReportPreview";
import SalesBoard, { type BoardSale } from "./SalesBoard";

const Diorama = dynamic(() => import("./Diorama"), { ssr: false });

export interface Answer {
  areaLabel: string;
  result: PublicResult;
}

interface FormState {
  areaKey: string;
  typeGroup: TypeGroup;
  beds: number;
  askingPrice: number;
}

interface Props {
  areas: AreaOption[];
  dataTo: string;
  salesCount: number;
  reportPriceEuro: number;
  initial: { form: FormState; answer: Answer };
  boardSales: BoardSale[];
  market: Market;
  backtest: {
    testYear: number;
    salesTested: number;
    insideFullRangePct: number;
    insideLikelyRangePct: number;
    medianErrorModelPct: number;
    medianErrorAskingPct: number;
  };
}

const TYPES: Array<{ value: TypeGroup; label: string; plural: string }> = [
  { value: "apartment", label: "apartment", plural: "apartments" },
  { value: "terraced", label: "terraced house", plural: "terraced houses" },
  {
    value: "semi",
    label: "semi-detached house",
    plural: "semi-detached houses",
  },
  { value: "detached", label: "detached house", plural: "detached houses" },
];

const ERRORS: Record<string, string> = {
  not_enough_sales:
    "Too few recent sales match that home to give an honest answer. Try a wider area or a different type.",
  unknown_area: "That area is not in the sales data yet. Choose another.",
  invalid_request: "Enter an asking price between €50,000 and €20,000,000.",
  checkout_failed:
    "Payment could not be started. Nothing was charged. Try again in a moment.",
};

const euro = (value: number) => `€${Math.round(value).toLocaleString("en-IE")}`;
const signed = (value: number) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

function evidenceSentence(
  tier: Tier,
  count: number,
  plural: string,
  area: string,
): string {
  const n = count.toLocaleString("en-IE");
  switch (tier) {
    case "area-type-size":
      return `${n} ${plural} of a similar size and asking price in ${area}`;
    case "area-type":
      return `${n} ${plural} in ${area}`;
    case "area":
      return `${n} homes of every type in ${area}, because too few ${plural} sold there`;
    case "area-2y":
      return `${n} homes of every type in ${area} over two years, because recent sales there are thin`;
    default:
      return `${n} ${plural} across Dublin, because too few homes sold in ${area}`;
  }
}

/** Ease a displayed number towards its target whenever the target changes. */
function useTween(target: number, duration = 700): number {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      from.current = target;
      setValue(target);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let frame = requestAnimationFrame(function tick(now) {
      const p = Math.min(1, (now - start) / duration);
      const current = origin + (target - origin) * (1 - Math.pow(1 - p, 3));
      from.current = current;
      setValue(current);
      if (p < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

export default function RealPriceClient({
  areas,
  dataTo,
  salesCount,
  reportPriceEuro,
  initial,
  backtest,
  boardSales,
  market,
}: Props) {
  const [form, setForm] = useState<FormState>(initial.form);
  const [priceText, setPriceText] = useState(
    initial.form.askingPrice.toLocaleString("en-IE"),
  );
  const [answer, setAnswer] = useState<Answer>(initial.answer);
  const [answeredFor, setAnsweredFor] = useState<FormState>(initial.form);
  const [error, setError] = useState<string | null>(null);
  const [bidPct, setBidPct] = useState(0);
  const [plotPlay, setPlotPlay] = useState<string | undefined>(undefined);
  const [no3d, setNo3d] = useState(false);
  const [address, setAddress] = useState("");
  const [eircode, setEircode] = useState("");
  const [offerError, setOfferError] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const [touched, setTouched] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const hero = useRef<HTMLElement>(null);
  const plotBox = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  const { result, areaLabel } = answer;
  const { prediction, evidence, dots } = result;
  const asking = answeredFor.askingPrice;
  const type = TYPES.find((t) => t.value === answeredFor.typeGroup)!;
  const shownPrice = useTween(prediction.mid);

  const districts = useMemo(
    () => areas.filter((a) => a.kind === "district"),
    [areas],
  );
  const localities = useMemo(
    () => areas.filter((a) => a.kind === "locality"),
    [areas],
  );
  const formAreaLabel =
    areas.find((a) => a.key === form.areaKey)?.label ?? "choose an area";
  const dioramaSales = useMemo(
    () => [
      ...evidence.recent.map((sale) => ({ ...sale, locked: false })),
      // The rest of the street is in the report
      ...Array.from({ length: Math.min(2, result.lockedSales) }, () => ({
        address: "",
        soldDate: "",
        askingPrice: 0,
        soldPrice: 0,
        overAskingPct: 0,
        locked: true,
      })),
    ],
    [evidence.recent, result.lockedSales],
  );
  const hoveredSale = hovered === null ? null : (dioramaSales[hovered] ?? null);

  const check = useCallback(async (next: FormState) => {
    const id = ++requestId.current;
    try {
      const response = await fetch("/api/real-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const data = await response.json();
      if (id !== requestId.current) return;
      if (!response.ok) {
        setError(
          ERRORS[data.error] ??
            "The check did not complete. Try again in a moment.",
        );
        return;
      }
      setError(null);
      setAnswer(data);
      setAnsweredFor(next);
      // Keep the address bar in step so a result can be shared or bookmarked
      const params = new URLSearchParams({
        area: next.areaKey,
        type: next.typeGroup,
        beds: String(next.beds),
        asking: String(next.askingPrice),
      });
      window.history.replaceState(null, "", `?${params.toString()}`);
      setPlotPlay(
        `${next.areaKey}-${next.typeGroup}-${next.beds}-${next.askingPrice}`,
      );
      trackEvent({
        action: "real_price_check",
        category: "tools",
        label: next.areaKey,
      });
    } catch {
      if (id === requestId.current)
        setError("The check did not complete. Try again in a moment.");
    }
  }, []);

  function update(patch: Partial<FormState>) {
    setTouched(true);
    const next = { ...form, ...patch };
    setForm(next);
    check(next);
  }

  function commitPrice() {
    const value = Number(priceText.replace(/[^0-9]/g, ""));
    if (value < 50_000 || value > 20_000_000)
      return setError(ERRORS.invalid_request);
    setPriceText(value.toLocaleString("en-IE"));
    if (value !== form.askingPrice) update({ askingPrice: value });
  }

  // Show the sticky report bar between the hero and the offer
  useEffect(() => {
    const heroEl = hero.current;
    const offerEl = document.getElementById("report");
    if (!heroEl || !offerEl) return;
    let pastHero = false;
    let atOffer = false;
    const sync = () => setShowBar(pastHero && !atOffer);
    const heroObserver = new IntersectionObserver(([entry]) => {
      pastHero = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      sync();
    });
    const offerObserver = new IntersectionObserver(([entry]) => {
      atOffer = entry.isIntersecting || entry.boundingClientRect.top < 0;
      sync();
    });
    heroObserver.observe(heroEl);
    offerObserver.observe(offerEl);
    return () => {
      heroObserver.disconnect();
      offerObserver.disconnect();
    };
  }, []);

  // Play the plot's entrance the first time it scrolls into view
  useEffect(() => {
    const el = plotBox.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setPlotPlay((current) => current ?? "first");
        observer.disconnect();
      },
      { threshold: 0.35 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // After each entrance, glide the bid handle from asking to the even-odds bid
  useEffect(() => {
    if (!plotPlay) return;
    const target = Math.round(prediction.medianOverAskingPct * 2) / 2;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setBidPct(target);
      return;
    }
    setBidPct(0);
    const start = performance.now() + 900;
    let frame = requestAnimationFrame(function tick(now) {
      const p = Math.min(1, Math.max(0, (now - start) / 1100));
      setBidPct(Math.round(target * (1 - Math.pow(1 - p, 3)) * 2) / 2);
      if (p < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
    // Replays only when a new answer arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plotPlay]);

  // Parallax for the fallback illustration when 3D is unavailable
  useEffect(() => {
    const el = hero.current;
    if (!el || !no3d) return;
    const onMove = (event: PointerEvent) => {
      el.style.setProperty(
        "--mx",
        String((event.clientX / window.innerWidth - 0.5) * 2),
      );
      el.style.setProperty(
        "--my",
        String((event.clientY / window.innerHeight - 0.5) * 2),
      );
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [no3d]);

  async function buyReport() {
    if (address.trim().length < 6) {
      setOfferError(
        "Add the address of the home you’re bidding on. It goes on the cover.",
      );
      return;
    }
    setBuying(true);
    setOfferError(null);
    trackEvent({
      action: "real_price_report_checkout",
      category: "tools",
      label: answeredFor.areaKey,
    });
    try {
      const response = await fetch("/api/real-price/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: answeredFor,
          address: address.trim(),
          eircode: eircode.trim() || undefined,
        }),
      });
      const data = await response.json();
      if (response.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setOfferError(
        data.error === "invalid_request"
          ? "Check the address and Eircode. An Eircode looks like D08 TW8P."
          : (ERRORS[data.error] ?? ERRORS.checkout_failed),
      );
    } catch {
      setOfferError(ERRORS.checkout_failed);
    }
    setBuying(false);
  }

  const beaten = dots.values.filter((v) => v <= bidPct).length;
  const bidPrice = Math.round((asking * (1 + bidPct / 100)) / 1000) * 1000;

  return (
    <>
      <section className="rp-hero" ref={hero}>
        <RealPriceNav />
        <div className="rp-hero-grid">
          <div className="rp-hero-copy">
            <p className={`rp-hint${touched ? " rp-hint--done" : ""}`}>
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d="M6 1.5v8.2L4.3 8a1.3 1.3 0 0 0-1.9 1.8l3.4 3.9c.5.5 1.1.8 1.8.8H11a3 3 0 0 0 3-3V7.6a1.2 1.2 0 0 0-2.4 0V7a1.2 1.2 0 0 0-2.4 0v-.5a1.2 1.2 0 0 0-2.4 0V1.5a1.2 1.2 0 0 0-2.4 0Z"
                  fill="currentColor"
                />
              </svg>
              {touched
                ? "Updated from real sales"
                : "Tap the blue words to describe the home you’re looking at"}
            </p>
            <h1 className="rp-sentence">
              A{" "}
              <span className="rp-field">
                <span>{form.beds}-bed</span>
                <svg
                  className="rp-field-icon"
                  viewBox="0 0 12 12"
                  aria-hidden="true"
                >
                  <path
                    d="M2.5 4.5 6 8l3.5-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <select
                  aria-label="Bedrooms"
                  value={form.beds}
                  onChange={(e) => update({ beds: Number(e.target.value) })}
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n}-bed
                    </option>
                  ))}
                </select>
              </span>{" "}
              <span className="rp-field">
                <span>
                  {TYPES.find((t) => t.value === form.typeGroup)!.label}
                </span>
                <svg
                  className="rp-field-icon"
                  viewBox="0 0 12 12"
                  aria-hidden="true"
                >
                  <path
                    d="M2.5 4.5 6 8l3.5-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <select
                  aria-label="Property type"
                  value={form.typeGroup}
                  onChange={(e) =>
                    update({ typeGroup: e.target.value as TypeGroup })
                  }
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </span>{" "}
              in{" "}
              <span className="rp-field">
                <span>{formAreaLabel}</span>
                <svg
                  className="rp-field-icon"
                  viewBox="0 0 12 12"
                  aria-hidden="true"
                >
                  <path
                    d="M2.5 4.5 6 8l3.5-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <select
                  aria-label="Area"
                  value={form.areaKey}
                  onChange={(e) => update({ areaKey: e.target.value })}
                >
                  <optgroup label="Postal districts">
                    {districts.map((a) => (
                      <option key={a.key} value={a.key}>
                        {a.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Towns and neighbourhoods">
                    {localities.map((a) => (
                      <option key={a.key} value={a.key}>
                        {a.label}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </span>{" "}
              asking{" "}
              <span
                className="rp-field rp-field--price"
                style={
                  {
                    "--chars": `${priceText.length * 0.92}ch`,
                  } as React.CSSProperties
                }
              >
                €
                <input
                  aria-label="Asking price in euro"
                  inputMode="numeric"
                  value={priceText}
                  onChange={(e) => setPriceText(e.target.value)}
                  onBlur={commitPrice}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                />
                <svg
                  className="rp-field-icon"
                  viewBox="0 0 12 12"
                  aria-hidden="true"
                >
                  <path
                    d="M8.2 1.8 10.2 3.8 4 10 1.6 10.4 2 8z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>{" "}
              <span className="rp-answer">
                will really sell for about
                <span className="rp-answer-price" aria-live="polite">
                  {euro(Math.round(shownPrice / 1000) * 1000)}
                </span>
              </span>
            </h1>

            {error ? (
              <p className="rp-error" role="alert">
                {error}
              </p>
            ) : (
              <p className="rp-lede">
                In Dublin the asking price is where the bidding starts. This is
                what happened to{" "}
                <strong>
                  {evidenceSentence(
                    result.tier,
                    evidence.count,
                    type.plural,
                    areaLabel,
                  )}
                </strong>
                .
              </p>
            )}
            <div className="rp-hero-actions">
              <a className="rp-button rp-button--ink" href="#report">
                Get the full bidding report
              </a>
              <a className="rp-link" href="#bid">
                Try a bid first
              </a>
            </div>
          </div>

          <div
            className="rp-scene-box"
            onClick={() => {
              // A locked house leads to what the report holds
              if (hoveredSale?.locked) {
                document
                  .getElementById("report")
                  ?.scrollIntoView({ behavior: "smooth" });
              }
            }}
          >
            {no3d ? (
              <HeroScene />
            ) : (
              <Diorama
                sales={dioramaSales}
                onHover={setHovered}
                onUnavailable={() => setNo3d(true)}
              />
            )}

            <div className="rp-glass rp-glass--a">
              <b>{Math.round(prediction.shareAboveAsking * 100)}%</b>
              <span>sold above asking</span>
            </div>
            <div
              className="rp-glass rp-glass--b"
              style={{ animationDelay: "-3s, 150ms" }}
            >
              <b>{signed(prediction.medianOverAskingPct)}</b>
              <span>typical result on asking</span>
            </div>

            {hoveredSale?.locked ? (
              <div className="rp-glass rp-sale-card" role="status">
                <span className="rp-sale-card-address">
                  {result.lockedSales} more sales in the report
                </span>
                <span className="rp-sale-card-row">
                  Every address, asking price and sold price.
                </span>
                <span className="rp-sale-card-date rp-sale-card-cta">
                  Click the house to see what the report includes
                </span>
              </div>
            ) : hoveredSale ? (
              <div className="rp-glass rp-sale-card" role="status">
                <span className="rp-sale-card-address">
                  {hoveredSale.address}
                </span>
                <span className="rp-sale-card-row">
                  Asked <b>{euro(hoveredSale.askingPrice)}</b>
                </span>
                <span className="rp-sale-card-row">
                  Sold <b>{euro(hoveredSale.soldPrice)}</b>
                  <em
                    className={
                      hoveredSale.overAskingPct > 0 ? "rp-over" : "rp-under"
                    }
                  >
                    {signed(hoveredSale.overAskingPct)}
                  </em>
                </span>
                <span className="rp-sale-card-date">
                  {longDate(hoveredSale.soldDate)}
                </span>
              </div>
            ) : (
              !no3d && (
                <p className="rp-scene-note">
                  The five most recent similar sales. Point at a house to see
                  what it sold for.
                </p>
              )
            )}
          </div>
        </div>
      </section>

      <div className="rp-wrap">
        <h2 className="rp-h2" id="bid">
          Drag the gold line to try a bid.
        </h2>
        <p className="rp-statement-sub">
          Every dot is{" "}
          {dots.salesPerDot === 1
            ? "one real sale"
            : `about ${dots.salesPerDot} real sales`}
          , placed by how far over or under its asking price it closed.
        </p>

        <div ref={plotBox}>
          <DotPlot
            values={dots.values}
            salesPerDot={dots.salesPerDot}
            askingPrice={asking}
            bidPct={bidPct}
            onBidChange={setBidPct}
            playKey={plotPlay}
          />
        </div>
        <div className="rp-plot-caption">
          <span className="rp-key">
            <i className="rp-key--lit" /> Sales your bid would have won
          </span>
          <span className="rp-key">
            <i /> Sales that went higher
          </span>
        </div>

        <p className="rp-statement">
          A final bid of <b>{euro(bidPrice)}</b> would have been enough in{" "}
          <b>
            {beaten} of {dots.values.length}
          </b>{" "}
          similar sales.
        </p>

        <div className="rp-bids">
          <button
            type="button"
            className="rp-bid"
            onClick={() =>
              setBidPct(Math.round(prediction.medianOverAskingPct * 2) / 2)
            }
          >
            <span className="rp-bid-odds">Even odds</span>
            <span className="rp-bid-price">{euro(prediction.mid)}</span>
            <span className="rp-bid-over">
              {signed((prediction.mid / asking - 1) * 100)} on asking
            </span>
          </button>
          {["Wins three times in four", "Rarely beaten"].map((odds) => (
            <a key={odds} className="rp-bid rp-bid--locked" href="#report">
              <span className="rp-bid-odds">{odds}</span>
              <span className="rp-bid-price" aria-hidden="true">
                €●●●,000
              </span>
              <span className="rp-bid-over">
                <svg viewBox="0 0 12 12" aria-hidden="true">
                  <path
                    d="M3.5 5.5V4a2.5 2.5 0 0 1 5 0v1.5M2.5 5.5h7v5h-7z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinejoin="round"
                  />
                </svg>
                In your report
              </span>
            </a>
          ))}
        </div>

        <EmailResult
          query={answeredFor}
          areaLabel={areaLabel}
          likelyPrice={prediction.mid}
          homeLabel={`${answeredFor.beds}-bed ${type.label} in ${areaLabel}`}
        />

        <MarketExplorer initial={market} homeArea={answeredFor.areaKey} />

        <section className="rp-board-section">
          <div className="rp-board-intro">
            <h2 className="rp-h2">Asked, then sold.</h2>
            <p className="rp-prose">
              The latest Dublin sales in our records, with the price on the sign
              beside the price the buyer paid. Public records only show the
              second number. We have both, for{" "}
              {salesCount.toLocaleString("en-IE")} homes.
            </p>
          </div>
          <SalesBoard sales={boardSales} />
        </section>

        <section className="rp-offer" id="report">
          <div>
            <h2 className="rp-h2">
              Take the whole picture to the bidding, as a PDF.
            </h2>
            <p className="rp-offer-anchor">
              Here, an even-odds bid and one that is rarely beaten are{" "}
              <strong>{euro(result.gapToRarelyBeaten)} apart</strong>. The
              report shows every comparable sale in that range, so you know
              where to stop.
            </p>
            <ul className="rp-offer-list">
              <li>
                <strong>Your bidding plan</strong>: what each bid level has won,
                from asking price to the point almost nobody goes past.
              </li>
              <li>
                <strong>Every comparable sale</strong>: address, asking price,
                sale price and date. You have seen {evidence.recent.length}; the
                report has up to {Math.min(72, evidence.count)}.
              </li>
              <li>
                <strong>How {areaLabel} is moving</strong>: over-asking and
                prices, quarter by quarter.
              </li>
              <li>
                <strong>What sold this year</strong>: the latest prices from the
                national Property Price Register.
              </li>
            </ul>
            <div className="rp-home-fields">
              <label className="rp-home-field rp-home-field--address">
                <span>Address of the home you’re bidding on</span>
                <input
                  value={address}
                  maxLength={120}
                  autoComplete="street-address"
                  placeholder="14 Rialto Street, Dublin 8"
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setOfferError(null);
                  }}
                />
              </label>
              <label className="rp-home-field">
                <span>Eircode (optional)</span>
                <input
                  value={eircode}
                  maxLength={8}
                  autoComplete="postal-code"
                  placeholder="D08 TW8P"
                  onChange={(e) => setEircode(e.target.value.toUpperCase())}
                />
              </label>
            </div>
            {offerError && (
              <p className="rp-offer-error" role="alert">
                {offerError}
              </p>
            )}
            <div className="rp-offer-actions">
              <button
                type="button"
                className="rp-button"
                onClick={buyReport}
                disabled={buying}
              >
                {buying
                  ? "Opening payment…"
                  : `Get the report for €${reportPriceEuro}`}
              </button>
              <Link className="rp-link" href="/real-price/report?sample=1">
                See a sample report
              </Link>
            </div>
            <p className="rp-offer-note">
              One payment, no account and no subscription. The report opens
              straight after payment and saves as a PDF.
            </p>
          </div>
          <ReportPreview
            title={
              address.trim() ||
              `${areaLabel}, ${answeredFor.beds}-bed ${type.label}`
            }
            subtitle={`Asking ${euro(asking)}`}
            price={prediction.mid}
            count={evidence.count}
            dots={dots.values}
            salesPerDot={dots.salesPerDot}
            askingPrice={asking}
            litUpTo={prediction.medianOverAskingPct}
          />
        </section>

        <section className="rp-section">
          <h2 className="rp-h2">How it works, and how often it is right</h2>
          <div className="rp-prose">
            <p>
              We hold the asking price and the final sale price of{" "}
              <strong>{salesCount.toLocaleString("en-IE")} Dublin homes</strong>
              . For the home you describe, we find the most similar recent sales
              and apply how they finished, relative to their asking prices, to
              yours. Our asking-price records run to {longDate(dataTo)}.
            </p>
            <p>
              We tested this on {backtest.salesTested.toLocaleString("en-IE")}{" "}
              sales from {backtest.testYear} that the method had never seen.{" "}
              <strong>
                The sale price landed inside our full range{" "}
                {backtest.insideFullRangePct}% of the time.
              </strong>{" "}
              Our middle estimate was typically {backtest.medianErrorModelPct}%
              away from the sale price; the asking price on its own was{" "}
              {backtest.medianErrorAskingPct}% away.
            </p>
            <p>
              It cannot see a home&apos;s condition or the mood of one bidding
              round, and it is not a valuation. Use it to judge how far an
              asking price is likely to move, alongside a viewing and a survey.
            </p>
          </div>
        </section>
      </div>

      <div
        className={`rp-bar${showBar ? " rp-bar--on" : ""}`}
        aria-hidden={!showBar}
      >
        <span className="rp-bar-text">
          Likely <b>{euro(prediction.mid)}</b>
          <small>
            {answeredFor.beds}-bed in {areaLabel}
          </small>
        </span>
        <a
          className="rp-button rp-button--ink"
          href="#report"
          tabIndex={showBar ? 0 : -1}
        >
          Full report €{reportPriceEuro}
        </a>
      </div>
    </>
  );
}
