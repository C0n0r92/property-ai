import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSalesStore } from "@/lib/real-price/store";
import { streetsInArea } from "@/lib/real-price/street-page";

// Read from the live database on request (the build has no database)
export const dynamic = "force-dynamic";

type Params = Promise<{ area: string }>;

const short = (v: number) => (v >= 1_000_000 ? `€${(v / 1_000_000).toFixed(2)}m` : `€${Math.round(v / 1000)}k`);

/** "dublin-14" -> "d14"; town slugs are already keys. */
function areaKeyOf(slug: string): string | null {
  const s = slug.toLowerCase();
  const district = s.match(/^dublin-(\d{1,2}w?)$/);
  if (district) return `d${district[1]}`;
  return /^[a-z0-9-]{2,60}$/.test(s) ? s : null;
}

async function load(slug: string) {
  const key = areaKeyOf(slug);
  if (!key) return null;
  const streets = await streetsInArea(key);
  if (!streets.length) return null;
  const label = /^d\d/.test(key) ? `Dublin ${key.slice(1).toUpperCase()}` : streets[0].areaLabel.split(", ").pop()!;
  return { key, slug, label, streets };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const page = await load((await params).area);
  if (!page) return { title: "Area not found", robots: { index: false } };
  return {
    title: `${page.label} House Prices by Street`,
    description: `Sold prices on ${page.streets.length} streets in ${page.label}, from the Property Price Register: every sale, the typical price now and homes sold twice.`.slice(0, 155),
    alternates: { canonical: `/streets/in/${page.slug}` },
  };
}

export default async function StreetsInArea({ params }: { params: Params }) {
  const page = await load((await params).area);
  if (!page) notFound();
  const store = await getSalesStore();
  const hasAreaPage = store.areas.some((a) => a.key === page.key);

  return (
    <main className="rp-area rp-street">
      <section className="rp-wrap rp-areas-head">
        <nav className="rp-crumbs" aria-label="Breadcrumb">
          <Link href="/areas">Areas</Link>
          <span aria-hidden="true">/</span>
          <Link href="/streets">Streets</Link>
          <span aria-hidden="true">/</span>
          <span>{page.label}</span>
        </nav>
        <h1 className="rp-area-title">Streets in {page.label}.</h1>
        <p className="rp-area-lede">
          {page.streets.length} streets with at least ten sales since 2010, with the middle sale price of the last three
          years.
          {hasAreaPage && (
            <>
              {" "}
              <Link href={`/areas/${page.slug}`} className="rp-link">
                How {page.label} bids against asking
              </Link>
              .
            </>
          )}
        </p>
        <ul className="rp-street-list">
          {page.streets.map((s) => (
            <li key={s.slug}>
              <Link href={`/streets/${s.slug}`}>
                {s.name}
                {s.areaLabel.includes(", ") ? `, ${s.areaLabel.split(", ")[0]}` : ""}
              </Link>
              <span>{s.medianRecent ? short(s.medianRecent) : `${s.sales} sales`}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
