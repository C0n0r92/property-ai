"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Market, MarketArea, MarketType } from "@/lib/real-price/market";

interface Props {
  initial: Market;
  /** The area in the visitor's search: drawn in gold and described first. */
  homeArea: string;
}

const TYPES: Array<{ value: MarketType; label: string }> = [
  { value: "all", label: "all homes" },
  { value: "apartment", label: "apartments" },
  { value: "terraced", label: "terraced houses" },
  { value: "semi", label: "semi-detached houses" },
  { value: "detached", label: "detached houses" },
];

const euro = (v: number) => `€${Math.round(v).toLocaleString("en-IE")}`;
const pct = (v: number) => `${Math.abs(v).toFixed(1)}%`;

/** "Dublin 6W" -> "6W"; towns keep a short tag. */
const shortName = (area: MarketArea) =>
  area.kind === "district" ? area.label.replace("Dublin ", "") : "You";

/**
 * Where bidding runs hottest: one circle per postal district, placed by how
 * far over asking homes typically sell there. Same form as the bid chart
 * above it, so it reads the same way.
 */
export default function MarketExplorer({ initial, homeArea }: Props) {
  const [type, setType] = useState<MarketType>(initial.type);
  const [markets, setMarkets] = useState<Partial<Record<MarketType, Market>>>({
    [initial.type]: initial,
  });
  const [picked, setPicked] = useState<string | null>(null);
  const [width, setWidth] = useState(1040);
  const [seen, setSeen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const market = markets[type] ?? initial;

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

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const resize = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    resize.observe(el);
    const appear = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          appear.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    appear.observe(el);
    return () => {
      resize.disconnect();
      appear.disconnect();
    };
  }, []);

  // Districts, plus the visitor's own town if that is what they searched
  const areas = useMemo(
    () =>
      market.areas.filter((a) => a.kind === "district" || a.key === homeArea),
    [market, homeArea],
  );

  const layout = useMemo(() => {
    if (areas.length === 0) return null;
    const bin = width < 640 ? 2 : 1;
    const values = areas.map((a) => a.profile.medianOverAskingPct);
    const lo = Math.min(0, Math.floor(Math.min(...values) / bin) * bin) - bin;
    const hi = Math.ceil((Math.max(...values) + 0.01) / bin) * bin + bin;
    const pad = 14;
    const colW = (width - pad * 2) / ((hi - lo) / bin);
    const x = (v: number) => pad + ((v - lo) / bin) * colW;
    const r = Math.max(8, Math.min(19, colW / 2 - 2));

    const columns = new Map<number, MarketArea[]>();
    for (const area of areas) {
      const col = Math.floor(area.profile.medianOverAskingPct / bin) * bin;
      columns.set(col, [...(columns.get(col) ?? []), area]);
    }
    const tallest = Math.max(...[...columns.values()].map((c) => c.length));
    const top = 14;
    const baseline = top + tallest * (r * 2 + 4);
    const circles = [...columns.entries()].flatMap(([col, list]) =>
      list
        .sort(
          (a, b) =>
            a.profile.medianOverAskingPct - b.profile.medianOverAskingPct,
        )
        .map((area, i) => ({
          area,
          cx: x(col + bin / 2),
          cy: baseline - r - 2 - i * (r * 2 + 4),
          order: (col - lo) / bin,
        })),
    );
    const step = colW * (5 / bin) < 56 ? 10 : 5;
    const ticks: number[] = [];
    for (let t = 0; t <= hi; t += step) ticks.push(t);
    return { x, r, baseline, circles, ticks, height: baseline + 46 };
  }, [areas, width]);

  const byKey = new Map(areas.map((a) => [a.key, a]));
  const hottest = [...areas].sort(
    (a, b) => b.profile.medianOverAskingPct - a.profile.medianOverAskingPct,
  )[0];
  const active = byKey.get(picked ?? "") ?? byKey.get(homeArea) ?? hottest;
  const typeLabel = TYPES.find((t) => t.value === type)!.label;

  let statement = null;
  if (active) {
    const p = active.profile;
    const others = areas.filter(
      (a) => a.key !== active.key && a.kind === "district",
    );
    const cooler = others.filter(
      (a) => a.profile.medianOverAskingPct < p.medianOverAskingPct,
    ).length;
    statement = (
      <>
        <p className="rp-statement">
          In <b>{active.label}</b>, {type === "all" ? "homes" : typeLabel}{" "}
          typically sell{" "}
          <b>
            {pct(p.medianOverAskingPct)}{" "}
            {p.medianOverAskingPct >= 0 ? "over" : "under"} asking
          </b>
          . Bidding runs hotter there than in{" "}
          <b>
            {cooler} of {others.length}
          </b>{" "}
          other districts.
        </p>
        <p className="rp-statement-sub">
          {Math.round(p.shareAboveAsking * 100)}% went above asking. The typical
          sale price was {euro(p.medianPrice)}
          {p.medianPricePerSqm
            ? `, about ${euro(p.medianPricePerSqm)} per m²`
            : ""}
          . From {p.count.toLocaleString("en-IE")} sales in the last year of our
          records.
        </p>
      </>
    );
  }

  return (
    <section className="rp-areas" aria-labelledby="rp-areas-title">
      <h2 className="rp-h2" id="rp-areas-title">
        Where the bidding runs hottest.
      </h2>
      <p className="rp-statement-sub">
        Each circle is a Dublin postal district, placed by how far over asking{" "}
        <label className="rp-inline-select">
          <span className="rp-visually-hidden">Home type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as MarketType)}
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>{" "}
        typically sell there. Tap one to read it.
      </p>

      <div
        ref={box}
        className={`rp-plot rp-areas-plot${markets[type] ? "" : " rp-areas-plot--loading"}`}
      >
        {layout ? (
          <svg
            width={width}
            height={layout.height}
            viewBox={`0 0 ${width} ${layout.height}`}
            role="group"
            aria-label="Dublin districts by typical result on asking price"
          >
            <g className="rp-axis">
              <line
                x1={0}
                x2={width}
                y1={layout.baseline + 0.5}
                y2={layout.baseline + 0.5}
              />
              {layout.ticks.map((t) => (
                <g key={t}>
                  <line
                    x1={layout.x(t)}
                    x2={layout.x(t)}
                    y1={layout.baseline}
                    y2={layout.baseline + 6}
                  />
                  <text
                    x={layout.x(t)}
                    y={layout.baseline + 21}
                    textAnchor="middle"
                    className={t === 0 ? "rp-axis-strong" : undefined}
                  >
                    {t === 0 ? "Asking price" : `+${t}%`}
                  </text>
                </g>
              ))}
              <text x={width} y={layout.baseline + 39} textAnchor="end">
                Hotter bidding
              </text>
            </g>
            <line
              className="rp-asking-line"
              x1={layout.x(0)}
              x2={layout.x(0)}
              y1={8}
              y2={layout.baseline}
            />
            {seen &&
              layout.circles.map(({ area, cx, cy, order }) => {
                const isHome = area.key === homeArea;
                const isActive = area.key === active?.key;
                return (
                  <g
                    key={`${type}-${area.key}`}
                    className={`rp-area rp-dot--in${isHome ? " rp-area--home" : ""}${isActive ? " rp-area--active" : ""}`}
                    style={{ animationDelay: `${order * 45}ms` }}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isActive}
                    aria-label={`${area.label}: ${pct(area.profile.medianOverAskingPct)} over asking`}
                    onClick={() => setPicked(area.key)}
                    onPointerEnter={(e) =>
                      e.pointerType === "mouse" && setPicked(area.key)
                    }
                    onFocus={() => setPicked(area.key)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setPicked(area.key);
                      }
                    }}
                  >
                    {isActive && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={layout.r + 4}
                        className="rp-area-ring"
                      />
                    )}
                    <circle cx={cx} cy={cy} r={layout.r} />
                    {layout.r >= 12 && (
                      <text x={cx} y={cy + 4} textAnchor="middle">
                        {shortName(area)}
                      </text>
                    )}
                  </g>
                );
              })}
          </svg>
        ) : (
          <p className="rp-statement-sub">
            Too few sales of this type to compare districts.
          </p>
        )}
      </div>
      <div className="rp-plot-caption">
        <span className="rp-key">
          <i className="rp-key--home" /> The area you searched
        </span>
        <span className="rp-key">
          <i className="rp-key--lit" /> Other districts
        </span>
      </div>

      {statement}
    </section>
  );
}
