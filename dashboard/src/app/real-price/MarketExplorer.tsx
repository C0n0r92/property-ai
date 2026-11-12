"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Market, MarketArea, MarketType } from "@/lib/real-price/market";

interface Props {
  initial: Market;
  /** The area in the visitor's search, highlighted and compared first. */
  homeArea: string;
}

const TYPES: Array<{ value: MarketType; label: string }> = [
  { value: "all", label: "All homes" },
  { value: "apartment", label: "Apartments" },
  { value: "terraced", label: "Terraced" },
  { value: "semi", label: "Semi-detached" },
  { value: "detached", label: "Detached" },
];

const MAX_COMPARE = 3;
const euro = (v: number) => `€${Math.round(v).toLocaleString("en-IE")}`;
const signed = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

function defaultSelection(market: Market, homeArea: string): string[] {
  const keys = new Set(market.areas.map((a) => a.key));
  const picks = keys.has(homeArea) ? [homeArea] : [];
  // Compare against the busiest districts, which most visitors know
  const busiest = market.areas
    .filter((a) => a.kind === "district" && a.key !== homeArea)
    .sort((a, b) => b.profile.count - a.profile.count);
  for (const area of busiest) {
    if (picks.length >= MAX_COMPARE) break;
    picks.push(area.key);
  }
  return picks;
}

