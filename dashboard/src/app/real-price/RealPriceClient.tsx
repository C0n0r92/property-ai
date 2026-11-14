"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Tier, TypeGroup } from "@/lib/real-price/model";
import type { PublicResult } from "@/lib/real-price/public";
import type { AreaOption } from "@/lib/real-price/store";
import CookieSettingsLink from "@/components/rp/CookieSettingsLink";
import { trackEvent } from "@/lib/analytics";
import { REFUND_DAYS, type ReportPrice } from "@/lib/real-price/pricing";
import DotPlot from "./DotPlot";
import HeroScene from "./HeroScene";
import RealPriceNav from "./RealPriceNav";
import EmailResult from "./EmailResult";
import MarketExplorer from "./MarketExplorer";
import type { Market } from "@/lib/real-price/market";
import type { MarketInsights } from "@/lib/real-price/insights";
import { CountUp, Reveal } from "@/components/rp/motion";
import PasteListing from "./PasteListing";
import type { ListingAnswer } from "@/lib/real-price/listing-lookup";
import ReportPreview from "./ReportPreview";
import SalesBoard, { type BoardSale } from "./SalesBoard";

// Holds the street's space while its code loads, so nothing below moves when it arrives
const Diorama = dynamic(() => import("./Diorama"), {
  ssr: false,
  loading: () => <div className="rp-diorama rp-diorama--loading" aria-hidden="true" />,
});

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
  price: ReportPrice;
  initial: { form: FormState; answer: Answer };
  boardSales: BoardSale[];
  market: Market;
  /** What the wider data shows; null without a database */
  insights: MarketInsights | null;
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
  too_many_requests:
    "Too many attempts in a short time. Nothing was charged. Try again in ten minutes.",
};

const euro = (value: number) => `€${Math.round(value).toLocaleString("en-IE")}`;
const signed = (value: number) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
/** Comparable sales listed in the paid report (see lib/real-price/report.ts). */
const REPORT_SALES = 72;
const COUNT_WORDS = ["", "one", "two", "three", "four", "five"];
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

/** The launch price, when it ends, and the refund promise, said plainly. */
function PriceLine({ price }: { price: ReportPrice }) {
  return (
    <p className="rp-price-line">
      {price.isLaunch && (
        <span className="rp-price-badge">
          Launch price until {price.launchEndsLabel}, then {price.regularLabel}
        </span>
      )}
      <span>{REFUND_DAYS}-day money-back guarantee</span>
    </p>
  );
}

