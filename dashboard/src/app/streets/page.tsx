import type { Metadata } from "next";
import Link from "next/link";
import { streetAreas } from "@/lib/real-price/street-page";

// Read from the live database on request (the build has no database)
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dublin House Prices by Street",
  description:
    "Every sold price on thousands of Dublin streets, from the Property Price Register: typical prices, change over time and homes sold twice.",
  alternates: { canonical: "/streets" },
};

const byName = (a: { areaLabel: string }, b: { areaLabel: string }) => {
  const n = (s: string) => {
    const m = s.match(/^Dublin (\d+)(W?)$/);
    return m ? `0${m[1].padStart(2, "0")}${m[2]}` : `1${s}`;
  };
  return n(a.areaLabel).localeCompare(n(b.areaLabel));
};

export default async function StreetsIndex() {
  const areas = (await streetAreas()).sort(byName);
  const total = areas.reduce((sum, a) => sum + a.streets, 0);
  return (
    <main className="rp-area rp-street">
      <section className="rp-wrap rp-areas-head">
        <nav className="rp-crumbs" aria-label="Breadcrumb">
          <Link href="/areas">Areas</Link>
          <span aria-hidden="true">/</span>
          <span>Streets</span>
        </nav>
        <h1 className="rp-area-title">Dublin house prices, street by street.</h1>
        <p className="rp-area-lede">
          {total.toLocaleString("en-IE")} streets with at least ten sales since 2010, each with every sold price from the
          Property Price Register, the typical price now and homes that sold more than once. Pick an area.
        </p>
        <ul className="rp-street-list">
          {areas.map((a) => (
            <li key={a.areaKey}>
              <Link href={`/streets/in/${a.areaSlug}`}>{a.areaLabel}</Link>
              <span>{a.streets} streets</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
