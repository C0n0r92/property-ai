import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SoldAlert from "@/components/rp/SoldAlert";
import WorthCard from "@/components/rp/WorthCard";
import { TYPE_NAMES } from "@/lib/real-price/area-page";
import { encodeHome } from "@/lib/real-price/compare";
import { loadHomePage, type HomePage, type TimelineEvent } from "@/lib/real-price/home-page";
import { reportPrice } from "@/lib/real-price/pricing";
import { getSalesStore } from "@/lib/real-price/store";
import { homeTitle } from "@/lib/real-price/home-title";
import HomeCheck from "./HomeCheck";

// One home's page, read from the database on request. Not indexed (yet): see the robots setting below.
export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

const euro = (v: number) => `€${Math.round(v).toLocaleString("en-IE")}`;
const monthYear = (iso: string) => new Date(iso).toLocaleDateString("en-IE", { month: "short", year: "numeric" });
const signed = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}%`;

async function load(slug: string): Promise<HomePage | null> {
  const store = await getSalesStore();
  return loadHomePage(slug, new Set(store.areas.map((a) => a.key)));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const page = await load((await params).slug);
  if (!page) return { title: "Home not found", robots: { index: false } };
  return {
    title: `${homeTitle(page.address)}, ${page.areaName}: sold prices and value`,
    description: `Every recorded sale, listing and planning application for ${page.address}, and what it's likely worth.`,
    // Private for now: reached by search, not listed in Google
    robots: { index: false, follow: true },
  };
}

function Event({ e }: { e: TimelineEvent }) {
  if (e.kind === "sold") {
    return (
      <li className="rp-home-event rp-home-event--sold">
        <span className="rp-home-event-date">{monthYear(e.date)}</span>
        <span className="rp-home-event-what">
          <strong>Sold for {euro(e.price)}</strong>
          {e.newBuild ? " (new, before VAT)" : ""}
          {e.asking ? (
            <>
              {" "}
              · asked {euro(e.asking)}, {signed((e.price / e.asking - 1) * 100)}
            </>
          ) : null}
        </span>
      </li>
    );
  }
  if (e.kind === "listed") {
    return (
      <li className="rp-home-event rp-home-event--listed">
        <span className="rp-home-event-date">{monthYear(e.date)}</span>
        <span className="rp-home-event-what">
          <strong>Listed at {euro(e.firstPrice)}</strong>
          {e.price !== e.firstPrice ? ` · ${e.price < e.firstPrice ? "cut" : "raised"} to ${euro(e.price)}` : ""}
          {e.saleAgreed ? " · sale agreed" : ""}
          <small> · seen until {monthYear(e.until)}</small>
        </span>
      </li>
    );
  }
  return (
    <li className="rp-home-event rp-home-event--planning">
      <span className="rp-home-event-date">{monthYear(e.date)}</span>
      <span className="rp-home-event-what">
        <strong>Planning: {e.decision}</strong> · {e.work} <small>({e.appNumber})</small>
      </span>
    </li>
  );
}

