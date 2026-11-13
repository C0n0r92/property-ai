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
  label: '14 Example Terrace, Dublin 8',
};

const euro = (value: number) => `€${Math.round(value).toLocaleString('en-IE')}`;
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
  const total = 4 + comparablePages.length;
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
          Decide your ceiling before the first round, not during it. If the bidding passes the
          “rarely beaten” level, the home is going for more than almost every comparable sale: ask
          what it has that they did not.
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
            <p>
              Final prices declared to Revenue, second-hand homes only. The register does not
              record asking prices. Updated {longDate(report.register.updated)}.
            </p>
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
        <Folio page={total - 1} total={total} report={report} />
      </section>

      {/* 5. Method */}
      <section className="rp-page">
        {ribbon}
        <h2>How this report was made</h2>
        <p>
          We hold the asking price and the final sale price of tens of thousands of Dublin homes.
          For this report we found the most similar recent sales to a {home}: the same area, the
          same type of home, a similar number of bedrooms and a similar asking price, widening the
          search only where too few sales matched. We then applied how those sales finished,
          relative to their own asking prices, to an asking price of {euro(query.askingPrice)}.
        </p>
        <h3>How often it is right</h3>
        <p>
          We tested the method on {BACKTEST.salesTested.toLocaleString('en-IE')} sales from{' '}
          {BACKTEST.testYear} that it had never seen. The sale price landed inside the full range
          (the “rarely beaten” level and its mirror below asking){' '}
          <strong>{BACKTEST.insideFullRangePct}% of the time</strong>, and inside the most likely
          range {BACKTEST.insideLikelyRangePct}% of the time. The middle estimate was typically{' '}
          {BACKTEST.medianErrorModelPct}% from the sale price, against {BACKTEST.medianErrorAskingPct}%
          for the asking price alone.
        </p>
        <h3>What it cannot see</h3>
        <p>
          The condition and finish of the home, its garden and aspect, how many people are bidding,
          and anything that has happened in the market since our asking-price records end on{' '}
          {longDate(report.dataTo)}. This report is not a valuation and is not financial advice.
          Use it alongside a viewing, a survey and your mortgage approval.
        </p>
        <h3>Sources</h3>
        <p>
          Asking and sale prices: Irish Property Data sales records to {longDate(report.dataTo)}.
          Recent sale prices: the Property Price Register, published by the Property Services
          Regulatory Authority.
        </p>
        <Folio page={total} total={total} report={report} />
      </section>
    </div>
  );
}
