import { availableMonths, buildMonthlyReport } from "@/lib/real-price/monthly-report";
import { getSalesStore } from "@/lib/real-price/store";
import { OG_SIZE, ogCard } from "@/lib/og-card";

export const alt = "Dublin over-asking report";
export const size = OG_SIZE;
export const contentType = "image/png";

const signed = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}%`;

export default async function Image() {
  const store = await getSalesStore();
  const latest = availableMonths(store)[0];
  const r = latest ? buildMonthlyReport(store, latest) : null;
  return ogCard({
    kicker: "Dublin over-asking report · monthly",
    title: r ? `Dublin homes in ${r.label} sold for` : "How far over asking Dublin sells, month by month",
    figure: r ? signed(r.medianOverAskingPct) : undefined,
    figureNote: r ? "on asking" : undefined,
    bars: r?.trend.map((t) => t.medianOverAskingPct),
    footer: r ? `${Math.round(r.shareAboveAsking * 100)}% sold above asking` : undefined,
  });
}