export default async function HomePageView({ params }: { params: Params }) {
  const page = await load((await params).slug);
  if (!page) notFound();
  const price = reportPrice();
  const dublin = page.county === "Dublin";
  const listing = page.forSale ?? page.listings[0] ?? null;
  const describe = listing?.typeGroup
    ? `${listing.beds ? `${listing.beds}-bed ` : ""}${TYPE_NAMES[listing.typeGroup].single}`
    : null;

  return (
    <main className="rp-area rp-home">
      <section className="rp-area-hero">
        <div className="rp-wrap rp-street-hero">
          <div className="rp-area-hero-copy">
            <nav className="rp-crumbs" aria-label="Breadcrumb">
              <Link href={dublin ? "/areas" : "/streets"}>{dublin ? "Areas" : "Streets"}</Link>
              <span aria-hidden="true">/</span>
              {page.street ? (
                <Link href={`/streets/${page.street.slug}`}>{page.street.name}</Link>
              ) : (
                <span>{page.areaName}</span>
              )}
            </nav>
            <p className="rp-eyebrow">
              {page.areaName}
              {describe ? ` · ${describe}` : ""}
              {listing?.sqm ? ` · ${Math.round(listing.sqm)} m²` : ""}
            </p>
            <h1 className="rp-area-title rp-home-title">{homeTitle(page.address)}</h1>
            <p className="rp-area-lede">
              {page.forSale ? (
                <>
                  <strong>For sale</strong> at {euro(page.forSale.askingPrice)}
                  {page.forSale.saleAgreed ? ", sale agreed" : ""}, listed {monthYear(page.forSale.firstSeen)}.
                </>
              ) : page.sales[0] ? (
                <>
                  Last sold for <strong>{euro(page.sales[0].price)}</strong> in {monthYear(page.sales[0].date)}
                  {page.sales.length > 1 ? `, and ${page.sales.length - 1} time${page.sales.length > 2 ? "s" : ""} before` : ""}.
                </>
              ) : (
                <>No sale recorded since 2010.</>
              )}
            </p>
          </div>

          <div className="rp-home-primary">
            {page.check ? (
              <>
                {!page.forSale && listing && (
                  <p className="rp-home-note">
                    Last listed at {euro(listing.askingPrice)} ({monthYear(listing.lastSeen)}). If it comes back at that price:
                  </p>
                )}
                <HomeCheck query={page.check} address={page.address} priceLabel={price.label} />
              </>
            ) : page.worth ? (
              <WorthCard home={page.worth} showStreetLink={false} />
            ) : (
              <div className="rp-home-check">
                <p className="rp-home-check-sub">
                  {dublin
                    ? "Not enough recorded about this home for an estimate. If it's for sale, check it with its asking price."
                    : "Not enough recorded about this home for an estimate."}
                </p>
                {dublin && (
                  <Link href="/#check" className="rp-button rp-button--ink">
                    Check it with its asking price
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="rp-wrap">
        <section className="rp-area-section">
          <div className="rp-area-section-head">
            <h2 className="rp-h2">Its history.</h2>
            <p className="rp-prose">Sales from the Property Price Register, listings we&apos;ve seen, and planning.</p>
          </div>
          {page.timeline.length ? (
            <ol className="rp-home-timeline">
              {page.timeline.map((e, i) => (
                <Event key={`${e.kind}-${e.date}-${i}`} e={e} />
              ))}
            </ol>
          ) : (
            <p className="rp-prose">Nothing recorded since 2010.</p>
          )}
        </section>

        {page.check && page.worth && (
          <section className="rp-area-section">
            <h2 className="rp-h2">What it&apos;s worth, from its last sale.</h2>
            <WorthCard home={page.worth} showStreetLink={false} />
          </section>
        )}

        {!page.worth && (
          <section className="rp-area-section">
            <SoldAlert address={page.address} county={page.county} />
          </section>
        )}

        <section className="rp-area-section">
          <h2 className="rp-h2">Around it.</h2>
          <div className="rp-area-cards">
            {page.street && (
              <Link href={`/streets/${page.street.slug}`} className="rp-area-card">
                <span className="rp-area-card-name">{page.street.name}</span>
                <span className="rp-area-card-sub">Every sale on the street</span>
              </Link>
            )}
            {page.check && (
              <Link href={`/compare?a=${encodeHome(page.check)}`} className="rp-area-card">
                <span className="rp-area-card-name">Compare it</span>
                <span className="rp-area-card-sub">With another home you&apos;re looking at</span>
              </Link>
            )}
            {dublin && /^d\d/.test(page.areaKey) && (
              <Link href={`/areas/dublin-${page.areaKey.slice(1)}`} className="rp-area-card">
                <span className="rp-area-card-name">{page.areaName}</span>
                <span className="rp-area-card-sub">How the area bids against asking</span>
              </Link>
            )}
          </div>
        </section>

        <p className="rp-area-source">
          Sales: Property Price Register. Listings: our records of homes for sale. Planning: Department of Housing, CC BY
          4.0. Not a valuation.
        </p>
      </div>
    </main>
  );
}
