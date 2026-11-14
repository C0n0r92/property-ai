import { OG_SIZE, ogCard } from "@/lib/og-card";
import { getSalesStore } from "@/lib/real-price/store";
import { trackRecord } from "@/lib/real-price/track-record";

export const alt = "How close the price check gets to the real sale price";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const o = trackRecord(await getSalesStore()).overall;
  if (!o.tested) return ogCard({ kicker: "Track record", title: "How close we get to the real sale price" });
  return ogCard({
    kicker: `Track record · ${o.tested.toLocaleString("en-IE")} sales, last 12 months`,
    title: "Typically this close to the real sale price",
    figure: `${o.medianModelErrorPct.toFixed(1)}%`,
    figureNote: `the asking price: ${o.medianAskingErrorPct.toFixed(1)}%`,
    footer: `${Math.round(o.insideRangePct)}% of sales landed inside our range`,
  });
}