export default function RealPriceClient({
  areas,
  dataTo,
  salesCount,
  price,
  initial,
  backtest,
  boardSales,
  market,
  insights,
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
  // Until the visitor gives a price, it follows what is typical for the home
  const [ownPrice, setOwnPrice] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("asking"),
  );
  const [autoPriced, setAutoPriced] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);

  async function copyLink() {
    const params = new URLSearchParams({
      area: answeredFor.areaKey,
      type: answeredFor.typeGroup,
      beds: String(answeredFor.beds),
      asking: String(answeredFor.askingPrice),
    });
    const link = `${window.location.origin}/?${params.toString()}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
      trackEvent({
        action: "real_price_share",
        category: "tools",
        label: answeredFor.areaKey,
      });
    } catch {
      // Clipboard blocked: the address bar already holds the same link
    }
  }
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

  const check = useCallback(async (asked: FormState, autoAsking = false) => {
    const id = ++requestId.current;
    let next = asked;
    try {
      const response = await fetch("/api/real-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...asked, autoAsking }),
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
      const moved =
        typeof data.askingPrice === "number" &&
        data.askingPrice !== asked.askingPrice;
      if (moved) {
        next = { ...asked, askingPrice: data.askingPrice };
        setForm((f) => ({ ...f, askingPrice: data.askingPrice }));
        setPriceText(data.askingPrice.toLocaleString("en-IE"));
      }
      setAutoPriced(Boolean(data.typicalUsed));
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

  function update(patch: Partial<FormState>, options: { typicalAsking?: boolean } = {}) {
    setTouched(true);
    const next = { ...form, ...patch };
    setForm(next);
    // A pasted listing without its asking price starts from the typical one,
    // never from whatever price was in the sentence before
    if (options.typicalAsking) setOwnPrice(false);
    const pricedByVisitor = !options.typicalAsking && (ownPrice || patch.askingPrice !== undefined);
    if (patch.askingPrice !== undefined) setOwnPrice(true);
    check(next, !pricedByVisitor);
  }

  // A pasted listing fills in whatever it tells us; the rest stays as it was
  function fromListing(
    home: ListingAnswer["home"],
    missing: ListingAnswer["missing"],
  ) {
    const patch: Partial<FormState> = {};
    if (home.areaKey) patch.areaKey = home.areaKey;
    if (home.typeGroup) patch.typeGroup = home.typeGroup;
    if (home.beds) patch.beds = home.beds;
    if (home.askingPrice) {
      patch.askingPrice = home.askingPrice;
      setPriceText(home.askingPrice.toLocaleString("en-IE"));
    }
    const noPrice = missing.includes("asking");
    if (Object.keys(patch).length || noPrice) update(patch, { typicalAsking: noPrice });
    if (noPrice) {
      document.getElementById("rp-asking")?.focus();
    }
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
          address: address.trim() || undefined,
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
          ? "Check the address and Eircode, or leave them out. An Eircode looks like D08 TW8P."
          : (ERRORS[data.error] ?? ERRORS.checkout_failed),
      );
    } catch {
      setOfferError(ERRORS.checkout_failed);
    }
    setBuying(false);
    // The message shows beside the offer, wherever the button was pressed
    document.getElementById("report")?.scrollIntoView({ behavior: "smooth" });
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
              <span>
                {autoPriced
                  ? "Typical asking price shown. Tap it to enter the real one"
                  : touched
                    ? "Updated from real sales"
                    : "Tap the blue words to describe the home"}
                {/* In one span with the text, so it wraps as a sentence */}
                {!pasteOpen && !autoPriced && (
                  <span>
                    , or{" "}
                    <button
                      type="button"
                      className="rp-hint-paste"
                      onClick={() => setPasteOpen(true)}
                    >
                      paste a listing link
                    </button>
                  </span>
                )}
              </span>
            </p>
            {pasteOpen && <PasteListing onHome={fromListing} autoFocus />}
            {/* The sentence below is also the form, so its text is full of
                choices; search engines and screen readers get this heading */}
            <h1 className="rp-visually-hidden">
              How much over asking will a Dublin home sell for?
            </h1>
            <div className="rp-sentence">
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
              {autoPriced ? "typically asks" : "asking"}{" "}
              <span
                className="rp-field rp-field--price"
                style={
                  {
                    // In em, not ch: ch follows the font, so the box would
                    // narrow when the web font replaces its stand-in and the
                    // sentence would re-wrap (a visible jump on phones)
                    "--chars": `${(priceText.length * 0.54).toFixed(2)}em`,
                  } as React.CSSProperties
                }
              >
                €
                <input
                  id="rp-asking"
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
                {autoPriced ? "and" : ""} will really sell for about
                <span className="rp-answer-row">
                  <span className="rp-answer-price" aria-live="polite">
                    {euro(Math.round(shownPrice / 1000) * 1000)}
                  </span>
                  <button
                    type="button"
                    className="rp-copy-icon"
                    onClick={copyLink}
                    aria-label={
                      copied ? "Link copied" : "Copy a link to this answer"
                    }
                    title={
                      copied ? "Link copied" : "Copy a link to this answer"
                    }
                  >
                    <svg
                      viewBox="0 0 16 16"
                      width="13"
                      height="13"
                      aria-hidden="true"
                    >
                      {copied ? (
                        <path
                          d="M3 8.5 6.5 12 13 4.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ) : (
                        <path
                          d="M6.8 9.2a2.6 2.6 0 0 0 3.7 0l2.2-2.2a2.6 2.6 0 0 0-3.7-3.7l-.8.8M9.2 6.8a2.6 2.6 0 0 0-3.7 0L3.3 9a2.6 2.6 0 0 0 3.7 3.7l.8-.8"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                        />
                      )}
                    </svg>
                    {copied && (
                      <span className="rp-copy-done">Link copied</span>
                    )}
                  </button>
                </span>
              </span>
            </div>

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
              <button
                type="button"
                className="rp-button rp-button--ink"
                onClick={buyReport}
                disabled={buying}
              >
                {buying
                  ? "Opening payment…"
                  : `Get the full report for ${price.label}`}
              </button>
              <Link className="rp-link" href="/real-price/report?sample=1">
                See a sample report
              </Link>
            </div>
            <p className="rp-price-quiet">
              {price.isLaunch
                ? `Launch price · ${price.regularLabel} from 1 January · `
                : ""}
              {REFUND_DAYS}-day money-back guarantee
            </p>
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
                type={answeredFor.typeGroup}
                beds={answeredFor.beds}
                onHover={setHovered}
                onUnavailable={() => setNo3d(true)}
              />
            )}

            <div className="rp-glass rp-glass--a">
              <b>{Math.round(prediction.shareAboveAsking * 100)}%</b>
              <span>of similar homes sold above asking</span>
            </div>
            <div
              className="rp-glass rp-glass--b"
              style={{ animationDelay: "-3s, 150ms" }}
            >
              {/* Worked from the rounded headline price, so it agrees with the bid tile below */}
              <b>{signed((prediction.mid / asking - 1) * 100)}</b>
              <span>typical sale price vs asking</span>
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
                  {evidence.recent.length === 1
                    ? "The most recent similar sale."
                    : `The ${COUNT_WORDS[evidence.recent.length] ?? evidence.recent.length} most recent similar sales.`}{" "}
                  <span className="rp-pointer-only">Point at</span>
                  <span className="rp-touch-only">Tap</span> a house to see what
                  it sold for.
                  {result.lockedSales > 0 &&
                    ` ${result.lockedSales} more are in the report.`}
                </p>
              )
            )}
          </div>
        </div>
      </section>

      {/* Where the answer comes from: just under the hero, out of its way */}
      <div className="rp-proof-band">
        <ul className="rp-proof" aria-label="Where the answer comes from">
          <li>
            <b>{salesCount.toLocaleString("en-IE")}</b> Dublin sales with both
            asking and sold price
          </li>
          <li>
            Tested on <b>{backtest.salesTested.toLocaleString("en-IE")}</b>{" "}
            unseen sales: typically <b>{backtest.medianErrorModelPct}%</b> from
            the final price.{" "}
            <a href="/track-record">Track record</a>
          </li>
          <li>Sales to {longDate(dataTo)}</li>
        </ul>
      </div>

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
        <MarketExplorer
          initial={market}
          homeArea={answeredFor.areaKey}
          onCheck={(areaKey) => {
            update({ areaKey });
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />

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

        {insights && (
          <Reveal as="section" className="rp-findings" aria-labelledby="rp-findings-title">
            <h2 className="rp-h2" id="rp-findings-title">
              What the sales show.
            </h2>
            <p className="rp-statement-sub">
              From the register&apos;s sales since 2010, paired with the asking prices we hold.
            </p>
            <div className="rp-findings-grid">
              <article className="rp-finding">
                <p className="rp-finding-kicker">Homes that sell again</p>
                <p className="rp-finding-figure">
                  <CountUp value={insights.repeat.medianGainPct} format="signedPct" decimals={0} />
                </p>
                <p className="rp-finding-text">
                  One in {Math.max(2, Math.round(insights.repeat.matched / Math.max(1, insights.repeat.withEarlier)))} homes
                  we&apos;ve matched had sold before. The typical one sold again{" "}
                  {insights.repeat.medianYears.toFixed(1)} years later for{" "}
                  {Math.round(insights.repeat.medianGainPct)}% more. The full report shows the home&apos;s own sales
                  history, and every sale on its street since 2010.
                </p>
              </article>
              <article className="rp-finding">
                <p className="rp-finding-kicker">€395,000 against €400,000</p>
                <div className="rp-finding-pair">
                  <div>
                    <p className="rp-finding-figure">
                      <CountUp value={insights.roundPricing.underMedianOverAskingPct} format="signedPct" />
                    </p>
                    <p className="rp-finding-label">just under a round figure</p>
                  </div>
                  <div>
                    <p className="rp-finding-figure rp-finding-figure--soft">
                      <CountUp value={insights.roundPricing.roundMedianOverAskingPct} format="signedPct" />
                    </p>
                    <p className="rp-finding-label">a round figure</p>
                  </div>
                </div>
                <p className="rp-finding-text">
                  Since 2024, homes asking just under a round figure sold further over asking, and more of them (
                  {Math.round(insights.roundPricing.underShareAbove * 100)}% against{" "}
                  {Math.round(insights.roundPricing.roundShareAbove * 100)}%) went above it.
                </p>
              </article>
            </div>
          </Reveal>
        )}

        <section className="rp-offer" id="report">
          <div>
            <h2 className="rp-h2">
              Take the whole picture to the bidding, as a PDF.
            </h2>
            <p className="rp-offer-anchor">
              Here, an even-odds bid and one that is rarely beaten are{" "}
              <strong>{euro(result.gapToRarelyBeaten)} apart</strong>. The
              report shows every comparable sale in that range, so you know
              where to stop. Going even €5,000 further than you needed to costs
              about{" "}
              {(
                Math.round(5000 / (price.cents / 100) / 10) * 10
              ).toLocaleString("en-IE")}{" "}
              times what the report does.
            </p>
            <ul className="rp-offer-list">
              <li>
                <strong>Your bidding plan</strong>: what each bid level has won,
                from asking price to the point almost nobody goes past.
              </li>
              <li>
                <strong>Every comparable sale</strong>: address, asking price,
                sale price and date. You have seen {evidence.recent.length}; the
                report has{" "}
                {evidence.count <= REPORT_SALES
                  ? `all ${evidence.count}`
                  : `the ${REPORT_SALES} most recent of ${evidence.count.toLocaleString("en-IE")}`}
                .
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
            <details className="rp-home-optional">
              <summary>Put the home’s address on the cover (optional)</summary>
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
            </details>
            {offerError && (
              <p className="rp-offer-error" role="alert">
                {offerError}
              </p>
            )}
            <PriceLine price={price} />
            <div className="rp-offer-actions">
              <button
                type="button"
                className="rp-button"
                onClick={buyReport}
                disabled={buying}
              >
                {buying
                  ? "Opening payment…"
                  : `Get the report for ${price.label}`}
              </button>
              <Link className="rp-link" href="/real-price/report?sample=1">
                See a sample report
              </Link>
            </div>
            <p className="rp-offer-note">
              One click to pay by card, Apple Pay or Google Pay. No account and
              no subscription. The report opens straight after payment and saves
              as a PDF. If it doesn&apos;t help, reply to your receipt within{" "}
              {REFUND_DAYS} days for a full refund.{" "}
              <Link href="/real-price/privacy">
                How we use an address if you add one
              </Link>
              .
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
            recent={evidence.recent}
            lockedSales={result.lockedSales}
            areaLabel={areaLabel}
            trend={
              market.areas.find((a) => a.key === answeredFor.areaKey)?.profile
                .trend
            }
          />
        </section>

        <EmailResult query={answeredFor} />

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
              {backtest.medianErrorAskingPct}% away.{" "}
              <a href="/track-record">See the track record, month by month</a>.
            </p>
            <p>
              It cannot see a home&apos;s condition or the mood of one bidding
              round, and it is not a valuation. Use it to judge how far an
              asking price is likely to move, alongside a viewing and a survey.
            </p>
          </div>
        </section>

        <footer className="rp-footer">
          <span>Sales up to {longDate(dataTo)}. Not a valuation.</span>
          <span>
            <Link href="/areas">Areas</Link>
            <Link href="/reports">Monthly report</Link>
            <Link href="/blog">Research</Link>
            <Link href="/real-price/privacy">Privacy</Link>
            <CookieSettingsLink />
          </span>
        </footer>
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
        <button
          type="button"
          className="rp-button rp-button--ink"
          onClick={buyReport}
          disabled={buying}
          tabIndex={showBar ? 0 : -1}
        >
          {buying ? "Opening payment…" : `Full report ${price.label}`}
        </button>
      </div>
    </>
  );
}
