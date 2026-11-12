"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Market, MarketArea, MarketType } from "@/lib/real-price/market";

interface Props {
  initial: Market;
  /** The area in the visitor's search, compared first. */
  homeArea: string;
}

const TYPES: Array<{ value: MarketType; label: string }> = [
  { value: "all", label: "all homes" },
  { value: "apartment", label: "apartments" },
  { value: "terraced", label: "terraced houses" },
  { value: "semi", label: "semi-detached houses" },
  { value: "detached", label: "detached houses" },
];

const SLOTS = 3;
const euro = (v: number) => `€${Math.round(v).toLocaleString("en-IE")}`;
const signed = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

function defaultPicks(market: Market, homeArea: string): string[] {
  const keys = new Set(market.areas.map((a) => a.key));
  const picks = keys.has(homeArea) ? [homeArea] : [];
  const busiest = market.areas
    .filter((a) => a.kind === "district" && a.key !== homeArea)
    .sort((a, b) => b.profile.count - a.profile.count);
  for (const area of busiest) {
    if (picks.length >= SLOTS) break;
    picks.push(area.key);
  }
  return picks;
}

const chevron = (
  <svg className="rp-field-icon" viewBox="0 0 12 12" aria-hidden="true">
    <path
      d="M2.5 4.5 6 8l3.5-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function MarketExplorer({ initial, homeArea }: Props) {
  const [type, setType] = useState<MarketType>(initial.type);
  const [markets, setMarkets] = useState<Partial<Record<MarketType, Market>>>({
    [initial.type]: initial,
  });
  // Slot i always shows in series colour i, so changing one area never repaints the others
  const [picks, setPicks] = useState<string[]>(() =>
    defaultPicks(initial, homeArea),
  );
  const market = markets[type] ?? initial;
  const loading = !markets[type];

  useEffect(() => {
    if (markets[type]) return;
    let cancelled = false;
    fetch(`/api/real-price/market?type=${type}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: Market) => {
        if (!cancelled) setMarkets((m) => ({ ...m, [type]: data }));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [type, markets]);

  const byKey = useMemo(
    () => new Map(market.areas.map((a) => [a.key, a])),
    [market],
  );
  const options = useMemo(
    () => ({
      districts: market.areas.filter((a) => a.kind === "district"),
      localities: market.areas
        .filter((a) => a.kind === "locality")
        .sort((a, b) => a.label.localeCompare(b.label)),
    }),
    [market],
  );
  const ranked = useMemo(
    () =>
      market.areas
        .filter((a) => a.kind === "district")
        .sort(
          (a, b) =>
            b.profile.medianOverAskingPct - a.profile.medianOverAskingPct,
        ),
    [market],
  );
  const slots = picks.map((key) => byKey.get(key) ?? null);

  function setSlot(index: number, key: string) {
    setPicks((current) => {
      const next = [...current];
      next[index] = key;
      return next;
    });
  }

  /** From the strip: swap the area into the last slot unless it's already there. */
  function bringIn(key: string) {
    setPicks((current) =>
      current.includes(key) ? current : [...current.slice(0, SLOTS - 1), key],
    );
  }

  const areaSelect = (index: number) => {
    const area = slots[index];
    return (
      <span
        className="rp-field rp-field--series"
        style={
          { "--series": `var(--series-${index + 1})` } as React.CSSProperties
        }
      >
        <i aria-hidden="true" />
        <span>{area?.label ?? "an area"}</span>
        {chevron}
        <select
          aria-label={`Area ${index + 1}`}
          value={picks[index] ?? ""}
          onChange={(e) => setSlot(index, e.target.value)}
        >
          <optgroup label="Postal districts">
            {options.districts.map((a) => (
              <option key={a.key} value={a.key}>
                {a.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Towns and neighbourhoods">
            {options.localities.map((a) => (
              <option key={a.key} value={a.key}>
                {a.label}
              </option>
            ))}
          </optgroup>
        </select>
      </span>
    );
  };

  return (
    <section
      className="rp-band rp-band--market"
      aria-labelledby="rp-market-title"
    >
      <div className="rp-band-inner">
        <h2 className="rp-sentence rp-band-sentence" id="rp-market-title">
          Compare <span className="rp-nowrap">{areaSelect(0)},</span>{" "}
          <span className="rp-nowrap">{areaSelect(1)}</span> and {areaSelect(2)}{" "}
          for{" "}
          <span className="rp-field">
            <span>{TYPES.find((t) => t.value === type)!.label}</span>
            {chevron}
            <select
              aria-label="Home type"
              value={type}
              onChange={(e) => setType(e.target.value as MarketType)}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </span>
        </h2>
        <p className="rp-lede rp-band-lede">
          How far over asking homes really sold in the last year of our records,
          and how that has moved.
        </p>

        <div className={`rp-tiles${loading ? " rp-tiles--loading" : ""}`}>
          {slots.map((area, i) =>
            area ? (
              <div
                key={`${i}-${area.key}`}
                className="rp-glass rp-tile"
                style={
                  {
                    "--series": `var(--series-${i + 1})`,
                    animationDelay: `${-i * 2}s, ${i * 90}ms`,
                  } as React.CSSProperties
                }
              >
                <span className="rp-tile-name">
                  <i aria-hidden="true" />
                  {area.label}
                </span>
                <b>{signed(area.profile.medianOverAskingPct)}</b>
                <span className="rp-tile-caption">
                  typical result on asking
                </span>
                <dl>
                  <div>
                    <dt>Sold above asking</dt>
                    <dd>{Math.round(area.profile.shareAboveAsking * 100)}%</dd>
                  </div>
                  <div>
                    <dt>Typical price</dt>
                    <dd>{euro(area.profile.medianPrice)}</dd>
                  </div>
                  <div>
                    <dt>Per m²</dt>
                    <dd>
                      {area.profile.medianPricePerSqm
                        ? euro(area.profile.medianPricePerSqm)
                        : "–"}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : (
              <div
                key={`empty-${i}`}
                className="rp-glass rp-tile rp-tile--empty"
              >
                Too few sales of this type here
              </div>
            ),
          )}
        </div>

        <TrendChart slots={slots} />

        {ranked.length > 0 && (
          <div className="rp-strip">
            <p className="rp-strip-title">
              Every district, hottest to coolest. Tap one to compare it.
            </p>
            <div className="rp-strip-chips">
              {ranked.map((area, i) => {
                const slot = picks.indexOf(area.key);
                // Warmth by rank: the top of the list glows brass
                const heat = 1 - i / Math.max(1, ranked.length - 1);
                return (
                  <button
                    key={area.key}
                    type="button"
                    className={`rp-strip-chip${slot >= 0 ? " rp-strip-chip--on" : ""}`}
                    style={
                      {
                        "--heat": heat.toFixed(2),
                        "--series":
                          slot >= 0 ? `var(--series-${slot + 1})` : undefined,
                      } as React.CSSProperties
                    }
                    aria-pressed={slot >= 0}
                    onClick={() => bringIn(area.key)}
                  >
                    {area.label.replace("Dublin ", "D")}
                    <span>{signed(area.profile.medianOverAskingPct)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- One airy trend chart, labelled at the line ends ---------- */

function TrendChart({ slots }: { slots: Array<MarketArea | null> }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [hoverQ, setHoverQ] = useState<number | null>(null);

  useEffect(() => {
    if (!box.current) return;
    const observer = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    observer.observe(box.current);
    return () => observer.disconnect();
  }, []);

  const series = slots
    .map((area, i) => (area ? { area, slot: i + 1 } : null))
    .filter((s): s is { area: MarketArea; slot: number } => Boolean(s));

  const quarters = [
    ...new Set(
      series.flatMap((s) => s.area.profile.trend.map((q) => q.quarter)),
    ),
  ].sort();

  if (series.length === 0 || quarters.length < 2) return <div ref={box} />;

  const height = 240;
  const pad = { top: 20, right: 110, bottom: 28, left: 50 };
  const values = series.flatMap((s) =>
    s.area.profile.trend.map((q) => q.medianOverAskingPct),
  );
  const lo = Math.min(0, Math.floor(Math.min(...values) / 5) * 5);
  const hi = Math.max(10, Math.ceil(Math.max(...values) / 5) * 5);
  const plotW = Math.max(120, width - pad.left - pad.right);
  const plotH = height - pad.top - pad.bottom;
  const qx = (i: number) => pad.left + (i / (quarters.length - 1)) * plotW;
  const vy = (v: number) => pad.top + (1 - (v - lo) / (hi - lo)) * plotH;
  const ticks: number[] = [];
  for (let t = lo; t <= hi; t += 5) ticks.push(t);

  const ends = series
    .map(({ area, slot }) => {
      const last = area.profile.trend[area.profile.trend.length - 1];
      return {
        area,
        slot,
        x: qx(quarters.indexOf(last.quarter)),
        y: vy(last.medianOverAskingPct),
      };
    })
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) {
    if (ends[i].y - ends[i - 1].y < 18) ends[i].y = ends[i - 1].y + 18;
  }

  return (
    <div ref={box} className="rp-glass rp-trend-card">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`Typical result on asking price by quarter for ${series.map((s) => s.area.label).join(", ")}`}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const i = Math.round(
            ((e.clientX - rect.left - pad.left) / plotW) *
              (quarters.length - 1),
          );
          setHoverQ(i >= 0 && i < quarters.length ? i : null);
        }}
        onPointerLeave={() => setHoverQ(null)}
      >
        {ticks.map((t) => (
          <g key={t} className="rp-trend-grid">
            <line
              x1={pad.left}
              x2={pad.left + plotW}
              y1={vy(t)}
              y2={vy(t)}
              className={t === 0 ? "rp-trend-zero" : undefined}
            />
            <text x={pad.left - 10} y={vy(t) + 4} textAnchor="end">
              {t === 0 ? "Asking" : `+${t}%`}
            </text>
          </g>
        ))}
        {quarters.map((q, i) =>
          i % Math.ceil(quarters.length / 5) === 0 ||
          i === quarters.length - 1 ? (
            <text
              key={q}
              className="rp-trend-q"
              x={qx(i)}
              y={height - 6}
              textAnchor="middle"
            >
              {q.replace(" ", " ")}
            </text>
          ) : null,
        )}
        {hoverQ !== null && (
          <line
            className="rp-trend-cross"
            x1={qx(hoverQ)}
            x2={qx(hoverQ)}
            y1={pad.top}
            y2={pad.top + plotH}
          />
        )}
        {series.map(({ area, slot }) => {
          const points = area.profile.trend.map(
            (q) =>
              [
                qx(quarters.indexOf(q.quarter)),
                vy(q.medianOverAskingPct),
              ] as const,
          );
          const d = points
            .map(
              ([px, py], i) =>
                `${i ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)}`,
            )
            .join("");
          const last = points[points.length - 1];
          const atHover =
            hoverQ !== null
              ? area.profile.trend.find((q) => q.quarter === quarters[hoverQ])
              : undefined;
          return (
            <g
              key={`${slot}-${area.key}`}
              style={{ color: `var(--series-${slot})` }}
            >
              <path d={d} className="rp-trend-line" />
              <circle
                cx={last[0]}
                cy={last[1]}
                r={5}
                className="rp-trend-end"
              />
              {atHover && hoverQ !== null && (
                <circle
                  cx={qx(hoverQ)}
                  cy={vy(atHover.medianOverAskingPct)}
                  r={5}
                  className="rp-trend-end"
                />
              )}
            </g>
          );
        })}
        {ends.map(({ area, slot, x, y }) => (
          <text
            key={`${slot}-${area.key}`}
            className="rp-trend-label"
            x={x + 12}
            y={y + 4}
          >
            {area.label}
          </text>
        ))}
      </svg>
      {hoverQ !== null && (
        <div
          className="rp-trend-tip"
          style={{ left: Math.min(width - 200, Math.max(0, qx(hoverQ) + 14)) }}
          role="tooltip"
        >
          <b>{quarters[hoverQ]}</b>
          {series.map(({ area, slot }) => {
            const q = area.profile.trend.find(
              (t) => t.quarter === quarters[hoverQ],
            );
            return (
              <span key={`${slot}-${area.key}`}>
                <i style={{ background: `var(--series-${slot})` }} />
                {area.label}
                <em>
                  {q
                    ? `${signed(q.medianOverAskingPct)} · ${q.count} sales`
                    : "Too few sales"}
                </em>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
