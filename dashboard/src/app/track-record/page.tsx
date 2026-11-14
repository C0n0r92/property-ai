import type { Metadata } from "next";
import Link from "next/link";
import PlotChart, { type ChartSpec } from "@/app/blog/[slug]/PlotChart";
import { Reveal } from "@/components/rp/motion";
import { TYPE_NAMES } from "@/lib/real-price/area-page";
import { getSalesStore } from "@/lib/real-price/store";
import { trackRecord } from "@/lib/real-price/track-record";
import { jsonLd, SITE_URL } from "@/lib/site";

// Worked out from the live database (the build has no database)
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Track Record: How Accurate Is the Price Check?",
  description:
    "Every Dublin sale of the last 12 months, predicted from its asking price using only earlier sales, then checked against what it really sold for.",
  alternates: { canonical: "/track-record" },
};

const euro = (v: number) => `€${Math.round(v).toLocaleString("en-IE")}`;
const pct = (v: number, digits = 0) => `${v.toFixed(digits)}%`;
const monthName = (m: string) =>
  new Date(`${m}-01`).toLocaleDateString("en-IE", { month: "short", year: "2-digit" });
const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric" });

export default async function TrackRecordPage() {
  const store = await getSalesStore();
  const record = trackRecord(store);
  const o = record.overall;

  if (!o.tested) {
    return (
      <main className="rp-area rp-street">
        <section className="rp-wrap rp-areas-head">
          <h1 className="rp-area-title">Track record.</h1>
          <p className="rp-area-lede">The track record is being worked out. Try again in a minute.</p>
        </section>
      </main>
    );
  }

  // Whole months only: the 12-month window starts and ends part-way through one
  const partial = new Set([record.from.slice(0, 7), record.to.slice(0, 7)]);
  const months = record.byMonth.filter((m) => m.tested >= 30 && !partial.has(m.month));
  const chart: ChartSpec = {
    kind: "line",
    data: months.map((m) => ({
      month: monthName(m.month),
      model: Number(m.medianModelErrorPct.toFixed(1)),
      asking: Number(m.medianAskingErrorPct.toFixed(1)),
    })),
    x: "month",
    xLabel: null,
    yLabels: { default: "Typical miss (%)" },
    series: [
      { mark: "line", key: "model", name: "Our middle estimate" },
      { mark: "line", key: "asking", name: "The asking price" },
    ],
    caption: "How far each guess typically was from the sale price, month by month (lower is better). Whole months with at least 30 sales.",
  };

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Track record",
    url: `${SITE_URL}/track-record`,
    description: metadata.description,
  };

  return (
    <main className="rp-area rp-street">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      <section className="rp-area-hero">
        <div className="rp-wrap rp-street-hero">
          <div className="rp-area-hero-copy">
            <p className="rp-eyebrow">
              Track record · {o.tested.toLocaleString("en-IE")} sales, {longDate(record.from)} to {longDate(record.to)}
            </p>
            <h1 className="rp-area-title">How close we get.</h1>
            <p className="rp-area-lede">
              We took every Dublin sale of the last 12 months where we know the asking price, and predicted it the way the
              price check does today, using only sales that had closed before it. Then we checked what it really sold
              for. Our middle estimate was typically <strong>{pct(o.medianModelErrorPct, 1)}</strong> from the sale price;
              the asking price was typically <strong>{pct(o.medianAskingErrorPct, 1)}</strong> out.
            </p>
            <p className="rp-area-more">
              <Link href="/#check" className="rp-button rp-button--ink">
                Check a home, free
              </Link>
            </p>
          </div>
          <dl className="rp-street-figures">
            <div>
              <dt>Inside our range</dt>
              <dd>{pct(o.insideRangePct)}</dd>
              <span>of sales landed between our low and high</span>
            </div>
            <div>
              <dt>Typical miss</dt>
              <dd>{pct(o.medianModelErrorPct, 1)}</dd>
              <span>against {pct(o.medianAskingErrorPct, 1)} for the asking price</span>
            </div>
            <div>
              <dt>Closer than asking</dt>
              <dd>{pct(o.closerThanAskingPct)}</dd>
              <span>of sales: our middle beat the asking price</span>
            </div>
            <div>
              <dt>Within 10%</dt>
              <dd>{pct(o.within10Pct)}</dd>
              <span>{pct(o.within5Pct)} within 5%</span>
            </div>
          </dl>
        </div>
      </section>

      <div className="rp-wrap">
        {months.length >= 3 && (
          <Reveal as="section" className="rp-area-section">
            <div className="rp-area-section-head">
              <h2 className="rp-h2">Month by month.</h2>
              <p className="rp-prose">
                The asking price is a guess too. Here is how far each typically was from what the home sold for.
              </p>
            </div>
            <PlotChart spec={chart} name="Typical miss by month" />
          </Reveal>
        )}

        <Reveal as="section" className="rp-area-section">
          <div className="rp-area-section-head">
            <h2 className="rp-h2">The latest sales we tested.</h2>
            <p className="rp-prose">
              What each home asked, what we would have said the day before it sold, and what it got.
            </p>
          </div>
          <div className="rp-area-table">
            <table>
              <thead>
                <tr>
                  <th scope="col">Home</th>
                  <th scope="col" className="is-figure">
                    Asked
                  </th>
                  <th scope="col" className="is-figure">
                    We said
                  </th>
                  <th scope="col" className="is-figure">
                    Sold
                  </th>
                  <th scope="col">In range</th>
                </tr>
              </thead>
              <tbody>
                {record.recent.map((t) => (
                  <tr key={`${t.address}-${t.soldDate}`}>
                    <th scope="row">
                      {t.address}
                      <small>
                        {" "}
                        · {t.beds ? `${t.beds}-bed ` : ""}
                        {TYPE_NAMES[t.typeGroup].single}
                      </small>
                    </th>
                    <td className="is-figure">{euro(t.asking)}</td>
                    <td className="is-figure">
                      {euro(t.mid)}{" "}
                      <small>
                        ({euro(t.low)}–{euro(t.high)})
                      </small>
                    </td>
                    <td className="is-figure">{euro(t.sold)}</td>
                    <td>{t.inRange ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        <Reveal as="section" className="rp-area-section">
          <div className="rp-area-section-head">
            <h2 className="rp-h2">By type of home.</h2>
          </div>
          <div className="rp-area-table">
            <table>
              <thead>
                <tr>
                  <th scope="col">Type</th>
                  <th scope="col" className="is-figure">
                    Sales tested
                  </th>
                  <th scope="col" className="is-figure">
                    Inside our range
                  </th>
                  <th scope="col" className="is-figure">
                    Our typical miss
                  </th>
                  <th scope="col" className="is-figure">
                    Asking price&apos;s typical miss
                  </th>
                </tr>
              </thead>
              <tbody>
                {record.byType.map((t) => (
                  <tr key={t.type}>
                    <th scope="row">{TYPE_NAMES[t.type].plural}</th>
                    <td className="is-figure">{t.tested.toLocaleString("en-IE")}</td>
                    <td className="is-figure">{pct(t.insideRangePct)}</td>
                    <td className="is-figure">{pct(t.medianModelErrorPct, 1)}</td>
                    <td className="is-figure">{pct(t.medianAskingErrorPct, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        <Reveal as="section" className="rp-area-section rp-area-faq">
          <h2 className="rp-h2">How this is worked out, and its limits.</h2>
          <details>
            <summary>Is this a record of past answers?</summary>
            <p>
              It is a replay. For each sale we rebuild the answer the price check would have given the day before the
              sale, from the sales that had closed by then, and compare it with the result. That uses exactly the same
              method as the live check, and it is recomputed whenever the data updates, so these figures can&apos;t drift
              out of date.
            </p>
          </details>
          <details>
            <summary>When is it wrong?</summary>
            <p>
              About {pct(100 - o.insideRangePct)} of sales land outside our range. The usual reasons: a home that is
              unusual for its area (a big extension, a wreck, a rare location), a sale price agreed before a sudden shift
              in the market, or an asking price set far from the norm. The range tells you how wide the uncertainty is;
              treat the middle figure as a guide, not a valuation.
            </p>
          </details>
          <details>
            <summary>Which sales are included?</summary>
            <p>
              Dublin sales from the Property Price Register that we could pair with the home&apos;s asking price, in the
              12 months to {longDate(record.to)}: {o.tested.toLocaleString("en-IE")} in all. Sales with too few similar
              earlier sales to compare against are left out.
            </p>
          </details>
        </Reveal>
      </div>
    </main>
  );
}
