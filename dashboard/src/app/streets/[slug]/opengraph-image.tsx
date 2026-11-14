import { OG_SIZE, ogCard } from "@/lib/og-card";
import { loadStreetPage } from "@/lib/real-price/street-page";

export const alt = "Sold prices on this street, from the Property Price Register";
export const size = OG_SIZE;
export const contentType = "image/png";

const short = (v: number) => (v >= 1_000_000 ? `€${(v / 1_000_000).toFixed(2)}m` : `€${Math.round(v / 1000)}k`);

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const page = await loadStreetPage((await params).slug);
  if (!page) return ogCard({ kicker: "Property Price Register", title: "House prices, street by street" });
  return ogCard({
    kicker: `${page.areaLabel} · ${page.count} sales since ${page.firstYear}`,
    title: page.name,
    figure: page.typical ? short(page.typical.price) : undefined,
    figureNote: page.typical ? "typical now" : undefined,
    // As many bars as the area cards fit
    bars: page.years.slice(-10).map((y) => y.median),
    footer: page.change
      ? `${page.change.pct >= 0 ? "+" : "−"}${Math.abs(page.change.pct).toFixed(0)}% on ${page.change.fromYears} · every sold price`
      : "Every sold price from the Property Price Register",
  });
}
