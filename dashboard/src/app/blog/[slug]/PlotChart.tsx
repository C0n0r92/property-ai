"use client";

/**
 * A blog chart drawn with Observable Plot in the site's style, from a spec
 * extracted from the old Recharts components (src/content/blog-charts.json).
 *
 * Rules (see the dataviz guidance): one series in ink; several series in a
 * fixed, colour-blind-checked order with a legend; never two y-axes (a chart
 * that had them becomes two side-by-side charts); thin marks, bars rounded at
 * the value end; a quiet grid; a tooltip on every mark; a data table behind it.
 */
import * as Plot from "@observablehq/plot";
import { useEffect, useRef, useState } from "react";

export interface ChartSeries {
  mark: "bar" | "line" | "scatter" | "pie";
  key?: string;
  name?: string;
  axis?: string | number;
  stack?: string | number;
  nameKey?: string;
}

export interface ChartSpec {
  kind: "bar" | "line" | "scatter" | "pie";
  data: Array<Record<string, unknown>> | null;
  x: string | null;
  xLabel: string | null;
  yLabels: Record<string, string>;
  series: ChartSeries[];
  caption: string | null;
}

const INK = "#16223f";
const SOFT = "#4d586b";
const RULE = "#d9dde6";
// Validated categorical order (lightness, chroma, colour-blind separation, contrast)
const SERIES = ["#2f4fb0", "#b07d14", "#c2362d", "#8458b8", "#2a8c55"];

const num = (v: unknown) => (typeof v === "number" ? v : Number(String(v).replace(/[^0-9.\-]/g, "")));

/** How a measure's values should read, from its axis label and its size. */
function formatFor(label: string | undefined, values: number[]): (v: number) => string {
  const max = Math.max(...values.map(Math.abs));
  if (label && /%/.test(label)) return (v) => `${Number.isInteger(v) ? v : v.toFixed(1)}%`;
  if ((label && /€|price|value|cost|saving|rent/i.test(label)) || max >= 10_000) {
    return (v) => (Math.abs(v) >= 1_000_000 ? `€${(v / 1_000_000).toFixed(2)}m` : Math.abs(v) >= 10_000 ? `€${Math.round(v / 1000)}k` : `€${Math.round(v).toLocaleString("en-IE")}`);
  }
  // Enough decimals for the scale: 0.031 must not print as 0.0
  const decimals = max < 1 ? 3 : max < 10 ? 2 : max < 100 ? 1 : 0;
  return (v) => (Number.isInteger(v) ? v.toLocaleString("en-IE") : v.toFixed(decimals));
}

const humanise = (key: string) =>
  key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/^./, (c) => c.toUpperCase());

