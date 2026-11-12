'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

interface Mark {
  pct: number;
  label: string;
}

interface Props {
  /** Over-asking % of each comparable sale, sorted ascending. */
  values: number[];
  salesPerDot: number;
  askingPrice: number;
  /** Position of the bid handle, as % over asking. Omit for a static plot. */
  bidPct?: number;
  onBidChange?: (pct: number) => void;
  /** Dots at or below this % are drawn as "beaten" in a static plot. */
  litUpTo?: number;
  marks?: Mark[];
  /** Change this to replay the entrance animation. */
  playKey?: string;
  height?: number;
  /** Fixed width for print, where the container cannot be measured. */
  fixedWidth?: number;
}

const euroShort = (value: number) =>
  value >= 1_000_000
    ? `€${(value / 1_000_000).toFixed(2)}m`
    : `€${Math.round(value / 1000)}k`;

const euro = (value: number) => `€${Math.round(value).toLocaleString('en-IE')}`;

export default function DotPlot({
  values,
  salesPerDot,
  askingPrice,
  bidPct,
  onBidChange,
  litUpTo,
  marks = [],
  playKey,
  height = 320,
  fixedWidth,
}: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState(fixedWidth ?? 1000);
  const [hoverBin, setHoverBin] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const live = bidPct !== undefined && onBidChange !== undefined;
  const width = fixedWidth ?? measured;

  useEffect(() => {
    if (fixedWidth || !box.current) return;
    const observer = new ResizeObserver(([entry]) => setMeasured(entry.contentRect.width));
    observer.observe(box.current);
    return () => observer.disconnect();
  }, [fixedWidth]);

  const layout = useMemo(() => {
    const lo = Math.max(-15, Math.min(-8, Math.floor(values[0] ?? 0)));
    const hi = Math.min(40, Math.max(25, Math.ceil(values[values.length - 1] ?? 0)));
    const top = live ? 64 : 22;
    const baseline = height - 44;
    const pad = 14;
    const colWidth = (width - pad * 2) / (hi - lo);
    const x = (pct: number) => pad + (pct - lo) * colWidth;

    const columns = new Map<number, number[]>();
    for (const value of values) {
      const bin = Math.min(hi - 1, Math.max(lo, Math.floor(value)));
      const column = columns.get(bin) ?? [];
      column.push(value);
      columns.set(bin, column);
    }
    const tallest = Math.max(1, ...[...columns.values()].map((c) => c.length));
    const radius = Math.max(
      1.5,
      Math.min(colWidth / 2 - 0.75, (baseline - top) / (2 * tallest) - 0.5, 9)
    );

    const dots: Array<{ cx: number; cy: number; value: number; bin: number; key: string }> = [];
    for (const [bin, column] of columns) {
      column.forEach((value, i) => {
        dots.push({
          cx: x(bin + 0.5),
          cy: baseline - radius - 1 - i * (radius * 2 + 1),
          value,
          bin,
          key: `${bin}-${i}`,
        });
      });
    }

    const step = colWidth * 5 < 54 ? 10 : 5;
    const ticks: number[] = [];
    for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) ticks.push(t);

    return { lo, hi, top, baseline, x, colWidth, radius, dots, ticks, columns };
  }, [values, width, height, live]);

  const { lo, hi, top, baseline, x, colWidth, radius, dots, ticks, columns } = layout;
  const clamp = (pct: number) => Math.min(hi, Math.max(lo, pct));
  const litLimit = live ? bidPct : (litUpTo ?? Infinity);

  function pctFromPointer(clientX: number): number {
    const rect = box.current!.getBoundingClientRect();
    const raw = lo + ((clientX - rect.left - 14) / (rect.width - 28)) * (hi - lo);
    return clamp(Math.round(raw * 2) / 2);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (!live) return;
    const stepBy = event.shiftKey ? 5 : 0.5;
    const next: Record<string, number> = {
      ArrowLeft: bidPct - stepBy,
      ArrowDown: bidPct - stepBy,
      ArrowRight: bidPct + stepBy,
      ArrowUp: bidPct + stepBy,
      Home: 0,
      End: hi,
    };
    if (event.key in next) {
      event.preventDefault();
      onBidChange(clamp(next[event.key]));
    }
  }

  const beaten = live ? values.filter((v) => v <= bidPct).length : 0;
  const share = values.length ? Math.round((beaten / values.length) * 100) : 0;
  const bidPrice = live ? Math.round((askingPrice * (1 + bidPct / 100)) / 1000) * 1000 : 0;
  const readoutLeft = live ? Math.min(width - 96, Math.max(96, x(bidPct))) : 0;
  const hoverCount = hoverBin === null ? 0 : (columns.get(hoverBin)?.length ?? 0) * salesPerDot;

  return (
    <div
      ref={box}
      className={`rp-plot${live ? ' rp-plot--live' : ''}`}
      style={fixedWidth ? { width: fixedWidth } : undefined}
    >
      {live && (
        <div className="rp-readout" style={{ left: readoutLeft }} aria-hidden="true">
          <span className="rp-readout-bid">{euro(bidPrice)}</span>
          <span className="rp-readout-note">
            {bidPct === 0 ? 'the asking price' : `${bidPct > 0 ? '+' : ''}${bidPct}% on asking`}
          </span>
        </div>
      )}

      {live && hoverBin !== null && hoverCount > 0 && !dragging && (
        <div
          className="rp-tip"
          style={{
            left: Math.min(width - 110, Math.max(110, x(hoverBin + 0.5))),
            top: baseline - (columns.get(hoverBin)?.length ?? 0) * (radius * 2 + 1) - 8,
          }}
        >
          {hoverCount} {hoverCount === 1 ? 'sale' : 'sales'} closed {hoverBin}% to {hoverBin + 1}%{' '}
          {hoverBin < 0 ? 'under' : 'over'} asking
        </div>
      )}

      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Each dot is ${salesPerDot === 1 ? 'one sale' : `about ${salesPerDot} sales`}, placed by how far over or under the asking price it sold.`}
        onPointerDown={(event) => {
          if (!live) return;
          setDragging(true);
          event.currentTarget.setPointerCapture(event.pointerId);
          onBidChange(pctFromPointer(event.clientX));
        }}
        onPointerMove={(event) => {
          if (!live) return;
          if (dragging) {
            onBidChange(pctFromPointer(event.clientX));
          } else if (event.pointerType === 'mouse') {
            const rect = box.current!.getBoundingClientRect();
            setHoverBin(Math.floor(lo + (event.clientX - rect.left - 14) / colWidth));
          }
        }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        onPointerLeave={() => setHoverBin(null)}
      >
        <g className="rp-axis">
          <line x1={0} x2={width} y1={baseline + 0.5} y2={baseline + 0.5} />
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={x(tick)} x2={x(tick)} y1={baseline} y2={baseline + 6} />
              <text
                x={x(tick)}
                y={baseline + 21}
                textAnchor="middle"
                className={tick === 0 ? 'rp-axis-strong' : undefined}
              >
                {tick === 0 ? 'Asking' : `${tick > 0 ? '+' : ''}${tick}%`}
              </text>
              <text x={x(tick)} y={baseline + 37} textAnchor="middle">
                {euroShort(askingPrice * (1 + tick / 100))}
              </text>
            </g>
          ))}
        </g>

        <line className="rp-asking-line" x1={x(0)} x2={x(0)} y1={top} y2={baseline} />

        <g key={playKey}>
          {dots.map((dot) => (
            <circle
              key={dot.key}
              cx={dot.cx}
              cy={dot.cy}
              r={radius}
              className={`rp-dot${dot.value <= litLimit ? ' rp-dot--lit' : ''}${playKey ? ' rp-dot--in' : ''}`}
              style={playKey ? { animationDelay: `${(dot.bin - lo) * 16}ms` } : undefined}
            />
          ))}
        </g>

        {marks.map((mark) => (
          <g key={mark.label}>
            <line className="rp-mark-line" x1={x(mark.pct)} x2={x(mark.pct)} y1={top} y2={baseline} />
            <text className="rp-mark-text" x={x(mark.pct) + 4} y={top + 9}>
              {mark.label}
            </text>
          </g>
        ))}

        {live && (
          <g
            className="rp-handle"
            tabIndex={0}
            role="slider"
            aria-label="Your final bid"
            aria-valuemin={lo}
            aria-valuemax={hi}
            aria-valuenow={bidPct}
            aria-valuetext={`${euro(bidPrice)}, enough in ${share}% of similar sales`}
            onKeyDown={onKeyDown}
          >
            <line className="rp-handle-line" x1={x(bidPct)} x2={x(bidPct)} y1={top - 6} y2={baseline} />
            <circle className="rp-handle-knob" cx={x(bidPct)} cy={top - 6} r={11} />
            {/* Generous invisible grab area for touch */}
            <rect x={x(bidPct) - 22} y={0} width={44} height={baseline} fill="transparent" />
          </g>
        )}
      </svg>
    </div>
  );
}