export default function MarketExplorer({ initial, homeArea }: Props) {
  const [type, setType] = useState<MarketType>(initial.type);
  const [markets, setMarkets] = useState<Partial<Record<MarketType, Market>>>({
    [initial.type]: initial,
  });
  // Each chosen area keeps its colour slot, so removing one never repaints the others
  const [picks, setPicks] = useState<Array<{ key: string; slot: number }>>(() =>
    defaultSelection(initial, homeArea).map((key, slot) => ({ key, slot })),
  );
  const selected = picks.map((p) => p.key);
  const slots = new Map(picks.map((p) => [p.key, p.slot]));
  // Shows the last loaded type until the chosen one arrives
  const loading = !markets[type];
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

  const byKey = useMemo(
    () => new Map(market.areas.map((a) => [a.key, a])),
    [market],
  );
  const districts = useMemo(
    () =>
      market.areas
        .filter((a) => a.kind === "district")
        .sort(
          (a, b) =>
            b.profile.medianOverAskingPct - a.profile.medianOverAskingPct,
        ),
    [market],
  );
  const compared = selected
    .map((key) => byKey.get(key))
    .filter((a): a is MarketArea => Boolean(a));

  function toggle(key: string) {
    setPicks((current) => {
      if (current.some((p) => p.key === key)) {
        return current.filter((p) => p.key !== key);
      }
      // Full: the oldest choice makes way and frees its colour
      const kept = current.length >= MAX_COMPARE ? current.slice(1) : current;
      const used = new Set(kept.map((p) => p.slot));
      const slot = [0, 1, 2].find((s) => !used.has(s)) ?? 0;
      return [...kept, { key, slot }];
    });
  }

  return (
    <section className="rp-market" aria-labelledby="rp-market-title">
      <div className="rp-market-head">
        <div>
          <h2 className="rp-h2" id="rp-market-title">
            How Dublin bids, area by area.
          </h2>
          <p className="rp-prose rp-market-sub">
            Every district ranked by how far over asking homes really sold, in
            the last year of our records. Pick up to three areas to compare.
          </p>
        </div>
        <div className="rp-chips" role="radiogroup" aria-label="Home type">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={type === t.value}
              className={`rp-chip${type === t.value ? " rp-chip--on" : ""}`}
              onClick={() => setType(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`rp-market-grid${loading ? " rp-market--loading" : ""}`}>
        <Ranking
          districts={districts}
          selected={selected}
          slots={slots}
          homeArea={homeArea}
          onToggle={toggle}
        />
        <div className="rp-compare">
          <CompareChips
            areas={market.areas}
            compared={compared}
            slots={slots}
            onToggle={toggle}
          />
          <TrendChart compared={compared} slots={slots} />
          <CompareTable compared={compared} slots={slots} />
        </div>
      </div>
    </section>
  );
}

/* ---------- Ranked districts: typical result and the usual spread ---------- */

function Ranking({
  districts,
  selected,
  slots,
  homeArea,
  onToggle,
}: {
  districts: MarketArea[];
  selected: string[];
  slots: Map<string, number>;
  homeArea: string;
  onToggle: (key: string) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  if (districts.length === 0) {
    return (
      <p className="rp-prose">Too few sales of this type to rank districts.</p>
    );
  }
  const lo = Math.min(
    -2,
    Math.floor(Math.min(...districts.map((d) => d.profile.p25OverAskingPct))),
  );
  const hi = Math.max(
    10,
    Math.ceil(Math.max(...districts.map((d) => d.profile.p75OverAskingPct))),
  );
  const x = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  const ticks = [0, 5, 10, 15, 20, 25, 30].filter((t) => t >= lo && t <= hi);

  return (
    <div className="rp-rank">
      <div className="rp-rank-axis" aria-hidden="true">
        {ticks.map((t) => (
          <span key={t} style={{ left: x(t) }}>
            {t === 0 ? "Asking" : `+${t}%`}
          </span>
        ))}
      </div>
      <ol className="rp-rank-list">
        {districts.map((d) => {
          const slot = slots.get(d.key);
          const on = selected.includes(d.key);
          const p = d.profile;
          return (
            <li key={d.key}>
              <button
                type="button"
                className={`rp-rank-row${on ? " rp-rank-row--on" : ""}`}
                aria-pressed={on}
                aria-label={`${d.label}: typically ${signed(p.medianOverAskingPct)} on asking. ${on ? "Remove from" : "Add to"} comparison`}
                style={
                  slot !== undefined
                    ? ({
                        "--series": `var(--series-${slot + 1})`,
                      } as React.CSSProperties)
                    : undefined
                }
                onClick={() => onToggle(d.key)}
                onPointerEnter={() => setHover(d.key)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(d.key)}
                onBlur={() => setHover(null)}
              >
                <span className="rp-rank-name">
                  {d.label}
                  {d.key === homeArea && <em>Your search</em>}
                </span>
                <span className="rp-rank-track">
                  <span className="rp-rank-zero" style={{ left: x(0) }} />
                  <span
                    className="rp-rank-range"
                    style={{
                      left: x(p.p25OverAskingPct),
                      width: `calc(${x(p.p75OverAskingPct)} - ${x(p.p25OverAskingPct)})`,
                    }}
                  />
                  <span
                    className="rp-rank-dot"
                    style={{ left: x(p.medianOverAskingPct) }}
                  />
                  {hover === d.key && (
                    <span
                      className="rp-rank-tip"
                      style={{ left: x(p.medianOverAskingPct) }}
                      role="tooltip"
                    >
                      Half sold between {signed(p.p25OverAskingPct)} and{" "}
                      {signed(p.p75OverAskingPct)} · {p.count} sales
                    </span>
                  )}
                </span>
                <span className="rp-rank-value">
                  {signed(p.medianOverAskingPct)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="rp-rank-key">
        <span className="rp-rank-key-dot" /> Typical result
        <span className="rp-rank-key-range" /> Middle half of sales
      </p>
    </div>
  );
}

/* ---------- Chosen areas, with a picker for any area ---------- */

function CompareChips({
  areas,
  compared,
  slots,
  onToggle,
}: {
  areas: MarketArea[];
  compared: MarketArea[];
  slots: Map<string, number>;
  onToggle: (key: string) => void;
}) {
  const chosen = new Set(compared.map((a) => a.key));
  const options = areas
    .filter((a) => !chosen.has(a.key))
    .sort((a, b) =>
      a.kind === b.kind
        ? a.label.localeCompare(b.label, "en-IE", { numeric: true })
        : a.kind === "district"
          ? -1
          : 1,
    );
  return (
    <div className="rp-compare-chips">
      {compared.map((a) => (
        <button
          key={a.key}
          type="button"
          className="rp-compare-chip"
          style={
            {
              "--series": `var(--series-${(slots.get(a.key) ?? 0) + 1})`,
            } as React.CSSProperties
          }
          onClick={() => onToggle(a.key)}
          aria-label={`Remove ${a.label} from comparison`}
        >
          <i aria-hidden="true" />
          {a.label}
          <span aria-hidden="true">×</span>
        </button>
      ))}
      <label className="rp-compare-add">
        <span className="rp-visually-hidden">Add an area to compare</span>
        <select
          value=""
          onChange={(e) => e.target.value && onToggle(e.target.value)}
        >
          <option value="">
            {compared.length >= MAX_COMPARE ? "Swap in an area" : "Add an area"}
          </option>
          <optgroup label="Postal districts">
            {options
              .filter((a) => a.kind === "district")
              .map((a) => (
                <option key={a.key} value={a.key}>
                  {a.label}
                </option>
              ))}
          </optgroup>
          <optgroup label="Towns and neighbourhoods">
            {options
              .filter((a) => a.kind === "locality")
              .map((a) => (
                <option key={a.key} value={a.key}>
                  {a.label}
                </option>
              ))}
          </optgroup>
        </select>
      </label>
    </div>
  );
}

/* ---------- Quarter-by-quarter trend, one line per area ---------- */

function TrendChart({
  compared,
  slots,
}: {
  compared: MarketArea[];
  slots: Map<string, number>;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hoverQ, setHoverQ] = useState<number | null>(null);

  useEffect(() => {
    if (!box.current) return;
    const observer = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    observer.observe(box.current);
    return () => observer.disconnect();
  }, []);

  const quarters = useMemo(() => {
    const all = new Set<string>();
    compared.forEach((a) => a.profile.trend.forEach((q) => all.add(q.quarter)));
    return [...all].sort();
  }, [compared]);

  if (compared.length === 0 || quarters.length < 2) {
    return (
      <div ref={box} className="rp-trend-empty">
        Pick an area to see how its bidding has moved.
      </div>
    );
  }

  const height = 260;
  const pad = { top: 18, right: 92, bottom: 30, left: 44 };
  const values = compared.flatMap((a) =>
    a.profile.trend.map((q) => q.medianOverAskingPct),
  );
  const lo = Math.min(0, Math.floor(Math.min(...values) / 5) * 5);
  const hi = Math.max(10, Math.ceil(Math.max(...values) / 5) * 5);
  const plotW = Math.max(120, width - pad.left - pad.right);
  const plotH = height - pad.top - pad.bottom;
  const qx = (i: number) => pad.left + (i / (quarters.length - 1)) * plotW;
  const vy = (v: number) => pad.top + (1 - (v - lo) / (hi - lo)) * plotH;
  const ticks: number[] = [];
  for (let t = lo; t <= hi; t += 5) ticks.push(t);

  // Direct labels at the line ends, nudged apart so they never overlap
  const ends = compared
    .map((a) => {
      const last = a.profile.trend[a.profile.trend.length - 1];
      return {
        area: a,
        y: vy(last.medianOverAskingPct),
        x: qx(quarters.indexOf(last.quarter)),
      };
    })
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) {
    if (ends[i].y - ends[i - 1].y < 16) ends[i].y = ends[i - 1].y + 16;
  }

  const hoverIndex = hoverQ;

  return (
    <div ref={box} className="rp-trend-box">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`Typical result on asking price by quarter for ${compared.map((a) => a.label).join(", ")}`}
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
            <text x={pad.left - 8} y={vy(t) + 4} textAnchor="end">
              {t === 0 ? "Asking" : `${t > 0 ? "+" : ""}${t}%`}
            </text>
          </g>
        ))}
        {quarters.map((q, i) =>
          i % Math.ceil(quarters.length / 6) === 0 ||
          i === quarters.length - 1 ? (
            <text
              key={q}
              className="rp-trend-q"
              x={qx(i)}
              y={height - 8}
              textAnchor="middle"
            >
              {q.replace(" ", " ")}
            </text>
          ) : null,
        )}

        {hoverIndex !== null && (
          <line
            className="rp-trend-cross"
            x1={qx(hoverIndex)}
            x2={qx(hoverIndex)}
            y1={pad.top}
            y2={pad.top + plotH}
          />
        )}

        {compared.map((a) => {
          const slot = (slots.get(a.key) ?? 0) + 1;
          const points = a.profile.trend.map(
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
          return (
            <g key={a.key} style={{ color: `var(--series-${slot})` }}>
              <path d={d} className="rp-trend-line" />
              <circle
                cx={last[0]}
                cy={last[1]}
                r={4.5}
                className="rp-trend-end"
              />
              {hoverIndex !== null &&
                a.profile.trend
                  .filter((q) => q.quarter === quarters[hoverIndex])
                  .map((q) => (
                    <circle
                      key={q.quarter}
                      cx={qx(hoverIndex)}
                      cy={vy(q.medianOverAskingPct)}
                      r={4.5}
                      className="rp-trend-end"
                    />
                  ))}
            </g>
          );
        })}

        {ends.map(({ area, x, y }) => (
          <g key={area.key}>
            <text className="rp-trend-label" x={x + 10} y={y + 4}>
              {area.label}
            </text>
          </g>
        ))}
      </svg>

      {hoverIndex !== null && (
        <div
          className="rp-trend-tip"
          style={{
            left: Math.min(width - 190, Math.max(0, qx(hoverIndex) + 12)),
          }}
          role="tooltip"
        >
          <b>{quarters[hoverIndex]}</b>
          {compared.map((a) => {
            const q = a.profile.trend.find(
              (t) => t.quarter === quarters[hoverIndex],
            );
            return (
              <span key={a.key}>
                <i
                  style={{
                    background: `var(--series-${(slots.get(a.key) ?? 0) + 1})`,
                  }}
                />
                {a.label}
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

/* ---------- Side-by-side figures ---------- */

function CompareTable({
  compared,
  slots,
}: {
  compared: MarketArea[];
  slots: Map<string, number>;
}) {
  if (compared.length === 0) return null;
  const rows: Array<{ label: string; value: (a: MarketArea) => string }> = [
    {
      label: "Typical result on asking",
      value: (a) => signed(a.profile.medianOverAskingPct),
    },
    {
      label: "Sold above asking",
      value: (a) => `${Math.round(a.profile.shareAboveAsking * 100)}%`,
    },
    { label: "Typical sale price", value: (a) => euro(a.profile.medianPrice) },
    {
      label: "Price per m²",
      value: (a) =>
        a.profile.medianPricePerSqm
          ? euro(a.profile.medianPricePerSqm)
          : "Not enough data",
    },
    {
      label: "Sales in the last year",
      value: (a) => a.profile.count.toLocaleString("en-IE"),
    },
  ];
  return (
    <table className="rp-table rp-compare-table">
      <thead>
        <tr>
          <th>
            <span className="rp-visually-hidden">Figure</span>
          </th>
          {compared.map((a) => (
            <th key={a.key} className="rp-num">
              <i
                style={{
                  background: `var(--series-${(slots.get(a.key) ?? 0) + 1})`,
                }}
                aria-hidden="true"
              />
              {a.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <td>{row.label}</td>
            {compared.map((a) => (
              <td key={a.key} className="rp-num">
                {row.value(a)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