/** One panel: a set of series sharing one y-axis. */
function panel(spec: ChartSpec, series: ChartSeries[], width: number, height: number, yLabel: string | undefined): SVGSVGElement | HTMLElement {
  const data = spec.data ?? [];
  const x = spec.x ?? "";
  const keys = series.map((s) => s.key!).filter(Boolean);
  const values = data.flatMap((d) => keys.map((k) => num(d[k]))).filter(Number.isFinite);
  const fmt = formatFor(yLabel, values);
  const long = data.some((d) => String(d[x] ?? "").length > 10) || data.length > 8;
  const many = series.length > 1;
  const nameOf = (s: ChartSeries) => humanise(String(s.name ?? s.key));
  const colours = many ? series.map((_, i) => SERIES[i % SERIES.length]) : [INK];

  const common = {
    width,
    height,
    marginLeft: 64,
    marginBottom: long ? 72 : 40,
    style: { fontFamily: "var(--font-rp-display), 'Helvetica Neue', Arial, sans-serif", fontSize: "12px", color: SOFT, background: "transparent" },
    y: { label: yLabel ?? null, grid: true, tickFormat: fmt, nice: true },
    color: many ? { domain: series.map(nameOf), range: colours, legend: true } : undefined,
  };

  if (spec.kind === "scatter") {
    const s = series[0];
    const xKey = spec.x ?? Object.keys(data[0] ?? {})[0];
    const yKey = s.key ?? Object.keys(data[0] ?? {})[1];
    const xVals = data.map((d) => num(d[xKey]));
    return Plot.plot({
      ...common,
      x: { label: spec.xLabel ?? humanise(xKey), grid: true, tickFormat: formatFor(spec.xLabel ?? undefined, xVals) },
      marks: [
        Plot.dot(data, { x: (d) => num(d[xKey]), y: (d) => num(d[yKey]), r: 5, fill: INK, fillOpacity: 0.75, stroke: "#fff", strokeWidth: 1.5, tip: true, title: (d) => String(d.name ?? d.area ?? d.label ?? "") }),
      ],
    });
  }

  if (spec.kind === "pie") {
    // A pie reads poorly; the same shares as sorted bars
    const s = series[0];
    const valueKey = s.key ?? "value";
    const nameKey = s.nameKey ?? "name";
    const share = formatFor(undefined, data.map((d) => num(d[valueKey])));
    return Plot.plot({
      ...common,
      marginLeft: 150,
      height: Math.max(160, data.length * 34),
      x: { label: null, grid: true, tickFormat: share },
      y: { label: null },
      marks: [
        Plot.barX(data, { y: (d) => String(d[nameKey]), x: (d) => num(d[valueKey]), fill: INK, rx2: 4, sort: { y: "-x" }, tip: true }),
        Plot.ruleX([0], { stroke: RULE }),
      ],
    });
  }

  const xAxis = {
    label: spec.xLabel ?? null,
    tickRotate: long ? -35 : 0,
    tickFormat: (v: unknown) => String(v),
  };

  if (spec.kind === "line") {
    const rows = series.flatMap((s) =>
      data.map((d) => ({ x: d[x], y: num(d[s.key!]), series: nameOf(s) })).filter((r) => Number.isFinite(r.y)),
    );
    const ordinal = data.some((d) => typeof d[x] === "string");
    const domain = data.map((d) => d[x]);
    return Plot.plot({
      ...common,
      x: ordinal ? { ...xAxis, type: "point", domain, padding: 0.3 } : { ...xAxis, tickFormat: (v: number) => String(v) },
      marks: [
        Plot.lineY(rows, { x: "x", y: "y", stroke: many ? "series" : INK, strokeWidth: 2, curve: "monotone-x" }),
        Plot.dot(rows, { x: "x", y: "y", fill: many ? "series" : INK, r: 4, stroke: "#fff", strokeWidth: 1.5 }),
        Plot.tip(rows, Plot.pointerX({ x: "x", y: "y", title: (d) => `${String(d.x)}\n${many ? `${d.series}: ` : ""}${fmt(d.y)}` })),
      ],
    });
  }

  // Bars: one series, grouped series, or stacked series
  const stacked = series.some((s) => s.stack !== undefined);
  if (!many) {
    const key = keys[0];
    return Plot.plot({
      ...common,
      x: { ...xAxis, domain: data.map((d) => String(d[x])), padding: 0.25 },
      marks: [
        Plot.barY(data, { x: (d) => String(d[x]), y: (d) => num(d[key]), fill: INK, ry1: 4, tip: true, title: (d) => `${String(d[x])}\n${fmt(num(d[key]))}` }),
        Plot.ruleY([0], { stroke: RULE }),
      ],
    });
  }
  const rows = series.flatMap((s) => data.map((d) => ({ x: String(d[x]), y: num(d[s.key!]), series: nameOf(s) })));
  if (stacked) {
    return Plot.plot({
      ...common,
      x: { ...xAxis, domain: data.map((d) => String(d[x])), padding: 0.25 },
      marks: [
        Plot.barY(rows, Plot.stackY({ x: "x", y: "y", fill: "series", inset: 1, tip: true })),
        Plot.ruleY([0], { stroke: RULE }),
      ],
    });
  }
  return Plot.plot({
    ...common,
    fx: { label: null, tickRotate: long ? -35 : 0, padding: 0.15 },
    x: { axis: null, domain: series.map(nameOf), padding: 0.1 },
    marks: [
      Plot.barY(rows, { fx: "x", x: "series", y: "y", fill: "series", ry1: 3, tip: true, title: (d) => `${d.x}\n${d.series}: ${fmt(d.y)}` }),
      Plot.ruleY([0], { stroke: RULE }),
    ],
  });
}

export default function PlotChart({ spec, name }: { spec: ChartSpec; name: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Series on different y-axes become side-by-side charts, never one chart with two scales
  const groups = Object.values(
    spec.series.reduce<Record<string, ChartSeries[]>>((acc, s) => {
      const k = String(s.axis ?? "default");
      (acc[k] ??= []).push(s);
      return acc;
    }, {}),
  );

  useEffect(() => {
    const el = box.current;
    if (!el || !width || !spec.data?.length) return;
    const panelWidth = groups.length > 1 && width > 640 ? Math.floor((width - 24) / groups.length) : width;
    const charts = groups.map((series) => {
      const axis = String(series[0].axis ?? "default");
      const label = spec.yLabels[axis] ?? spec.yLabels.default ?? (series.length === 1 && series[0].key ? humanise(series[0].key) : undefined);
      return panel(spec, series, panelWidth, 300, label);
    });
    el.replaceChildren(...charts);
    return () => el.replaceChildren();
    // groups derive from spec
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec, width]);

  const keys = spec.series.map((s) => s.key).filter(Boolean) as string[];
  return (
    <figure className="rp-plot-chart" aria-label={spec.caption ?? name}>
      <div ref={box} className={`rp-plot-chart-body${groups.length > 1 ? " is-split" : ""}`} />
      {spec.caption && <figcaption>{spec.caption}</figcaption>}
      {spec.data && spec.x && (
        <div className="rp-visually-hidden">
          <table>
            <caption>{spec.caption ?? name}</caption>
            <thead>
              <tr>
                <th scope="col">{humanise(spec.x)}</th>
                {keys.map((k) => (
                  <th scope="col" key={k}>
                    {humanise(k)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {spec.data.map((d, i) => (
                <tr key={i}>
                  <th scope="row">{String(d[spec.x!])}</th>
                  {keys.map((k) => (
                    <td key={k}>{String(d[k])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </figure>
  );
}
