import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import Bars3D from "@/components/rp/Bars3D";
import {
  areaKeyFromSlug,
  areaSlug,
  buildAreaPage,
  TYPE_NAMES,
  type AreaLink,
  type AreaPage,
} from "@/lib/real-price/area-page";
import { getSalesStore } from "@/lib/real-price/store";
import { jsonLd, SITE_URL } from "@/lib/site";
import SalesBoard from "../../real-price/SalesBoard";
import AreaStreet from "../AreaStreet";

// Built from the live database on request. Pre-building at deploy time would
// use the seed file (the build has no database), showing old figures.
export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

const euro = (v: number) => `€${Math.round(v).toLocaleString("en-IE")}`;
const pct = (v: number) => `${Math.abs(v).toFixed(1)}%`;
const signed = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}%`;
const overUnder = (v: number) => `${pct(v)} ${v >= 0 ? "over" : "under"} asking`;
const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric" });
const quarterLabel = (q: string) => {
  const [year, quarter] = q.split(" ");
  return `${quarter} ’${year.slice(2)}`;
};
const checkLink = (key: string, extra: Record<string, string | number> = {}) =>
  `/?${new URLSearchParams({ area: key, ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, String(v)])) })}`;

async function load(slug: string): Promise<AreaPage | null> {
  const key = areaKeyFromSlug(slug);
  if (!key) return null;
  const store = await getSalesStore();
  return buildAreaPage(store, key);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const page = await load((await params).slug);
  if (!page) return { title: "Area not found", robots: { index: false } };
  const p = page.profile;
  // Short enough to show in full in search results: keywords first, then the year
  const title = `${page.label} House Prices: Sold vs Asking (${page.dataTo.slice(0, 4)})`;
  const parts = [
    `Homes in ${page.label} sold a typical ${overUnder(p.medianOverAskingPct)} in the last 12 months.`,
    `${Math.round(p.shareAboveAsking * 100)}% went above asking.`,
    `Typical sale ${euro(p.medianPrice)}.`,
    `From ${p.count} sales.`,
  ];
  let description = parts.join(" ");
  while (description.length > 155 && parts.length > 2) {
    parts.pop();
    description = parts.join(" ");
  }
  const url = `/areas/${page.slug}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

function AreaCard({ area }: { area: AreaLink }) {
  return (
    <Link href={`/areas/${area.slug}`} className="rp-area-card">
      <span className="rp-area-card-name">{area.label}</span>
      <span className="rp-area-card-figure">{signed(area.medianOverAskingPct)}</span>
      <span className="rp-area-card-sub">typical sale {euro(area.medianPrice)}</span>
    </Link>
  );
}

