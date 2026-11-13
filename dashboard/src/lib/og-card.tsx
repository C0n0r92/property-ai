/**
 * The share image (Open Graph card) for any page: the site's paper and ink,
 * a kicker, a title, an optional big figure and an optional row of bars.
 * Rendered by next/og's ImageResponse, so only inline styles and flexbox.
 */
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

const INK = "#16223f";
const SOFT = "#4d586b";
const GOLD = "#a37a1f";

export interface OgCard {
  kicker: string;
  title: string;
  figure?: string;
  figureNote?: string;
  /** Bar heights (any scale); the last is drawn gold */
  bars?: number[];
  footer?: string;
}

export function ogCard({ kicker, title, figure, figureNote, bars = [], footer }: OgCard): ImageResponse {
  const max = Math.max(1, ...bars.map((b) => Math.max(0, b)));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          color: INK,
          background: "linear-gradient(160deg, #fcfcfa 0%, #fdeee2 62%, #e3d6f2 100%)",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, color: GOLD, fontWeight: 600 }}>{kicker}</div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 40 }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: bars.length ? 640 : 1060 }}>
            <div
              style={{
                display: "flex",
                fontSize: figure ? 52 : title.length > 70 ? 56 : 68,
                fontWeight: 700,
                letterSpacing: -1.5,
                lineHeight: 1.08,
              }}
            >
              {title}
            </div>
            {figure && (
              <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 18 }}>
                <span style={{ fontSize: 120, fontWeight: 700, letterSpacing: -5, lineHeight: 1 }}>{figure}</span>
                {figureNote && <span style={{ fontSize: 30, color: SOFT }}>{figureNote}</span>}
              </div>
            )}
          </div>
          {bars.length > 0 && (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 260 }}>
              {bars.map((b, i) => (
                <div
                  key={i}
                  style={{
                    width: Math.max(14, Math.min(34, 360 / bars.length)),
                    height: Math.max(10, (Math.max(0, b) / max) * 250),
                    borderRadius: 6,
                    background: i === bars.length - 1 ? "#c9992f" : INK,
                  }}
                />
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: SOFT }}>
          <span>{footer ?? ""}</span>
          <span>Irish Property Data</span>
        </div>
      </div>
    ),
    OG_SIZE
  );
}
