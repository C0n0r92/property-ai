import { areaKeyFromSlug, areaProfiles } from "@/lib/real-price/area-page";
import { getSalesStore } from "@/lib/real-price/store";
import { OG_SIZE, ogCard } from "@/lib/og-card";

export const alt = "How far over asking homes sell in this Dublin area";
export const size = OG_SIZE;
export const contentType = "image/png";

const signed = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}%`;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getSalesStore();
  const key = areaKeyFromSlug(slug);
  const profile = key ? areaProfiles(store).get(key) : undefined;
  const label = (key && store.areaLabels.get(key)) || "Dublin";
  if (!profile) return ogCard({ kicker: "Dublin areas", title: `${label} house prices: sold vs asking` });
  return ogCard({
    kicker: `${label} · last 12 months`,
    title: `Homes in ${label} sell for`,
    figure: signed(profile.medianOverAskingPct),
    figureNote: "on asking",
    bars: profile.trend.map((t) => t.medianOverAskingPct),
    footer: `${Math.round(profile.shareAboveAsking * 100)}% sold above asking · typical €${profile.medianPrice.toLocaleString("en-IE")}`,
  });
}
