import { areaProfiles } from "@/lib/real-price/area-page";
import { getSalesStore } from "@/lib/real-price/store";
import { OG_SIZE, ogCard } from "@/lib/og-card";

export const alt = "Dublin districts ranked by how far over asking homes sell";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const store = await getSalesStore();
  const districts = [...areaProfiles(store)]
    .filter(([k]) => /^d\d{1,2}w?$/.test(k))
    .map(([, p]) => p.medianOverAskingPct)
    .sort((a, b) => a - b);
  return ogCard({
    kicker: "Dublin areas · last 12 months",
    title: "How hard Dublin bids, district by district",
    bars: districts,
    footer: `${districts.length} districts, from real asking and sale prices`,
  });
}
