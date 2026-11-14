import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/rp/motion";
import Bars3D from "@/components/rp/Bars3D";
import { TYPE_NAMES } from "@/lib/real-price/area-page";
import { toTypeGroup } from "@/lib/real-price/model";
import { reportPrice } from "@/lib/real-price/pricing";
import { getSalesStore } from "@/lib/real-price/store";
import { loadStreetPage, type StreetPage } from "@/lib/real-price/street-page";
import { decisionWord, streetPlanning, workSummary } from "@/lib/real-price/planning-data";
import { jsonLd, SITE_URL } from "@/lib/site";
import AreaCheck from "../../areas/AreaCheck";
import StreetAlert from "./StreetAlert";

// Read from the live database on request (the build has no database)
export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;
type Search = Promise<{ sales?: string }>;

/** Sales shown before "all sales": the latest, kept short (very long pages also hydrate unreliably) */
const SHOWN_SALES = 12;

const euro = (v: number) => `€${Math.round(v).toLocaleString("en-IE")}`;
const short = (v: number) => (v >= 1_000_000 ? `€${(v / 1_000_000).toFixed(2)}m` : `€${Math.round(v / 1000)}k`);
const signed = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(v >= 100 || v <= -100 ? 0 : 1)}%`;
const monthYear = (iso: string) => new Date(iso).toLocaleDateString("en-IE", { month: "short", year: "numeric" });
const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric" });

const typeName = (raw: string) => {
  const group = toTypeGroup(raw);
  return group ? TYPE_NAMES[group].single : "home";
};

/** The search-result title, kept to about 60 characters. */
function titleFor(page: StreetPage): string {
  const options = [
    `${page.name}, ${page.areaLabel}: House Prices & Sales`,
    `${page.name}, ${page.areaName} House Prices`,
    `${page.name} House Prices, ${page.areaName.split(", ")[0]}`,
    `${page.name} House Prices`,
  ];
  return options.find((t) => t.length <= 60) ?? options[options.length - 1].slice(0, 60);
}

function descriptionFor(page: StreetPage): string {
  const parts = [
    `${page.count} sales on ${page.name}, ${page.areaLabel} since ${page.firstYear}.`,
    page.typical ? `Typical price ${short(page.typical.price)} over the last 3 years.` : null,
    page.lastSale ? `Last sold ${monthYear(page.lastSale.date)} for ${short(page.lastSale.price)}.` : null,
    "Every sold price from the Property Price Register.",
  ].filter(Boolean) as string[];
  let text = parts.join(" ");
  while (text.length > 155 && parts.length > 1) {
    parts.splice(parts.length - 2, 1);
    text = parts.join(" ");
  }
  return text.slice(0, 155);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const page = await loadStreetPage((await params).slug);
  if (!page) return { title: "Street not found", robots: { index: false } };
  const url = `/streets/${page.slug}`;
  const title = titleFor(page);
  const description = descriptionFor(page);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function StreetPageView({ params, searchParams }: { params: Params; searchParams: Search }) {
  const showAll = (await searchParams).sales === "all";
  const page = await loadStreetPage((await params).slug);
  if (!page) notFound();

  const planning = await streetPlanning(page.slug);
  const extensions = planning.rows.filter(
    (r) => (r.decision === "granted" || r.decision === "part") && r.kinds.some((k) => k === "extension" || k === "attic"),
  ).length;

  // The price check needs an area the model knows
  const store = await getSalesStore();
  const checkable = store.areas.some((a) => a.key === page.areaKey);
  const hasAreaPage = checkable;
  const areaName = page.areaName;


  const url = `${SITE_URL}/streets/${page.slug}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      page.county === "Dublin"
        ? { "@type": "ListItem", position: 1, name: "Areas", item: `${SITE_URL}/areas` }
        : { "@type": "ListItem", position: 1, name: "Streets", item: `${SITE_URL}/streets` },
      {
        "@type": "ListItem",
        position: 2,
        name: areaName,
        item: hasAreaPage ? `${SITE_URL}/areas/${page.areaSlug}` : `${SITE_URL}/streets/in/${page.areaSlug}`,
      },
      { "@type": "ListItem", position: 3, name: page.name, item: url },
    ],
  };

  const faq = [
    page.typical && {
      q: `What do homes on ${page.name} sell for?`,
      a: `The middle price of the ${page.typical.count} homes sold on ${page.name}, ${page.areaLabel} in the last three years was ${euro(page.typical.price)}. Prices on one street depend heavily on which homes sold: a few large or small homes move the figure.`,
    },
    page.change && {
      q: `How much have prices on ${page.name} risen?`,
      a: `The middle sale price in the last three years is ${signed(page.change.pct)} on ${page.change.fromYears}, comparing whichever homes sold in each period.`,
    },
    page.asking && {
      q: `Do homes on ${page.name} sell over asking?`,
      a: `Of ${page.asking.count} sales on ${page.name} where we know the asking price, ${Math.round(page.asking.shareAbove * 100)}% sold above it, and the typical result was ${signed(page.asking.medianOverAskingPct)} on the asking price.`,
    },
  ].filter(Boolean) as Array<{ q: string; a: string }>;

  return (
    <main className="rp-area rp-street">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />

      <section className="rp-area-hero">
        <div className="rp-wrap rp-street-hero">
          <div className="rp-area-hero-copy">
            <nav className="rp-crumbs" aria-label="Breadcrumb">
              {page.county === "Dublin" ? <Link href="/areas">Areas</Link> : <Link href="/streets">Streets</Link>}
              <span aria-hidden="true">/</span>
              <Link href={hasAreaPage ? `/areas/${page.areaSlug}` : `/streets/in/${page.areaSlug}`}>{areaName}</Link>
              <span aria-hidden="true">/</span>
              <span>{page.name}</span>
            </nav>
            <p className="rp-eyebrow">
              {page.count} sales since {page.firstYear} · Property Price Register
            </p>
            <h1 className="rp-area-title">
              {page.name}, <span className="rp-street-area">{page.areaLabel}</span>
            </h1>
            <p className="rp-area-lede">
              {page.typical ? (
                <>
                  Homes here have sold for a middle price of <strong>{euro(page.typical.price)}</strong> over the last three
                  years
                  {page.change ? (
                    <>
                      , {signed(page.change.pct)} on {page.change.fromYears}
                    </>
                  ) : null}
                  .
                </>
              ) : (
                <>Few homes have sold here in the last three years, so there is no recent typical price.</>
              )}{" "}
              {page.lastSale && (
                <>
                  The last sale was {longDate(page.lastSale.date)}, for {euro(page.lastSale.price)}.
                </>
              )}
            </p>
            {!checkable && (
              <p className="rp-street-scope">
                {page.county === "Dublin" ? (
                  <>
                    Too few homes here have sold with a known asking price for our price check.{" "}
                    <Link href="/#check" className="rp-link">Check a home elsewhere in Dublin</Link>.
                  </>
                ) : (
                  <>
                    Our price check and bidding report cover Dublin, where we know homes&apos; asking prices. Here you
                    can see every sold price on {page.name}.{" "}
                    <Link href="/streets" className="rp-link">Streets in other areas</Link>.
                  </>
                )}
              </p>
            )}
            {checkable && (
              <AreaCheck
                areaKey={page.areaKey}
                areaLabel={areaName}
                priceLabel={reportPrice().label}
                defaults={{
                  typeGroup: page.common?.type ?? "semi",
                  beds: page.common?.beds ?? 3,
                  askingPrice: Math.round((page.typical?.price ?? 450_000) / 1.08 / 5000) * 5000,
                }}
              />
            )}
          </div>

          <dl className="rp-street-figures">
            <div>
              <dt>Middle price, last 3 years</dt>
              <dd>{page.typical ? euro(page.typical.price) : "–"}</dd>
              <span>{page.typical ? `${page.typical.count} sales` : "too few sales"}</span>
            </div>
            <div>
              <dt>Change since {page.change?.fromYears ?? "earlier years"}</dt>
              <dd>{page.change ? signed(page.change.pct) : "–"}</dd>
              <span>middle price, then and now</span>
            </div>
            <div>
              <dt>On the asking price</dt>
              <dd>{page.asking ? signed(page.asking.medianOverAskingPct) : "–"}</dd>
              <span>
                {page.asking
                  ? `${Math.round(page.asking.shareAbove * 100)}% above asking, ${page.asking.count} sales`
                  : "asking prices not known here"}
              </span>
            </div>
            <div>
              <dt>Sold more than once</dt>
              <dd>{page.repeats.length}</dd>
              <span>homes on this street</span>
            </div>
          </dl>
        </div>
      </section>

      <div className="rp-wrap">
        <Reveal as="section" className="rp-area-section">
          <div className="rp-area-section-head">
            <h2 className="rp-h2">{showAll ? `Every sale on ${page.name}.` : "Latest sales."}</h2>
            {page.asking && <p className="rp-prose">With the asking price, where we know it.</p>}
          </div>
          <div className="rp-area-table">
            <table>
              <thead>
                <tr>
                  <th scope="col">Sold</th>
                  <th scope="col">Address</th>
                  <th scope="col" className="is-figure">
                    Price
                  </th>
                  {page.asking && (
                    <>
                      <th scope="col" className="is-figure">
                        Asking
                      </th>
                      <th scope="col" className="is-figure">
                        On asking
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {(showAll ? page.sales : page.sales.slice(0, SHOWN_SALES)).map((s, i) => (
                  <tr key={`${s.date}-${s.address}-${i}`}>
                    <td>{monthYear(s.date)}</td>
                    <th scope="row">
                      {s.home_slug ? <Link href={`/home/${s.home_slug}`}>{s.address}</Link> : s.address}
                      {s.new_build && <small> · new</small>}
                      {s.beds && s.property_type ? (
                        <small>
                          {" "}
                          · {s.beds}-bed {typeName(s.property_type)}
                        </small>
                      ) : null}
                    </th>
                    <td className="is-figure">{euro(s.price)}</td>
                    {page.asking && (
                      <>
                        <td className="is-figure">{s.asking ? euro(s.asking) : ""}</td>
                        <td className="is-figure">{s.overAskingPct !== null ? signed(s.overAskingPct) : ""}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!showAll && page.sales.length > SHOWN_SALES && (
            <p className="rp-area-more">
              <Link href={`/streets/${page.slug}?sales=all`} className="rp-link" rel="nofollow">
                All {page.sales.length} sales since {page.firstYear}
              </Link>
            </p>
          )}
        </Reveal>

        <Reveal as="section" className="rp-area-section">
          <StreetAlert street={page.name} area={areaName} county={page.county} />
        </Reveal>

        {page.years.length >= 3 && (
          <Reveal as="section" className="rp-area-section">
            <h2 className="rp-h2">Year by year.</h2>
            <Bars3D
              ariaLabel={`Middle sale price on ${page.name}, by year`}
              valueHeading="Middle sale price"
              unit="euro"
              bars={page.years.slice(-12).map((y, i, list) => ({
                label: String(y.year),
                value: y.median,
                highlight: i === list.length - 1,
                detail: `${y.count} sale${y.count === 1 ? "" : "s"}`,
              }))}
            />
            <p className="rp-area-source">Middle sale price each year. Years with few sales swing.</p>
          </Reveal>
        )}

        {page.repeats.length > 0 && (
          <Reveal as="section" className="rp-area-section">
            <div className="rp-area-section-head">
              <h2 className="rp-h2">The same home, sold again.</h2>
              <p className="rp-prose">First sale against latest.</p>
            </div>
            <div className="rp-area-table">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Home</th>
                    <th scope="col">First sold</th>
                    <th scope="col">Latest sale</th>
                    <th scope="col" className="is-figure">
                      Change
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {page.repeats.slice(0, 12).map((r) => (
                    <tr key={`${r.address}-${r.to.date}`}>
                      <th scope="row">{r.address}</th>
                      <td>
                        {euro(r.from.price)} <small>{monthYear(r.from.date)}</small>
                      </td>
                      <td>
                        {euro(r.to.price)} <small>{monthYear(r.to.date)}</small>
                      </td>
                      <td className="is-figure">
                        {signed(r.changePct)} <small>in {Math.round(r.years)} yrs</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        )}

        {planning.rows.length > 0 && (
          <Reveal as="section" className="rp-area-section">
            <div className="rp-area-section-head">
              <h2 className="rp-h2">Planning on {page.name}.</h2>
              <p className="rp-prose">
                {planning.total} application{planning.total === 1 ? "" : "s"}
                {extensions > 0 ? `, ${extensions} granted extensions or attics` : ""}.
              </p>
            </div>
            <div className="rp-area-table">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Lodged</th>
                    <th scope="col">Home</th>
                    <th scope="col">The work</th>
                    <th scope="col">Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {planning.rows.map((r) => (
                    <tr key={`${r.authority}-${r.appNumber}`}>
                      <td>{r.received ? monthYear(r.received) : ""}</td>
                      <th scope="row">{r.address.split(",")[0]}</th>
                      <td className="rp-street-work" title={r.description}>
                        {workSummary(r)}
                      </td>
                      <td>{decisionWord(r.decision)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {planning.total > planning.rows.length && (
              <p className="rp-area-source">The latest {planning.rows.length} are shown.</p>
            )}
          </Reveal>
        )}

        {faq.length > 0 && (
          <Reveal as="section" className="rp-area-section rp-area-faq">
            <h2 className="rp-h2">Questions about {page.name}.</h2>
            {faq.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </Reveal>
        )}

        {page.nearby.length > 0 && (
          <Reveal as="section" className="rp-area-section">
            <h2 className="rp-h2">More streets in {areaName}.</h2>
            <div className="rp-area-cards">
              {page.nearby.map((s) => (
                <Link key={s.slug} href={`/streets/${s.slug}`} className="rp-area-card">
                  <span className="rp-area-card-name">{s.name}</span>
                  <span className="rp-area-card-figure">{s.medianRecent ? short(s.medianRecent) : "–"}</span>
                  <span className="rp-area-card-sub">
                    {s.medianRecent ? "middle price, last 3 years" : "few recent sales"} · {s.sales} sales
                  </span>
                </Link>
              ))}
            </div>
            <p className="rp-area-more">
              <Link href={`/streets/in/${page.areaSlug}`} className="rp-link">
                Every street in {areaName}
              </Link>
              {hasAreaPage && (
                <>
                  {" · "}
                  <Link href={`/areas/${page.areaSlug}`} className="rp-link">
                    How {areaName} bids against asking
                  </Link>
                </>
              )}
            </p>
          </Reveal>
        )}

        {checkable && (
          <aside className="rp-blog-cta rp-area-cta">
            <div>
              <h2 className="rp-h2">Bidding on {page.name}?</h2>
              <p className="rp-prose">See what it will really sell for. Free.</p>
            </div>
            <a href="#check" className="rp-button rp-button--ink">
              Check the home, free
            </a>
          </aside>
        )}

        <p className="rp-area-source">
          Sold prices: Property Price Register (sales under €50,000 left out). Planning: Department of Housing, CC BY
          4.0. Not a valuation.
        </p>
      </div>
    </main>
  );
}
