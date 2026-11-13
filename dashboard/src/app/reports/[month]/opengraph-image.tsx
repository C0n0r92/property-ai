import { ImageResponse } from "next/og";
import { buildMonthlyReport } from "@/lib/real-price/monthly-report";
import { getSalesStore } from "@/lib/real-price/store";

export const alt = "Dublin over-asking report";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#16223f";
const SOFT = "#4d586b";
const GOLD = "#a37a1f";
const signed = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}%`;

/** The headline figure, the month's trend as bars, and the hottest districts. */
export default async function Image({ params }: { params: Promise<{ month: string }> }) {
  const { month } = await params;
  const r = buildMonthlyReport(await getSalesStore(), month);
  const max = Math.max(1, ...(r?.trend ?? []).map((t) => t.medianOverAskingPct));

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
        <div style={{ display: "flex", fontSize: 28, color: GOLD, fontWeight: 600 }}>
          {`Dublin over-asking report · ${r?.label ?? ""}`}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 150, fontWeight: 700, letterSpacing: -6, lineHeight: 1 }}>
              {r ? signed(r.medianOverAskingPct) : ""}
            </div>
            <div style={{ display: "flex", fontSize: 36, color: SOFT, marginTop: 12 }}>
              {r ? `typical sale vs asking · ${Math.round(r.shareAboveAsking * 100)}% sold above` : ""}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 220 }}>
            {(r?.trend ?? []).map((t) => (
              <div
                key={t.month}
                style={{
                  width: 26,
                  height: Math.max(8, (Math.max(0, t.medianOverAskingPct) / max) * 210),
                  borderRadius: 6,
                  background: t.month === month ? "#c9992f" : INK,
                }}
              />
            ))}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: SOFT }}>
          <span>
            {r?.districts[0] ? `Hottest: ${r.districts[0].label} ${signed(r.districts[0].medianOverAskingPct)}` : ""}
          </span>
          <span>Irish Property Data</span>
        </div>
      </div>
    ),
    size,
  );
}
