import type { Metadata } from "next";
import Link from "next/link";
import { streetAreas, type StreetArea } from "@/lib/real-price/street-page";

// Read from the live database on request (the build has no database)
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "House Prices by Street: Dublin and Every County",
  description:
    "Every sold price on thousands of Irish streets, from the Property Price Register: typical prices, change over time and homes sold twice.",
  alternates: { canonical: "/streets" },
};

/** Dublin's districts in number order, then its towns, alphabetically. */
const order = (a: StreetArea) => {
  const m = a.areaName.match(/^Dublin (\d+)(W?)$/);
  return m ? `0${m[1].padStart(2, "0")}${m[2]}` : `1${a.areaName}`;
};

export default async function StreetsIndex() {
  const areas = await streetAreas();
  const total = areas.reduce((sum, a) => sum + a.streets, 0);
  const counties = [...new Set(areas.map((a) => a.county))].sort((a, b) =>
    a === "Dublin" ? -1 : b === "Dublin" ? 1 : a.localeCompare(b),
  );

  return (
    <main className="rp-area rp-street">
      <section className="rp-wrap rp-areas-head">
        <nav className="rp-crumbs" aria-label="Breadcrumb">
          <Link href="/areas">Areas</Link>
          <span aria-hidden="true">/</span>
          <span>Streets</span>
        </nav>
        <h1 className="rp-blog-title">House prices, street by street.</h1>
        <p className="rp-blog-lede">
          {total.toLocaleString("en-IE")} streets in Dublin and every county with at least ten sales since 2010, each
          with every sold price from the Property Price Register, the typical price now and homes that sold more than
          once. Pick an area.
        </p>
        <nav className="rp-street-counties" aria-label="Counties">
          {counties.map((c) => (
            <a key={c} href={`#${c.toLowerCase()}`}>
              {c}
            </a>
          ))}
        </nav>
        {counties.map((county) => {
          const list = areas.filter((a) => a.county === county).sort((a, b) => order(a).localeCompare(order(b)));
          const streets = list.reduce((sum, a) => sum + a.streets, 0);
          return (
            <section key={county} id={county.toLowerCase()} className="rp-street-county">
              <h2 className="rp-h2">
                {county === "Dublin" ? "Dublin" : `Co. ${county}`}{" "}
                <small>{streets.toLocaleString("en-IE")} streets</small>
              </h2>
              <ul className="rp-street-list">
                {list.map((a) => (
                  <li key={a.areaKey}>
                    <Link href={`/streets/in/${a.areaSlug}`}>{a.areaName.replace(/, Co\. .+$/, "")}</Link>
                    <span>{a.streets} streets</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </section>
    </main>
  );
}
