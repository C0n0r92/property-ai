/**
 * Real Price Report
 *
 * A printable A4 document. It opens for a paid Stripe Checkout session (the
 * session id in the URL is the key; nothing else is stored), or as a clearly
 * marked sample with ?sample=1.
 */

import { Metadata } from 'next';
import Link from 'next/link';
import Stripe from 'stripe';
import { buildReport, describeHome, type ReportData } from '@/lib/real-price/report';
import { checkoutSchema } from '@/lib/real-price/schema';
import { BACKTEST } from '@/lib/real-price/backtest';
import { getSalesStore } from '@/lib/real-price/store';
import { accuracyFigures } from '@/lib/real-price/track-record';
import { decisionWord, workSummary } from '@/lib/real-price/planning-data';
import TrackPurchase from './TrackPurchase';
import DotPlot from '../DotPlot';
import PrintButton from './PrintButton';

export const metadata: Metadata = {
  title: 'Real Price Report | Irish Property Data',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const SAMPLE = {
  query: { areaKey: 'd8', typeGroup: 'terraced', beds: 2, askingPrice: 395_000 } as const,
  // A real street with a long run of register sales, so the sample shows the street history
  label: 'Rialto Cottages, Rialto, Dublin 8',
};

const euro = (value: number) => `€${Math.round(value).toLocaleString('en-IE')}`;
const euroShort = (value: number) =>
  value >= 1_000_000 ? `€${(value / 1_000_000).toFixed(2).replace(/0$/, '')}m` : `€${Math.round(value / 1000)}k`;
const titleCase = (s: string) => s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
const signed = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' });
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: '2-digit' });

type Loaded = { report: ReportData; sample: boolean; paidCents?: number } | { problem: string };

async function loadReport(sessionId?: string, sample?: string): Promise<Loaded> {
  if (sample === '1') {
    const report = await buildReport({ ...SAMPLE.query }, SAMPLE.label);
    return report ? { report, sample: true } : { problem: 'The sample is unavailable right now.' };
  }

  if (!sessionId || !/^cs_[A-Za-z0-9_]{10,200}$/.test(sessionId)) {
    return { problem: 'This link is missing its payment reference.' };
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return { problem: 'Reports are not available on this server.' };
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-12-15.clover' });
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return { problem: 'We could not find that payment.' };
  }

  if (session.metadata?.kind !== 'real-price-report') {
    return { problem: 'That payment is not for a Real Price Report.' };
  }
  if (session.payment_status !== 'paid') {
    return { problem: 'That payment has not completed. If you were charged, reply to your receipt email.' };
  }

  let stored: unknown;
  try {
    stored = {
      query: JSON.parse(session.metadata.query ?? ''),
      // Older sessions stored the cover text as "label"
      address: session.metadata.address || session.metadata.label || undefined,
      eircode: session.metadata.eircode || undefined,
    };
  } catch {
    return { problem: 'The report details on that payment are unreadable. Reply to your receipt email.' };
  }
  const parsed = checkoutSchema.safeParse(stored);
  if (!parsed.success) {
    return { problem: 'The report details on that payment are unreadable. Reply to your receipt email.' };
  }

  const report = await buildReport(parsed.data.query, parsed.data.address);
  return report
    ? { report, sample: false, paidCents: session.amount_total ?? 0 }
    : { problem: 'There is no longer enough sales data for this home. Reply to your receipt email and we will sort it out.' };
}

