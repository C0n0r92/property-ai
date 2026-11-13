import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Bars3D from "@/components/rp/Bars3D";
import { CountUp, Reveal } from "@/components/rp/motion";
import ReportStory from "../ReportStory";
import { areaSlug, TYPE_NAMES } from "@/lib/real-price/area-page";
import { availableMonths, buildMonthlyReport, type MonthFigures } from "@/lib/real-price/monthly-report";
import { getSalesStore } from "@/lib/real-price/store";
import { jsonLd, SITE_NAME, SITE_URL } from "@/lib/site";

// Built from the live database on request. Pre-building at deploy time would
// use the seed file (the build has no database), showing old figures.
export const dynamic = "force-dynamic";

type Params = Promise<{ month: string }>;

const euro = (v: number) => `€${Math.round(v).toLocaleString("en-IE")}`;
const signed = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}%`;
const points = (v: number) => `${Math.abs(v).toFixed(1)} points`;
const shortMonth = (m: string) =>
  new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-IE", { month: "short", year: "2-digit", timeZone: "UTC" });
const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric" });

async function load(month: string) {
  const store = await getSalesStore();
  return { report: buildMonthlyReport(store, month), months: availableMonths(store) };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { month } = await params;
  const { report: r } = await load(month);
  if (!r) return { title: "Report not found", robots: { index: false } };
  const title = `Dublin homes sold ${signed(r.medianOverAskingPct)} over asking in ${r.label}`;
  const top = r.districts[0] ? ` Hottest: ${r.districts[0].label} (${signed(r.districts[0].medianOverAskingPct)}).` : "";
  const description = `${Math.round(r.shareAboveAsking * 100)}% of Dublin homes sold above asking in ${r.label}; typical sale ${euro(r.medianPrice)}.${top} From ${r.count} matched sales.`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/reports/${r.month}` },
    openGraph: { title, description, url: `/reports/${r.month}`, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

function Change({ now, then, label, unit = "pct" }: { now: number; then: MonthFigures | null; label: string; unit?: "pct" | "share" | "euro" }) {
  if (!then) return null;
  const was = unit === "share" ? then.shareAboveAsking * 100 : unit === "euro" ? then.medianPrice : then.medianOverAskingPct;
  const diff = now - was;
  const text =
    unit === "euro"
      ? `${diff >= 0 ? "+" : "−"}${(Math.abs(diff / was) * 100).toFixed(1)}%`
      : `${diff >= 0 ? "+" : "−"}${points(diff)}`;
  return (
    <span className={`rp-change ${diff > 0.05 ? "is-up" : diff < -0.05 ? "is-down" : ""}`}>
      {text} <small>vs {label}</small>
    </span>
  );
}

export default async function MonthlyReportPage({ params }: { params: Params }) {
  const { month } = await params;
  const { report: r, months } = await load(month);
  if (!r) notFound();

  const share = Math.round(r.shareAboveAsking * 100);
  const idx = months.indexOf(r.month);
  const newer = idx > 0 ? months[idx - 1] : null;
  const older = idx >= 0 && idx < months.length - 1 ? months[idx + 1] : null;
  const url = `${SITE_URL}/reports/${r.month}`;
  const direction = (then: MonthFigures | null) =>
    !then
      ? ""
      : Math.abs(r.medianOverAskingPct - then.medianOverAskingPct) < 0.15
        ? `level with ${then.label}`
        : `${r.medianOverAskingPct > then.medianOverAskingPct ? "up" : "down"} from ${signed(then.medianOverAskingPct)} in ${then.label}`;

  const changes = [direction(r.previous), direction(r.yearAgo)].filter(Boolean);
  const changeSentence = changes.length
    ? `${changes.join(", and ").replace(/^./, (c) => c.toUpperCase())}.`
    : `From ${r.count} matched sales.`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Report",
    headline: `Dublin homes sold ${signed(r.medianOverAskingPct)} over asking in ${r.label}`,
    url,
    datePublished: r.dataTo,
    dateModified: r.dataTo,
    inLanguage: "en-IE",
    author: { "@type": "Organization", name: SITE_NAME, url: `${SITE_URL}/` },
    publisher: { "@id": `${SITE_URL}/#organization` },
    about: { "@type": "City", name: "Dublin" },
  };

  return (
    <main className="rp-area rp-report-month">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />

      <section className="rp-report-hero">
        <div className="rp-wrap">
        <ReportStory
          title={`${r.label} in four figures`}
          steps={[
            {
              figure: signed(r.medianOverAskingPct),
              label: "the typical sale against asking",
              text: `In ${r.label} the typical Dublin home sold for ${signed(r.medianOverAskingPct)} on its asking price${r.previous ? `, against ${signed(r.previous.medianOverAskingPct)} in ${r.previous.label}` : ""}${r.yearAgo ? ` and ${signed(r.yearAgo.medianOverAskingPct)} a year earlier` : ""}.`,
            },
            {
              figure: `${share}%`,
              label: "sold above asking",
              text: `${share}% of the ${r.count.toLocaleString("en-IE")} homes we could match went for more than their asking price${r.yearAgo ? `, against ${Math.round(r.yearAgo.shareAboveAsking * 100)}% a year earlier` : ""}. The typical one sold for ${euro(r.medianPrice)}.`,
            },
            ...(r.districts[0]
              ? [
                  {
                    figure: signed(r.districts[0].medianOverAskingPct),
                    label: `in ${r.districts[0].label}, the hottest district`,
                    text: `${r.districts[0].label} bid hardest: its typical sale went ${signed(r.districts[0].medianOverAskingPct)} on asking, from ${r.districts[0].count} sales. At the other end, ${r.districts[r.districts.length - 1].label} went ${signed(r.districts[r.districts.length - 1].medianOverAskingPct)}.`,
                  },
                ]
              : []),
            ...(r.biggest[0]
              ? [
                  {
                    figure: signed(r.biggest[0].overAskingPct),
                    label: "the biggest jump over asking (of up to +50%)",
                    text: `${r.biggest[0].address}${r.biggest[0].area ? `, ${r.biggest[0].area}` : ""} was advertised at ${euro(r.biggest[0].askingPrice)} and sold for ${euro(r.biggest[0].soldPrice)}.`,
                  },
                ]
              : []),
          ]}
        />
      </div>

      <div className="rp-wrap">
          <nav className="rp-crumbs" aria-label="Breadcrumb">
            <Link href="/reports">Monthly reports</Link>
            <span aria-hidden="true">/</span>
            <span>{r.label}</span>
          </nav>
          <p className="rp-eyebrow">Dublin over-asking report · {r.label}</p>
          <h1 className="rp-area-title">
            Dublin homes sold for <span className="rp-area-title-figure">
              <CountUp value={r.medianOverAskingPct} format="signedPct" />
            </span> on
            their asking price in {r.label}.
          </h1>
          <p className="rp-area-lede">
            {changeSentence} {share}% of homes went above asking, and the typical home sold for{" "}
            <strong>{euro(r.medianPrice)}</strong>.
          </p>

          <div className="rp-report-tiles">
            <div className="rp-report-tile">
              <span>Typical sale vs asking</span>
              <b>
                <CountUp value={r.medianOverAskingPct} format="signedPct" />
              </b>
              <Change now={r.medianOverAskingPct} then={r.previous} label={r.previous?.label ?? ""} />
              <Change now={r.medianOverAskingPct} then={r.yearAgo} label={r.yearAgo?.label ?? ""} />
            </div>
            <div className="rp-report-tile">
              <span>Sold above asking</span>
              <b>
                <CountUp value={share} format="pct" decimals={0} />
              </b>
              <Change now={r.shareAboveAsking * 100} then={r.previous} label={r.previous?.label ?? ""} unit="share" />
              <Change now={r.shareAboveAsking * 100} then={r.yearAgo} label={r.yearAgo?.label ?? ""} unit="share" />
            </div>
            <div className="rp-report-tile">
              <span>Typical sale price</span>
              <b>
                <CountUp value={r.medianPrice} format="euro" />
              </b>
              <Change now={r.medianPrice} then={r.previous} label={r.previous?.label ?? ""} unit="euro" />
              <Change now={r.medianPrice} then={r.yearAgo} label={r.yearAgo?.label ?? ""} unit="euro" />
            </div>
            <div className="rp-report-tile">
              <span>Sales measured</span>
              <b>
                <CountUp value={r.count} />
              </b>
              <span className="rp-change">
                <small>with asking and sale price</small>
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="rp-wrap">
        {r.trend.length >= 3 && (
          <Reveal as="section" className="rp-area-section">
            <div className="rp-area-section-head">
              <h2 className="rp-h2">The last year.</h2>
              <p className="rp-prose">Typical sale against asking price, month by month. Months with too few matched sales are left out.</p>
            </div>
            <Bars3D
              ariaLabel="Dublin typical sale price against asking, by month"
              valueHeading="Typical sale vs asking"
              bars={r.trend.map((t) => ({
                label: shortMonth(t.month),
                value: t.medianOverAskingPct,
                highlight: t.month === r.month,
                detail: `${t.count} sales, ${Math.round(t.shareAboveAsking * 100)}% above asking, typical ${euro(t.medianPrice)}`,
              }))}
            />
          </Reveal>
        )}

        {r.districts.length >= 3 && (
          <Reveal as="section" className="rp-area-section">
            <div className="rp-area-section-head">
              <h2 className="rp-h2">District by district.</h2>
              <p className="rp-prose">
                Hottest in {r.label}: <strong>{r.districts[0].label}</strong>, at {signed(r.districts[0].medianOverAskingPct)}.
                Coolest: <strong>{r.districts[r.districts.length - 1].label}</strong>, at{" "}
                {signed(r.districts[r.districts.length - 1].medianOverAskingPct)}. Districts with at least 8 sales that month.
              </p>
            </div>
            <Bars3D
              layout="grid"
              ariaLabel={`Dublin districts by typical sale against asking in ${r.label}`}
              valueHeading="Typical sale vs asking"
              bars={r.districts.map((d, i) => ({
                label: d.label.replace("Dublin ", "D"),
                value: d.medianOverAskingPct,
                highlight: i < 3,
                href: `/areas/${areaSlug(d.key)}`,
                detail: `${signed(d.medianOverAskingPct)} · ${Math.round(d.shareAboveAsking * 100)}% above asking · ${d.count} sales`,
              }))}
            />
          </Reveal>
        )}

        <Reveal as="section" className="rp-area-section rp-report-split">
          <div>
            <h2 className="rp-h2">By type of home.</h2>
            <ul className="rp-hbars">
              {r.byType.map((t) => (
                <li key={t.type}>
                  <span className="rp-hbars-label">{TYPE_NAMES[t.type].plural}</span>
                  <span className="rp-hbars-track">
                    <i style={{ width: `${Math.max(2, (Math.max(0, t.medianOverAskingPct) / Math.max(1, ...r.byType.map((x) => x.medianOverAskingPct))) * 100)}%` }} />
                  </span>
                  <span className="rp-hbars-value">{signed(t.medianOverAskingPct)}</span>
                  <span className="rp-hbars-sub">
                    {t.count} sales · typical {euro(t.medianPrice)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="rp-h2">By asking price.</h2>
            <ul className="rp-hbars">
              {r.bands.map((b) => (
                <li key={b.label}>
                  <span className="rp-hbars-label">{b.label}</span>
                  <span className="rp-hbars-track">
                    <i style={{ width: `${Math.max(2, (Math.max(0, b.medianOverAskingPct) / Math.max(1, ...r.bands.map((x) => x.medianOverAskingPct))) * 100)}%` }} />
                  </span>
                  <span className="rp-hbars-value">{signed(b.medianOverAskingPct)}</span>
                  <span className="rp-hbars-sub">
                    {b.count} sales · {Math.round(b.shareAboveAsking * 100)}% above asking
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        {r.biggest.length > 0 && (
          <Reveal as="section" className="rp-area-section">
            <h2 className="rp-h2">The biggest jumps over asking.</h2>
            <p className="rp-prose rp-report-caveat">
              Sales more than 50% over asking are left out: some are genuine, but some are recording quirks on the
              register that we cannot check.
            </p>
            <div className="rp-area-typical rp-report-biggest">
              {r.biggest.map((b) => (
                <div key={`${b.address}-${b.soldPrice}`} className="rp-area-typical-row">
                  <span className="rp-area-typical-home">
                    {b.address}
                    <small>{b.area}</small>
                  </span>
                  <span className="rp-area-typical-asks">
                    <small>asked</small> {euro(b.askingPrice)}
                  </span>
                  <span className="rp-area-typical-arrow" aria-hidden="true">
                    →
                  </span>
                  <span className="rp-area-typical-gets">
                    <small>sold for</small> {euro(b.soldPrice)}
                  </span>
                  <span className="rp-area-typical-pct is-over">{signed(b.overAskingPct)}</span>
                </div>
              ))}
            </div>
          </Reveal>
        )}

        <Reveal as="section" className="rp-area-section rp-report-method">
          <div>
            <h2 className="rp-h2">How it is worked out.</h2>
            <div className="rp-prose">
              <p>
                Each sale is taken from the Property Price Register and paired with the asking price the same home was
                advertised at. {r.label} covers {r.count.toLocaleString("en-IE")} Dublin sales where both prices are known.
                Figures are medians: the typical sale, not the average, so a few extreme sales do not move them.
              </p>
              <p>
                Sales are registered weeks after they close, so the latest months can still change a little as late
                registrations arrive. Data to {longDate(r.dataTo)}.
              </p>
            </div>
          </div>
          <aside className="rp-report-press">
            <h3>Using these figures</h3>
            <p>
              Free to quote with credit to <strong>Irish Property Data</strong> and a link to this page. For more
              detail, an area breakdown or a comment, email{" "}
              <a href="mailto:hello@irishpropertydata.com">hello@irishpropertydata.com</a>.
            </p>
          </aside>
        </Reveal>

        <nav className="rp-report-pager" aria-label="Other months">
          {older ? <Link href={`/reports/${older}`}>← {shortMonth(older)}</Link> : <span />}
          <Link href="/reports">All months</Link>
          {newer ? <Link href={`/reports/${newer}`}>{shortMonth(newer)} →</Link> : <span />}
        </nav>

        <aside className="rp-blog-cta rp-area-cta">
          <div>
            <h2 className="rp-h2">Bidding on a home right now?</h2>
            <p className="rp-prose">See what homes like it really sold for, from the same data.</p>
          </div>
          <Link href="/" className="rp-button rp-button--ink">
            Check a home, free
          </Link>
        </aside>
      </div>
    </main>
  );
}