export default async function AreaPageView({ params }: { params: Params }) {
  const { slug } = await params;
  const key = areaKeyFromSlug(slug);
  // Old spellings ("dublin8") move to the readable address
  if (key && areaSlug(key) !== slug) permanentRedirect(`/areas/${areaSlug(key)}`);
  const page = await load(slug);
  if (!page) {
    if (key) permanentRedirect("/areas");
    notFound();
  }

  const p = page.profile;
  const trend = p.trend;
  const first = trend[0];
  const last = trend[trend.length - 1];
  const moved = first && last && trend.length >= 4 ? last.medianOverAskingPct - first.medianOverAskingPct : null;
  const aboveDublin = p.medianOverAskingPct - page.dublin.medianOverAskingPct;
  const share = Math.round(p.shareAboveAsking * 100);
  const url = `${SITE_URL}/areas/${page.slug}`;

  const faq = [
    {
      q: `How much over asking do homes sell for in ${page.label}?`,
      a: `In the last 12 months the typical home in ${page.label} sold for ${overUnder(p.medianOverAskingPct)}. Half of sales finished between ${signed(p.p25OverAskingPct)} and ${signed(p.p75OverAskingPct)} of their asking price. Across Dublin the typical sale was ${overUnder(page.dublin.medianOverAskingPct)}.`,
    },
    {
      q: `What share of homes in ${page.label} sell above the asking price?`,
      a: `${share}% of the ${p.count} homes sold in ${page.label} in the last 12 months went for more than their asking price, against ${Math.round(page.dublin.shareAboveAsking * 100)}% across Dublin.`,
    },
    {
      q: `What is the typical sale price in ${page.label}?`,
      a: `The typical home sold for ${euro(p.medianPrice)}${p.medianPricePerSqm ? `, about ${euro(p.medianPricePerSqm)} per square metre` : ""}. Prices depend heavily on the type and size of home; check a specific home for an answer built from similar sales.`,
    },
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Areas", item: `${SITE_URL}/areas` },
          { "@type": "ListItem", position: 3, name: page.label, item: url },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <main className="rp-area">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />

      <section className="rp-area-hero">
        <div className="rp-wrap rp-area-hero-grid">
          <div className="rp-area-hero-copy">
            <nav className="rp-crumbs" aria-label="Breadcrumb">
              <Link href="/areas">Areas</Link>
              <span aria-hidden="true">/</span>
              <span>{page.label}</span>
            </nav>
            <p className="rp-eyebrow">
              Last 12 months · {p.count.toLocaleString("en-IE")} sales
            </p>
            <h1 className="rp-area-title">
              Homes in {page.label} sell for{" "}
              <span className="rp-area-title-figure">{overUnder(p.medianOverAskingPct)}</span>
            </h1>
            <p className="rp-area-lede">
              {share}% went above asking. The typical home sold for <strong>{euro(p.medianPrice)}</strong>
              {p.medianPricePerSqm ? <>, about {euro(p.medianPricePerSqm)} per m²</> : null}. That is{" "}
              {Math.abs(aboveDublin) < 0.3
                ? "in line with Dublin as a whole"
                : `${pct(aboveDublin)} ${aboveDublin > 0 ? "hotter" : "cooler"} than Dublin as a whole`}
              .
            </p>
            <div className="rp-hero-actions">
              <Link href={checkLink(page.key)} className="rp-button rp-button--ink">
                Check a home in {page.label}
              </Link>
              <Link href="/areas" className="rp-link">
                Compare every area
              </Link>
            </div>
          </div>

          <AreaStreet sales={page.street.sales} type={page.street.type} beds={page.street.beds}>
            {page.rank && (
              <div className="rp-glass rp-glass--b">
                <b>
                  #{page.rank.position}
                  <small> of {page.rank.of}</small>
                </b>
                <span>districts for bidding</span>
              </div>
            )}
            <div className="rp-glass rp-glass--a">
              <b>{share}%</b>
              <span>sold above asking</span>
            </div>
          </AreaStreet>
        </div>
      </section>

      <div className="rp-wrap">
        {trend.length >= 3 && (
          <section className="rp-area-section">
            <div className="rp-area-section-head">
              <h2 className="rp-h2">Quarter by quarter.</h2>
              <p className="rp-prose">
                How far over asking the typical {page.label} sale went, each quarter.
                {moved !== null && Math.abs(moved) >= 0.5 && (
                  <>
                    {" "}
                    Bidding has {moved > 0 ? "heated up" : "cooled"} from{" "}
                    <strong>{signed(first.medianOverAskingPct)}</strong> in {first.quarter} to{" "}
                    <strong>{signed(last.medianOverAskingPct)}</strong> in {last.quarter}.
                  </>
                )}
              </p>
            </div>
            <Bars3D
              ariaLabel={`Typical sale price against asking in ${page.label}, by quarter`}
              valueHeading="Typical sale vs asking"
              bars={trend.map((q, i) => ({
                label: quarterLabel(q.quarter),
                value: q.medianOverAskingPct,
                highlight: i === trend.length - 1,
                detail: `${q.count} sales, typical price ${euro(q.medianPrice)}`,
              }))}
            />
          </section>
        )}

        {page.byType.length >= 2 && (
          <section className="rp-area-section">
            <div className="rp-area-section-head">
              <h2 className="rp-h2">By type of home.</h2>
              <p className="rp-prose">The same area bids differently for a flat and a family house.</p>
            </div>
            <div className="rp-area-types">
              {page.byType.map(({ type, profile }) => (
                <div key={type} className="rp-area-type">
                  <span className="rp-area-type-name">{TYPE_NAMES[type].plural}</span>
                  <span className="rp-area-type-figure">{signed(profile.medianOverAskingPct)}</span>
                  <span className="rp-area-type-bar" aria-hidden="true">
                    <i style={{ width: `${Math.round(profile.shareAboveAsking * 100)}%` }} />
                  </span>
                  <span className="rp-area-type-sub">
                    {Math.round(profile.shareAboveAsking * 100)}% above asking · typical {euro(profile.medianPrice)} ·{" "}
                    {profile.count} sales
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {page.typical.length > 0 && (
          <section className="rp-area-section">
            <div className="rp-area-section-head">
              <h2 className="rp-h2">What a typical home asks here, and gets.</h2>
              <p className="rp-prose">
                Typical asking prices in {page.label}, and what similar homes went on to sell for. Each row opens
                the full check.
              </p>
            </div>
            <div className="rp-area-typical">
              {page.typical.map((t) => (
                <Link
                  key={`${t.type}-${t.beds}`}
                  className="rp-area-typical-row"
                  href={checkLink(page.key, { type: t.type, beds: t.beds, asking: t.asking })}
                >
                  <span className="rp-area-typical-home">
                    {t.beds}-bed {TYPE_NAMES[t.type].single}
                  </span>
                  <span className="rp-area-typical-asks">
                    <small>asks</small> {euro(t.asking)}
                  </span>
                  <span className="rp-area-typical-arrow" aria-hidden="true">
                    →
                  </span>
                  <span className="rp-area-typical-gets">
                    <small>likely sells for</small> {euro(t.likely)}
                  </span>
                  <span className={`rp-area-typical-pct${t.overPct >= 0 ? " is-over" : ""}`}>{signed(t.overPct)}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="rp-area-section">
          <div className="rp-area-section-head">
            <h2 className="rp-h2">How far the bidding spreads.</h2>
            <p className="rp-prose">
              Half of {page.label} sales finished between <strong>{signed(p.p25OverAskingPct)}</strong> and{" "}
              <strong>{signed(p.p75OverAskingPct)}</strong> of asking. One in four went further than that.
            </p>
          </div>
          <div className="rp-spread" aria-hidden="true">
            {(() => {
              const lo = Math.min(-10, Math.floor(Math.min(...page.dots.values) / 5) * 5);
              const hi = Math.max(25, Math.ceil(Math.max(...page.dots.values) / 5) * 5);
              const at = (v: number) => `${((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * 100}%`;
              const ticks: number[] = [];
              for (let t = lo; t <= hi; t += 5) ticks.push(t);
              return (
                <>
                  <div className="rp-spread-band" style={{ left: at(p.p25OverAskingPct), right: `calc(100% - ${at(p.p75OverAskingPct)})` }} />
                  {(() => {
                    // Stacked in a column per 1% over asking, so height shows how common an outcome was
                    const stacks = new Map<number, number>();
                    const tallest = Math.max(
                      1,
                      ...Object.values(
                        page.dots.values.reduce<Record<number, number>>((acc, v) => {
                          const bin = Math.round(Math.min(hi, Math.max(lo, v)));
                          acc[bin] = (acc[bin] ?? 0) + 1;
                          return acc;
                        }, {}),
                      ),
                    );
                    const step = Math.min(9, 170 / tallest);
                    return page.dots.values.map((v, i) => {
                      const bin = Math.round(Math.min(hi, Math.max(lo, v)));
                      const level = stacks.get(bin) ?? 0;
                      stacks.set(bin, level + 1);
                      return (
                        <i
                          key={i}
                          className={v > 0 ? "is-over" : ""}
                          style={{ left: at(bin), bottom: `${14 + level * step}px`, animationDelay: `${level * 25}ms` }}
                        />
                      );
                    });
                  })()}
                  <div className="rp-spread-median" style={{ left: at(p.medianOverAskingPct) }}>
                    <span>typical {signed(p.medianOverAskingPct)}</span>
                  </div>
                  <div className="rp-spread-asking" style={{ left: at(0) }}>
                    <span>asking price</span>
                  </div>
                  <div className="rp-spread-axis">
                    {ticks.map((t) => (
                      <span key={t} style={{ left: at(t) }}>
                        {t > 0 ? `+${t}` : t}%
                      </span>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
          <p className="rp-spread-note">
            Each dot is {page.dots.salesPerDot === 1 ? "one sale" : `about ${page.dots.salesPerDot} sales`} in the last
            12 months.
          </p>
        </section>

        {page.recent.length > 0 && (
          <section className="rp-board-section">
            <div className="rp-board-intro">
              <h2 className="rp-h2">Latest sales in {page.label}.</h2>
              <p className="rp-prose">
                The price on the sign, and the price the buyer paid. The public register only shows the second.
              </p>
            </div>
            <SalesBoard sales={page.recent} />
          </section>
        )}

        {(page.nearby.length > 0 || page.similar.length > 0) && (
          <section className="rp-area-section">
            {page.nearby.length > 0 && (
              <>
                <h2 className="rp-h2">
                  {page.kind === "district" ? `Neighbourhoods in ${page.label}.` : "Around here."}
                </h2>
                <div className="rp-area-cards">
                  {page.nearby.map((a) => (
                    <AreaCard key={a.key} area={a} />
                  ))}
                </div>
              </>
            )}
            {page.similar.length > 0 && (
              <>
                <h3 className="rp-area-subhead">Where similar money buys a home</h3>
                <div className="rp-area-cards">
                  {page.similar.map((a) => (
                    <AreaCard key={a.key} area={a} />
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        <section className="rp-area-section rp-area-faq">
          <h2 className="rp-h2">Questions about {page.label}.</h2>
          {faq.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>

        <aside className="rp-blog-cta rp-area-cta">
          <div>
            <h2 className="rp-h2">Bidding in {page.label}?</h2>
            <p className="rp-prose">
              Put in the home&apos;s type, size and asking price, or paste its listing link, and see what similar
              homes here really sold for.
            </p>
          </div>
          <Link href={checkLink(page.key)} className="rp-button rp-button--ink">
            Check the home, free
          </Link>
        </aside>

        <p className="rp-area-source">
          From {p.count.toLocaleString("en-IE")} {page.label} sales in the 12 months to {longDate(page.dataTo)}, each with
          its asking price and its sale price from the Property Price Register. Not a valuation.
        </p>
      </div>
    </main>
  );
}