/** Page: what our wider data shows about this home, its street and the market. */
function InsightsPage({ report, ribbon, page, total }: { report: ReportData; ribbon: React.ReactNode; page: number; total: number }) {
  const ins = report.insights!;
  const m = ins.market;
  const asking = report.query.askingPrice;
  const history = ins.history;
  const streetLabel = history?.street[0]
    ? titleCase(history.street[0].address.split(',')[0].replace(/^(apartment|apt|unit|flat)\s+\S+\s+/i, '').replace(/^\d+[a-z]?\s+/i, ''))
    : history
      ? titleCase(history.streetName)
      : '';
  const lastOwn = history?.home[0];
  const band = asking % 50_000 === 0 ? 'round' : asking % 50_000 >= 45_000 ? 'under' : 'other';
  const pct = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}%`;

  return (
    <section className="rp-page">
      {ribbon}
      <h2>What else the sales show</h2>
      <p>From the Property Price Register since 2010, with the asking prices we hold.</p>

      <div className="rp-insights">
        <div className="rp-insight rp-insight--wide">
          <h3>This home on the register</h3>
          {!history ? (
            <p>No address was given with this report, so its own sales and its street&apos;s are not shown.</p>
          ) : lastOwn ? (
            <>
              <p className="rp-insight-figure">
                Last sold for <strong>{euro(lastOwn.price)}</strong> on {longDate(lastOwn.date)}.
              </p>
              <p>
                Against today&apos;s asking price of {euro(asking)}, that is {pct((asking / lastOwn.price - 1) * 100)}.
                {history.home.length > 1 &&
                  ` Earlier sales: ${history.home
                    .slice(1)
                    .map((h) => `${euro(h.price)} in ${h.date.slice(0, 4)}`)
                    .join(', ')}.`}
              </p>
            </>
          ) : history.specific ? (
            <p>No earlier sale of this address on the register since 2010.</p>
          ) : (
            <p>The address names the street only, so the home&apos;s own sales are not shown.</p>
          )}
        </div>

        {history?.specific && (
          <div className="rp-insight rp-insight--wide">
            <h3>Planning for this home</h3>
            {ins.planning && ins.planning.length > 0 ? (
              <ul className="rp-insight-list">
                {ins.planning.slice(0, 6).map((p) => (
                  <li key={`${p.authority}-${p.appNumber}`}>
                    <strong>{decisionWord(p.decision)}</strong>
                    {p.received ? `, lodged ${longDate(p.received)}` : ''}: {workSummary(p, 180)}{' '}
                    <span className="rp-muted">({p.appNumber})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No planning applications for this address in the councils&apos; registers since 2012.</p>
            )}
            <p className="rp-muted">
              Worth checking: work done without permission, or a refusal, can matter to a lender and a surveyor.
            </p>
          </div>
        )}

        {history && history.street.length > 0 && (
          <div className="rp-insight rp-insight--wide">
            <h3>
              Every sale on {streetLabel} since 2010 <span className="rp-muted">({history.street.length})</span>
            </h3>
            <table className="rp-table rp-table--tight">
              <tbody>
                {history.street.slice(0, 14).map((s) => (
                  <tr key={`${s.address}-${s.date}`}>
                    <td>{s.address.split(',')[0]}</td>
                    <td className="rp-num">{shortDate(s.date)}</td>
                    <td className="rp-num">{euro(s.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {history.street.length > 14 && <p className="rp-muted">and {history.street.length - 14} earlier sales.</p>}
          </div>
        )}

        {m && (
          <>
            <div className="rp-insight">
              <h3>If the asking price is cut</h3>
              {ins.cut ? (
                <p className="rp-insight-figure">
                  This home&apos;s asking price was cut from {euro(ins.cut.first)} to {euro(ins.cut.latest)} (
                  {pct((ins.cut.latest / ins.cut.first - 1) * 100)}).
                </p>
              ) : null}
              <p>
                After a cut (typically {m.cuts.averageCutPct.toFixed(1)}%), homes sold{' '}
                <strong>{pct(m.cuts.cutMedianOverAskingPct)}</strong> on the new price ({Math.round(m.cuts.cutShareAbove * 100)}%
                above it). Uncut: {pct(m.cuts.unchangedMedianOverAskingPct)} ({Math.round(m.cuts.unchangedShareAbove * 100)}%).
              </p>
              <p className="rp-muted">{m.cuts.cutCount} cut and {m.cuts.unchangedCount.toLocaleString('en-IE')} uncut sales; few cuts so far, so indicative.</p>
            </div>

            <div className="rp-insight">
              <h3>Round and just-under asking prices</h3>
              <p>
                Since 2024, just under a round figure (€395,000) sold{' '}
                <strong>{pct(m.roundPricing.underMedianOverAskingPct)}</strong> ({Math.round(m.roundPricing.underShareAbove * 100)}%
                above asking). A round figure (€400,000): {pct(m.roundPricing.roundMedianOverAskingPct)} (
                {Math.round(m.roundPricing.roundShareAbove * 100)}%).
              </p>
              <p className="rp-muted">
                {band === 'round'
                  ? `This home asks a round ${euro(asking)}.`
                  : band === 'under'
                    ? `This home asks ${euro(asking)}, just under a round figure.`
                    : `This home asks ${euro(asking)}, neither round nor just under.`}{' '}
                A pattern, not proof the price causes it.
              </p>
            </div>

            <div className="rp-insight">
              <h3>How long it takes</h3>
              <p className="rp-insight-figure">
                <strong>{m.timeline.median} days</strong> from listed to completed, typically.
              </p>
              <p>Half took {m.timeline.p25} to {m.timeline.p75} days, conveyancing included.</p>
              <p className="rp-muted">From {m.timeline.count.toLocaleString('en-IE')} Dublin sales.</p>
            </div>

            <div className="rp-insight">
              <h3>Homes that sold before</h3>
              <p>
                {Math.round((m.repeat.withEarlier / m.repeat.matched) * 100)}% of matched homes had sold before. Typical
                gain: <strong>{pct(m.repeat.medianGainPct)}</strong> after {m.repeat.medianYears.toFixed(1)} years.
              </p>
              <p className="rp-muted">
                Across Dublin, {m.repeat.homesSoldTwice.toLocaleString('en-IE')} homes have sold more than once since
                2010.
              </p>
            </div>
          </>
        )}
      </div>
      <Folio page={page} total={total} report={report} />
    </section>
  );
}

function Folio({ page, total, report }: { page: number; total: number; report: ReportData }) {
  return (
    <div className="rp-folio">
      <span>
        Real Price Report: {report.title}
      </span>
      <span>
        Page {page} of {total}
      </span>
    </div>
  );
}

function TrendChart({ report }: { report: ReportData }) {
  const trend = report.trend;
  if (trend.length < 2) return <p>There are too few sales in this area to show a trend.</p>;

  const width = 640;
  const height = 210;
  const barGap = 10;
  const barWidth = (width - barGap * (trend.length - 1)) / trend.length;
  const max = Math.max(1, ...trend.map((q) => q.medianOverAskingPct));
  const baseline = 170;
  const scale = (baseline - 26) / max;

  return (
    <svg
      className="rp-trend"
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      role="img"
      aria-label={`Typical result on asking price in ${report.areaLabel}, by quarter`}
    >
      <line x1={0} x2={width} y1={baseline + 0.5} y2={baseline + 0.5} />
      {trend.map((q, i) => {
        const x = i * (barWidth + barGap);
        const h = Math.max(1.5, Math.max(0, q.medianOverAskingPct) * scale);
        return (
          <g key={q.quarter}>
            <rect x={x} y={baseline - h} width={barWidth} height={h} rx={3} />
            <text className="rp-trend-value" x={x + barWidth / 2} y={baseline - h - 7} textAnchor="middle">
              {signed(q.medianOverAskingPct)}
            </text>
            <text x={x + barWidth / 2} y={baseline + 17} textAnchor="middle">
              {q.quarter.replace(' ', ' ')}
            </text>
            <text x={x + barWidth / 2} y={baseline + 32} textAnchor="middle">
              {q.count} sales
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; sample?: string }>;
}) {
  const { session_id, sample } = await searchParams;
  const loaded = await loadReport(session_id, sample);
  // The same accuracy figures as the rest of the site, from the live track record
  const accuracy = accuracyFigures(await getSalesStore(), BACKTEST);

  if ('problem' in loaded) {
    return (
      <div className="rp-wrap">
        <h1 className="rp-h2">{loaded.problem}</h1>
        <p className="rp-prose" style={{ marginTop: '1rem' }}>
          <Link className="rp-link" href="/">
            Go back to the Real Price Check
          </Link>
        </p>
      </div>
    );
  }

  const { report, sample: isSample } = loaded;
  const { result, query, areaLabel } = report;
  const { prediction, bidLadder, evidence, dots } = result;
  // The first page carries a heading and intro, so it holds fewer rows
  const comparablePages: (typeof evidence.recent)[] = [evidence.recent.slice(0, 22)];
  for (let i = 22; i < evidence.recent.length; i += 25) {
    comparablePages.push(evidence.recent.slice(i, i + 25));
  }
  const ins = report.insights;
  const total = 4 + comparablePages.length + (ins ? 1 : 0);
  const home = describeHome(query, areaLabel);
  const ribbon = isSample ? <div className="rp-sample">Sample</div> : null;

  return (
    <div className="rp-report">
      {!isSample && session_id && (
        <TrackPurchase id={session_id} value={(loaded.paidCents ?? 0) / 100} label={query.areaKey} />
      )}
      <div className="rp-report-bar">
        <span>
          {isSample
            ? 'This is a sample. Your own report is built for the home you check.'
            : 'Your report is ready. Bookmark this page to come back to it.'}
        </span>
        <PrintButton />
      </div>

      {/* 1. Cover */}
      <section className="rp-page rp-page--cover">
        {ribbon}
        <div className="rp-cover-brand">Irish Property Data · Real Price Report</div>
        <h1 className="rp-cover-title">{report.title}</h1>
        <p className="rp-cover-sub">
          {home.charAt(0).toUpperCase() + home.slice(1)}, asking {euro(query.askingPrice)}
        </p>
        <div className="rp-cover-figure">
          <DotPlot
            values={dots.values}
            salesPerDot={dots.salesPerDot}
            askingPrice={query.askingPrice}
            litUpTo={prediction.medianOverAskingPct}
            height={230}
            fixedWidth={640}
          />
          <div className="rp-cover-answer">
            <div>
              <small>Likely to sell for about</small>
              <strong>{euro(prediction.mid)}</strong>
            </div>
            <div className="rp-cover-meta">
              Based on {evidence.count} comparable sales
              <br />
              Prepared {longDate(report.generatedOn)}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Bidding plan */}
      <section className="rp-page">
        {ribbon}
        <h2>Your bidding plan</h2>
        <p>
          Similar homes in {areaLabel} most often closed between{' '}
          <strong>
            {euro(prediction.likelyLow)} and {euro(prediction.likelyHigh)}
          </strong>
          . {Math.round(prediction.shareAboveAsking * 100)}% sold above their asking price, and the
          typical result was <strong>{signed(prediction.medianOverAskingPct)}</strong> on asking.
        </p>

        <div className="rp-bids">
          {[
            { odds: 'Even odds', price: prediction.mid },
            { odds: 'Wins three times in four', price: prediction.likelyHigh },
            { odds: 'Rarely beaten', price: prediction.high },
          ].map((bid) => (
            <div key={bid.odds} className="rp-bid">
              <span className="rp-bid-odds">{bid.odds}</span>
              <span className="rp-bid-price">{euro(bid.price)}</span>
              <span className="rp-bid-over">{signed((bid.price / query.askingPrice - 1) * 100)} on asking</span>
            </div>
          ))}
        </div>

        <h3>How far each final bid would have got you</h3>
        <table className="rp-table">
          <thead>
            <tr>
              <th>Final bid</th>
              <th className="rp-num">On asking</th>
              <th className="rp-num">Enough in</th>
            </tr>
          </thead>
          <tbody>
            {bidLadder.map((rung) => (
              <tr key={rung.bid}>
                <td>{euro(rung.bid)}</td>
                <td className="rp-num">{rung.overAskingPct === 0 ? 'Asking' : `+${rung.overAskingPct}%`}</td>
                <td className="rp-num">{Math.round(rung.chance * 100)}% of similar sales</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>Before you bid</h3>
        <p>
          Set your ceiling before the first round. Past “rarely beaten”, the home is going for more than almost every
          comparable sale: ask what it has that they didn&apos;t.
        </p>
        <Folio page={2} total={total} report={report} />
      </section>

      {/* 3. Comparable sales, split across pages */}
      {comparablePages.map((rows, pageIndex) => (
        <section className="rp-page" key={pageIndex}>
          {ribbon}
          {pageIndex === 0 ? (
            <>
              <h2>The comparable sales</h2>
              <p>
                {evidence.recent.length === evidence.count
                  ? `All ${evidence.count} sales used`
                  : `The ${evidence.recent.length} most recent of the ${evidence.count} sales used`}
                , from {longDate(evidence.from)} to {longDate(evidence.to)}, newest first.
              </p>
            </>
          ) : (
            <h3 style={{ marginTop: '8mm' }}>The comparable sales, continued</h3>
          )}
          <table className="rp-table">
            <thead>
              <tr>
                <th>Address</th>
                <th className="rp-num">Sold before</th>
                <th className="rp-num">Sold</th>
                <th className="rp-num">Asking</th>
                <th className="rp-num">Sold for</th>
                <th className="rp-num">Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((sale) => (
                <tr key={`${sale.address}-${sale.soldDate}`}>
                  <td>{sale.address}</td>
                  <td className="rp-num rp-muted rp-before">
                    {(() => {
                      const before = ins?.earlier[`${sale.address}|${sale.soldDate}`];
                      return before ? `${euroShort(before.price)} in ${before.date.slice(0, 4)}` : '–';
                    })()}
                  </td>
                  <td className="rp-num">{shortDate(sale.soldDate)}</td>
                  <td className="rp-num">{euro(sale.askingPrice)}</td>
                  <td className="rp-num">{euro(sale.soldPrice)}</td>
                  <td className={`rp-num ${sale.overAskingPct > 0 ? 'rp-over' : 'rp-under'}`}>
                    {signed(sale.overAskingPct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Folio page={3 + pageIndex} total={total} report={report} />
        </section>
      ))}

      {/* 4. The area */}
      <section className="rp-page">
        {ribbon}
        <h2>How {areaLabel} is moving</h2>
        <p>Typical result on asking price for every home sold in {areaLabel}, quarter by quarter.</p>
        <TrendChart report={report} />

        <h3>What sold most recently, from the Property Price Register</h3>
        {report.register.sales.length > 0 ? (
          <>
            <p>Second-hand homes; the register has no asking prices. Updated {longDate(report.register.updated)}.</p>
            <table className="rp-table">
              <thead>
                <tr>
                  <th>Address</th>
                  <th className="rp-num">Date</th>
                  <th className="rp-num">Price</th>
                </tr>
              </thead>
              <tbody>
                {report.register.sales.map((sale) => (
                  <tr key={`${sale.address}-${sale.date}`}>
                    <td>{sale.address}</td>
                    <td className="rp-num">{shortDate(sale.date)}</td>
                    <td className="rp-num">{euro(sale.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p>The register has no recent second-hand sales recorded under this area name.</p>
        )}
        <Folio page={total - (ins ? 2 : 1)} total={total} report={report} />
      </section>

      {ins && <InsightsPage report={report} ribbon={ribbon} page={total - 1} total={total} />}

      {/* 5. Method */}
      <section className="rp-page">
        {ribbon}
        <h2>How this report was made</h2>
        <p>
          We found the recent sales most like a {home} (same area, type, bedrooms and asking price, widening only
          where too few matched) and applied how they finished against their asking prices to{' '}
          {euro(query.askingPrice)}.
        </p>
        <h3>How often it is right</h3>
        <p>
          Replayed on {accuracy.salesTested.toLocaleString('en-IE')} sales from {accuracy.period}: inside the full
          range <strong>{accuracy.insideFullRangePct}%</strong> of the time, the likely range{' '}
          {accuracy.insideLikelyRangePct}%. Typically {accuracy.medianErrorModelPct}% off, against{' '}
          {accuracy.medianErrorAskingPct}% for the asking price.
        </p>
        <h3>What it cannot see</h3>
        <p>
          Condition and finish, garden and aspect, how many are bidding, and the market since{' '}
          {longDate(report.dataTo)}. Not a valuation or financial advice: use it with a viewing, a survey and your
          mortgage approval.
        </p>
        <h3>Sources</h3>
        <p>
          Asking and sale prices: Irish Property Data, to {longDate(report.dataTo)}. Sale prices: the Property Price
          Register (Property Services Regulatory Authority). Planning: Department of Housing.
        </p>
        <Folio page={total} total={total} report={report} />
      </section>
    </div>
  );
}
