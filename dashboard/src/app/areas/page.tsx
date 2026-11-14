import type { Metadata } from "next";
import Link from "next/link";
import Bars3D from "@/components/rp/Bars3D";
import { Reveal } from "@/components/rp/motion";
import AreaMap, { type MapArea } from "@/components/rp/AreaMap";
import { buildAreaIndex, type AreaIndexRow } from "@/lib/real-price/area-page";
import { getSalesStore } from "@/lib/real-price/store";
import { jsonLd, SITE_URL } from "@/lib/site";

// Built from the live database on request. Pre-building at deploy time would
// use the seed file (the build has no database), showing old figures.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Dublin Areas Ranked by Over-Asking | Irish Property Data" },
  description:
    "Every Dublin district and neighbourhood ranked by how far over asking homes sell, with the share above asking, typical prices and price per m².",
  alternates: { canonical: "/areas" },
  openGraph: {
    title: "Dublin areas ranked by how far over asking homes sell",
    description: "Every district and neighbourhood, from real asking and sold prices.",
    url: "/areas",
    type: "website",
  },
};

const mapAreas = (rows: AreaIndexRow[]): MapArea[] =>
  rows
    .filter((r) => r.lat !== null && r.lng !== null)
    .map((r) => ({
      key: r.key,
      slug: r.slug,
      label: r.label,
      kind: r.kind,
      lat: r.lat!,
      lng: r.lng!,
      value: r.medianOverAskingPct,
      shareAbove: r.shareAboveAsking,
      price: r.medianPrice,
    }));

const euro = (v: number) => `€${Math.round(v).toLocaleString("en-IE")}`;
const signed = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}%`;

export default async function AreasIndex() {
  const store = await getSalesStore();
  const rows = buildAreaIndex(store).sort((a, b) => b.medianOverAskingPct - a.medianOverAskingPct);
  const districts = rows.filter((r) => r.kind === "district");
  const localities = rows.filter((r) => r.kind === "locality" && r.count >= 30);
  const hottest = districts[0];
  const coolest = districts[districts.length - 1];
  const dataTo = new Date(store.asOf).toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric" });

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Dublin districts by how far over asking homes sell",
    itemListElement: districts.map((d, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: d.label,
      url: `${SITE_URL}/areas/${d.slug}`,
    })),
  };

  const table = (list: typeof rows, caption: string) => (
    <div className="rp-area-table">
      <table>
        <caption className="rp-visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Area</th>
            <th scope="col">Typical sale vs asking</th>
            <th scope="col">Sold above asking</th>
            <th scope="col">Typical sale</th>
            <th scope="col">Per m²</th>
            <th scope="col">Sales</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r) => (
            <tr key={r.key}>
              <th scope="row">
                <Link href={`/areas/${r.slug}`}>{r.label}</Link>
              </th>
              <td className="is-figure">{signed(r.medianOverAskingPct)}</td>
              <td>
                <span className="rp-area-table-share">
                  <i style={{ width: `${Math.round(r.shareAboveAsking * 100)}%` }} />
                </span>
                {Math.round(r.shareAboveAsking * 100)}%
              </td>
              <td>{euro(r.medianPrice)}</td>
              <td>{r.medianPricePerSqm ? euro(r.medianPricePerSqm) : "–"}</td>
              <td>{r.count.toLocaleString("en-IE")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <main className="rp-area rp-areas-index">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      <section className="rp-wrap rp-areas-head">
        <p className="rp-eyebrow">Areas · last 12 months</p>
        <h1 className="rp-blog-title">How hard Dublin bids, district by district.</h1>
        {hottest && coolest && (
          <p className="rp-blog-lede">
            Homes in <Link href={`/areas/${hottest.slug}`}>{hottest.label}</Link> typically sell for{" "}
            <strong>{signed(hottest.medianOverAskingPct)}</strong> on their asking price; in{" "}
            <Link href={`/areas/${coolest.slug}`}>{coolest.label}</Link>, {signed(coolest.medianOverAskingPct)}. Each
            tower is a district: the taller it stands, the further over asking its homes go.
          </p>
        )}
        <p className="rp-area-more">
          <Link href="/streets" className="rp-link">Street by street</Link>
          {" · "}
          <Link href="/compare" className="rp-link">Compare two homes</Link>
          {" · "}
          <Link href="/track-record" className="rp-link">How accurate we are</Link>
        </p>
      </section>

      <section className="rp-wrap rp-areas-map">
        <AreaMap areas={mapAreas(rows)} />
      </section>

      <section className="rp-areas-skyline">
        <Bars3D
          layout="grid"
          ariaLabel="Dublin postal districts by typical sale price against asking, last 12 months"
          valueHeading="Typical sale vs asking"
          bars={districts.map((d, i) => ({
            label: d.label.replace("Dublin ", "D"),
            value: d.medianOverAskingPct,
            highlight: i < 3,
            href: `/areas/${d.slug}`,
            detail: `${signed(d.medianOverAskingPct)} · ${Math.round(d.shareAboveAsking * 100)}% above asking · typical ${euro(d.medianPrice)}`,
          }))}
        />
        <p className="rp-areas-skyline-note">
          Gold: the three hottest districts. <span className="rp-pointer-only">Point at</span>
          <span className="rp-touch-only">Tap</span> a tower for its figures, click to open it.
        </p>
      </section>

      <div className="rp-wrap">
        <Reveal as="section" className="rp-area-section">
          <h2 className="rp-h2">Postal districts</h2>
          {table(districts, "Dublin postal districts")}
        </Reveal>
        {localities.length > 0 && (
          <Reveal as="section" className="rp-area-section">
            <h2 className="rp-h2">Neighbourhoods and towns</h2>
            {table(localities, "Dublin neighbourhoods and towns")}
          </Reveal>
        )}
        <p className="rp-area-source">
          From sales in the 12 months to {dataTo} where both the asking price and the sale price are known. Areas
          need 20 sales in the year to be listed.
        </p>
      </div>
    </main>
  );
}
