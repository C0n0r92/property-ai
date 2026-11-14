import { OG_SIZE, ogCard } from "@/lib/og-card";
import { streetsInArea } from "@/lib/real-price/street-page";

export const alt = "Sold prices on every street in this area";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ area: string }> }) {
  const slug = (await params).area.toLowerCase();
  const district = slug.match(/^dublin-(\d{1,2}w?)$/);
  const key = district ? `d${district[1]}` : slug;
  const streets = /^[a-z0-9-]{2,60}$/.test(key) ? await streetsInArea(key) : [];
  const label = district ? `Dublin ${district[1].toUpperCase()}` : streets[0]?.areaName ?? "Your area";
  return ogCard({
    kicker: "Property Price Register",
    title: `House prices on every street in ${label}`,
    footer: streets.length ? `${streets.length} streets · every sold price since 2010` : "Every sold price since 2010",
  });
}
