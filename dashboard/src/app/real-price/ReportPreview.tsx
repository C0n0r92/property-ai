"use client";

import { useEffect, useRef, useState } from "react";
import DotPlot from "./DotPlot";

interface PreviewSale {
  address: string;
  soldDate: string;
  askingPrice: number;
  soldPrice: number;
  overAskingPct: number;
}

interface Props {
  title: string;
  subtitle: string;
  price: number;
  count: number;
  dots: number[];
  salesPerDot: number;
  askingPrice: number;
  litUpTo: number;
  /** The comparable sales the free page shows; the rest are blurred */
  recent?: PreviewSale[];
  lockedSales?: number;
  areaLabel?: string;
  /** The area's quarter-by-quarter over-asking, for the trend page */
  trend?: Array<{ quarter: string; medianOverAskingPct: number }>;
}

const euro = (value: number) => `€${Math.round(value).toLocaleString("en-IE")}`;
const signed = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}%`;
const PAGES = ["Cover", "Bidding plan", "Every sale", "Area trend"] as const;
const shortQuarter = (q: string) => {
  const [y, n] = q.split(" ");
  return `${n} ’${y.slice(2)}`;
};

/**
 * Four real pages of the report, built live for the current check and held
 * in 3D. The front page slides to the back every few seconds; the tabs pick a
 * page. What the report sells (bid levels, every address) is shown blurred.
 */
export default function ReportPreview(props: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const [front, setFront] = useState(0);
  const [paused, setPaused] = useState(false);
  const recent = props.recent ?? [];
  const locked = Math.min(9, props.lockedSales ?? 0);
  const trend = (props.trend ?? []).slice(-8);
  const trendMax = Math.max(1, ...trend.map((t) => t.medianOverAskingPct));

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setFront((f) => (f + 1) % PAGES.length), 3800);
    return () => window.clearInterval(timer);
  }, [paused]);

  function onMove(event: React.PointerEvent) {
    const el = stage.current;
    if (!el || event.pointerType !== "mouse") return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--rx", String(((event.clientY - rect.top) / rect.height - 0.5) * -12));
    el.style.setProperty("--ry", String(((event.clientX - rect.left) / rect.width - 0.5) * 18));
  }

  function onLeave() {
    stage.current?.style.removeProperty("--rx");
    stage.current?.style.removeProperty("--ry");
    setPaused(false);
  }

  // Ladder rungs from asking up: shape only, the figures are the paid part
  const rungs = [0, 2.5, 5, 7.5, 10, 12.5, 15];
  const sheets = [
    <div key="cover" className="rp-preview-cover-inner">
      <div className="rp-preview-brand">Real Price Report</div>
      <div className="rp-preview-title">{props.title}</div>
      <div className="rp-preview-sub">{props.subtitle}</div>
      <div className="rp-preview-plot">
        <DotPlot
          values={props.dots}
          salesPerDot={props.salesPerDot}
          askingPrice={props.askingPrice}
          litUpTo={props.litUpTo}
          height={120}
          fixedWidth={248}
        />
      </div>
      <div className="rp-preview-answer">
        <small>Likely to sell for about</small>
        <strong>{euro(props.price)}</strong>
        <small>Based on {props.count} comparable sales</small>
      </div>
    </div>,
    <div key="plan" className="rp-preview-page">
      <div className="rp-preview-page-kicker">Page 2</div>
      <div className="rp-preview-page-title">Your bidding plan</div>
      <p className="rp-preview-page-text">What each bid has won, from asking to where almost nobody goes past.</p>
      <div className="rp-preview-ladder">
        {rungs.map((r, i) => (
          <div key={r} className="rp-preview-rung">
            <span>{r === 0 ? "Asking" : `+${r}%`}</span>
            <i style={{ width: `${18 + i * 12}%` }} />
            <b className={i > 1 ? "rp-preview-blur" : ""}>{i > 1 ? "€●●●,000" : euro(Math.round((props.askingPrice * (1 + r / 100)) / 1000) * 1000)}</b>
          </div>
        ))}
      </div>
    </div>,
    <div key="sales" className="rp-preview-page">
      <div className="rp-preview-page-kicker">Page 3</div>
      <div className="rp-preview-page-title">Every comparable sale</div>
      <div className="rp-preview-sales">
        {recent.slice(0, 3).map((s) => (
          <div key={`${s.address}-${s.soldDate}`} className="rp-preview-sale">
            <span>{s.address.split(",")[0]}</span>
            <b>{euro(s.soldPrice)}</b>
            <em>{signed(s.overAskingPct)}</em>
          </div>
        ))}
        {Array.from({ length: locked }, (_, i) => (
          <div key={`l${i}`} className="rp-preview-sale rp-preview-blur" aria-hidden="true">
            <span>{["14 Harbour Road", "7 Grove Park", "22 Mill Lane", "3 Church View", "51 Main Street", "9 The Green", "18 Elm Road", "2 Abbey Court", "40 Oak Avenue"][i]}</span>
            <b>€●●●,000</b>
            <em>+●.●%</em>
          </div>
        ))}
      </div>
      {props.lockedSales ? (
        <p className="rp-preview-page-text">and {props.lockedSales} more, each with its address, asking price and sale price.</p>
      ) : null}
    </div>,
    <div key="trend" className="rp-preview-page">
      <div className="rp-preview-page-kicker">Page {4}</div>
      <div className="rp-preview-page-title">How {props.areaLabel ?? "the area"} is moving</div>
      <p className="rp-preview-page-text">Typical sale against asking, quarter by quarter.</p>
      <div className="rp-preview-trend">
        {trend.map((t, i) => (
          <div key={t.quarter} className={`rp-preview-trend-col${i === trend.length - 1 ? " is-last" : ""}`}>
            <b>{signed(t.medianOverAskingPct)}</b>
            <i style={{ height: `${10 + (Math.max(0, t.medianOverAskingPct) / trendMax) * 80}%` }} />
            <span>{shortQuarter(t.quarter)}</span>
          </div>
        ))}
      </div>
    </div>,
  ];

  return (
    <div className="rp-preview-wrap">
      <div
        className="rp-preview"
        ref={stage}
        onPointerMove={onMove}
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={onLeave}
        aria-hidden="true"
      >
        <div className="rp-preview-stack">
          {sheets.map((sheet, i) => {
            const depth = (i - front + PAGES.length) % PAGES.length;
            return (
              <div
                key={i}
                className={`rp-preview-sheet rp-preview-deck${i === 0 ? " rp-preview-cover" : ""}${depth === 0 ? " is-front" : ""}`}
                style={{ "--depth": depth } as React.CSSProperties}
              >
                {sheet}
              </div>
            );
          })}
        </div>
      </div>
      <div className="rp-preview-tabs" role="tablist" aria-label="Pages of the report">
        {PAGES.map((p, i) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={front === i}
            className="rp-preview-tab"
            onClick={() => {
              setFront(i);
              setPaused(true);
            }}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
