'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RealPriceResult, Tier, TypeGroup } from '@/lib/real-price/model';
import type { AreaOption } from '@/lib/real-price/store';
import { trackEvent } from '@/lib/analytics';
import DotPlot from './DotPlot';
import HeroScene from './HeroScene';

const Diorama = dynamic(() => import('./Diorama'), { ssr: false });

export interface Answer {
  areaLabel: string;
  result: RealPriceResult;
}

interface FormState {
  areaKey: string;
  typeGroup: TypeGroup;
  beds: number;
  askingPrice: number;
}

interface Props {
  areas: AreaOption[];
  dataTo: string;
  salesCount: number;
  reportPriceEuro: number;
  initial: { form: FormState; answer: Answer };
  backtest: {
    testYear: number;
    salesTested: number;
    insideFullRangePct: number;
    insideLikelyRangePct: number;
    medianErrorModelPct: number;
    medianErrorAskingPct: number;
  };
}

const TYPES: Array<{ value: TypeGroup; label: string; plural: string }> = [
  { value: 'apartment', label: 'apartment', plural: 'apartments' },
  { value: 'terraced', label: 'terraced house', plural: 'terraced houses' },
  { value: 'semi', label: 'semi-detached house', plural: 'semi-detached houses' },
  { value: 'detached', label: 'detached house', plural: 'detached houses' },
];

const ERRORS: Record<string, string> = {
  not_enough_sales:
    'Too few recent sales match that home to give an honest answer. Try a wider area or a different type.',
  unknown_area: 'That area is not in the sales data yet. Choose another.',
  invalid_request: 'Enter an asking price between €50,000 and €20,000,000.',
  checkout_failed: 'Payment could not be started. Nothing was charged. Try again in a moment.',
};

const euro = (value: number) => `€${Math.round(value).toLocaleString('en-IE')}`;
const signed = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' });

function evidenceSentence(tier: Tier, count: number, plural: string, area: string): string {
  const n = count.toLocaleString('en-IE');
  switch (tier) {
    case 'area-type-size':
      return `${n} ${plural} of a similar size and asking price in ${area}`;
    case 'area-type':
      return `${n} ${plural} in ${area}`;
    case 'area':
      return `${n} homes of every type in ${area}, because too few ${plural} sold there`;
    case 'area-2y':
      return `${n} homes of every type in ${area} over two years, because recent sales there are thin`;
    default:
      return `${n} ${plural} across Dublin, because too few homes sold in ${area}`;
  }
}

/** Ease a displayed number towards its target whenever the target changes. */
function useTween(target: number, duration = 700): number {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      from.current = target;
      setValue(target);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let frame = requestAnimationFrame(function tick(now) {
      const p = Math.min(1, (now - start) / duration);
      const current = origin + (target - origin) * (1 - Math.pow(1 - p, 3));
      from.current = current;
      setValue(current);
      if (p < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

export default function RealPriceClient({
  areas,
  dataTo,
  salesCount,
  reportPriceEuro,
  initial,
  backtest,
}: Props) {
  const [form, setForm] = useState<FormState>(initial.form);
  const [priceText, setPriceText] = useState(initial.form.askingPrice.toLocaleString('en-IE'));
  const [answer, setAnswer] = useState<Answer>(initial.answer);
  const [answeredFor, setAnsweredFor] = useState<FormState>(initial.form);
  const [error, setError] = useState<string | null>(null);
  const [bidPct, setBidPct] = useState(0);
  const [plotPlay, setPlotPlay] = useState<string | undefined>(undefined);
  const [no3d, setNo3d] = useState(false);
  const [label, setLabel] = useState('');
  const [buying, setBuying] = useState(false);
  const hero = useRef<HTMLElement>(null);
  const plotBox = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  const { result, areaLabel } = answer;
  const { prediction, evidence, dots } = result;
  const asking = answeredFor.askingPrice;
  const type = TYPES.find((t) => t.value === answeredFor.typeGroup)!;
  const shownPrice = useTween(prediction.mid);

  const districts = useMemo(() => areas.filter((a) => a.kind === 'district'), [areas]);
  const localities = useMemo(() => areas.filter((a) => a.kind === 'locality'), [areas]);
  const formAreaLabel = areas.find((a) => a.key === form.areaKey)?.label ?? 'choose an area';
  const dioramaSales = useMemo(
    () => evidence.recent.slice(0, 5).map((s) => ({ overAskingPct: s.overAskingPct })),
    [evidence.recent]
  );

  const check = useCallback(async (next: FormState) => {
    const id = ++requestId.current;
    try {
      const response = await fetch('/api/real-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      const data = await response.json();
      if (id !== requestId.current) return;
      if (!response.ok) {
        setError(ERRORS[data.error] ?? 'The check did not complete. Try again in a moment.');
        return;
      }
      setError(null);
      setAnswer(data);
      setAnsweredFor(next);
      setPlotPlay(`${next.areaKey}-${next.typeGroup}-${next.beds}-${next.askingPrice}`);
      trackEvent({ action: 'real_price_check', category: 'tools', label: next.areaKey });
    } catch {
      if (id === requestId.current) setError('The check did not complete. Try again in a moment.');
    }
  }, []);

  function update(patch: Partial<FormState>) {
    const next = { ...form, ...patch };
    setForm(next);
    check(next);
  }

  function commitPrice() {
    const value = Number(priceText.replace(/[^0-9]/g, ''));
    if (value < 50_000 || value > 20_000_000) return setError(ERRORS.invalid_request);
    setPriceText(value.toLocaleString('en-IE'));
    if (value !== form.askingPrice) update({ askingPrice: value });
  }

  // Play the plot's entrance the first time it scrolls into view
  useEffect(() => {
    const el = plotBox.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setPlotPlay((current) => current ?? 'first');
        observer.disconnect();
      },
      { threshold: 0.35 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // After each entrance, glide the bid handle from asking to the even-odds bid
  useEffect(() => {
    if (!plotPlay) return;
    const target = Math.round(prediction.medianOverAskingPct * 2) / 2;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setBidPct(target);
      return;
    }
    setBidPct(0);
    const start = performance.now() + 900;
    let frame = requestAnimationFrame(function tick(now) {
      const p = Math.min(1, Math.max(0, (now - start) / 1100));
      setBidPct(Math.round(target * (1 - Math.pow(1 - p, 3)) * 2) / 2);
      if (p < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
    // Replays only when a new answer arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plotPlay]);

  // Parallax for the fallback illustration when 3D is unavailable
  useEffect(() => {
    const el = hero.current;
    if (!el || !no3d) return;
    const onMove = (event: PointerEvent) => {
      el.style.setProperty('--mx', String((event.clientX / window.innerWidth - 0.5) * 2));
      el.style.setProperty('--my', String((event.clientY / window.innerHeight - 0.5) * 2));
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [no3d]);

  async function buyReport() {
    setBuying(true);
    setError(null);
    trackEvent({ action: 'real_price_report_checkout', category: 'tools', label: answeredFor.areaKey });
    try {
      const response = await fetch('/api/real-price/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: answeredFor, label: label || undefined }),
      });
      const data = await response.json();
      if (response.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setError(ERRORS[data.error] ?? ERRORS.checkout_failed);
    } catch {
      setError(ERRORS.checkout_failed);
    }
    setBuying(false);
  }

  const beaten = dots.values.filter((v) => v <= bidPct).length;
  const bidPrice = Math.round((asking * (1 + bidPct / 100)) / 1000) * 1000;
  const bids = [
    { odds: 'Even odds', price: prediction.mid },
    { odds: 'Wins three times in four', price: prediction.likelyHigh },
    { odds: 'Rarely beaten', price: prediction.high },
  ];

  return (
    <>
      <section className="rp-hero" ref={hero}>
        <div className="rp-hero-copy">
          <h1 className="rp-sentence">
            A{' '}
            <span className="rp-field">
              <span>{form.beds}-bed</span>
              <select
                aria-label="Bedrooms"
                value={form.beds}
                onChange={(e) => update({ beds: Number(e.target.value) })}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n}-bed
                  </option>
                ))}
              </select>
            </span>{' '}
            <span className="rp-field">
              <span>{TYPES.find((t) => t.value === form.typeGroup)!.label}</span>
              <select
                aria-label="Property type"
                value={form.typeGroup}
                onChange={(e) => update({ typeGroup: e.target.value as TypeGroup })}
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </span>{' '}
            in{' '}
            <span className="rp-field">
              <span>{formAreaLabel}</span>
              <select
                aria-label="Area"
                value={form.areaKey}
                onChange={(e) => update({ areaKey: e.target.value })}
              >
                <optgroup label="Postal districts">
                  {districts.map((a) => (
                    <option key={a.key} value={a.key}>
                      {a.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Towns and neighbourhoods">
                  {localities.map((a) => (
                    <option key={a.key} value={a.key}>
                      {a.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </span>{' '}
            asking{' '}
            <span
              className="rp-field rp-field--price"
              style={{ '--chars': `${priceText.length + 0.6}ch` } as React.CSSProperties}
            >
              €
              <input
                aria-label="Asking price in euro"
                inputMode="numeric"
                value={priceText}
                onChange={(e) => setPriceText(e.target.value)}
                onBlur={commitPrice}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              />
            </span>{' '}
            <span className="rp-answer">
              will really sell for about
              <span className="rp-answer-price" aria-live="polite">
                {euro(Math.round(shownPrice / 1000) * 1000)}
              </span>
            </span>
          </h1>

          {error ? (
            <p className="rp-error" role="alert">
              {error}
            </p>
          ) : (
            <p className="rp-lede">
              In Dublin the asking price is where the bidding starts. This is what happened to{' '}
              <strong>{evidenceSentence(result.tier, evidence.count, type.plural, areaLabel)}</strong>
              . Change any of the underlined words.
            </p>
          )}
        </div>

        <div className="rp-scene-box">
          {no3d ? (
            <HeroScene />
          ) : (
            <Diorama sales={dioramaSales} onUnavailable={() => setNo3d(true)} />
          )}

          <div className="rp-glass rp-glass--a" style={{ left: '5%', top: '14%' }}>
            <b>{Math.round(prediction.shareAboveAsking * 100)}%</b>
            <span>sold above asking</span>
          </div>
          <div
            className="rp-glass rp-glass--b"
            style={{ right: '5%', top: '30%', animationDelay: '-3s, 150ms' }}
          >
            <b>{signed(prediction.medianOverAskingPct)}</b>
            <span>typical result on asking</span>
          </div>
          <div
            className="rp-glass rp-glass--blank"
            style={{ left: '13%', top: '52%', animationDelay: '-2s, 250ms' }}
          />
          <div
            className="rp-glass rp-glass--blank"
            style={
              { left: '8.5%', top: '66%', animationDelay: '-5s, 350ms', '--size': '44px' } as React.CSSProperties
            }
          />
          <div
            className="rp-glass rp-glass--blank"
            style={
              { right: '14%', top: '62%', animationDelay: '-1s, 300ms', '--size': '52px' } as React.CSSProperties
            }
          />
          {!no3d && (
            <p className="rp-scene-note">
              Each house is one of the five most recent sales, tagged with how far it went over
              asking.
            </p>
          )}
        </div>
      </section>

      <div className="rp-wrap">
        <h2 className="rp-h2">Drag the gold line to try a bid.</h2>
        <p className="rp-statement-sub">
          Every dot is{' '}
          {dots.salesPerDot === 1 ? 'one real sale' : `about ${dots.salesPerDot} real sales`},
          placed by how far over or under its asking price it closed.
        </p>

        <div ref={plotBox}>
          <DotPlot
            values={dots.values}
            salesPerDot={dots.salesPerDot}
            askingPrice={asking}
            bidPct={bidPct}
            onBidChange={setBidPct}
            playKey={plotPlay}
          />
        </div>
        <div className="rp-plot-caption">
          <span className="rp-key">
            <i className="rp-key--lit" /> Sales your bid would have won
          </span>
          <span className="rp-key">
            <i /> Sales that went higher
          </span>
        </div>

        <p className="rp-statement">
          A final bid of <b>{euro(bidPrice)}</b> would have been enough in{' '}
          <b>
            {beaten} of {dots.values.length}
          </b>{' '}
          similar sales.
        </p>

        <div className="rp-bids">
          {bids.map((bid) => {
            const over = (bid.price / asking - 1) * 100;
            return (
              <button
                key={bid.odds}
                type="button"
                className="rp-bid"
                onClick={() => setBidPct(Math.round(over * 2) / 2)}
              >
                <span className="rp-bid-odds">{bid.odds}</span>
                <span className="rp-bid-price">{euro(bid.price)}</span>
                <span className="rp-bid-over">{signed(over)} on asking</span>
              </button>
            );
          })}
        </div>

        <section className="rp-section">
          <div>
            <h2 className="rp-h2">The five most recent sales behind this</h2>
            <div className="rp-prose" style={{ marginTop: '1rem' }}>
              <p>
                Sold between {longDate(evidence.from)} and {longDate(evidence.to)}. The full report
                lists every comparable sale.
              </p>
            </div>
          </div>
          <table className="rp-table">
            <thead>
              <tr>
                <th>Address</th>
                <th className="rp-num rp-hide-sm">Asking</th>
                <th className="rp-num">Sold for</th>
                <th className="rp-num">Result</th>
              </tr>
            </thead>
            <tbody>
              {evidence.recent.slice(0, 5).map((sale) => (
                <tr key={`${sale.address}-${sale.soldDate}`}>
                  <td>{sale.address}</td>
                  <td className="rp-num rp-hide-sm">{euro(sale.askingPrice)}</td>
                  <td className="rp-num">{euro(sale.soldPrice)}</td>
                  <td className={`rp-num ${sale.overAskingPct > 0 ? 'rp-over' : 'rp-under'}`}>
                    {signed(sale.overAskingPct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rp-offer">
          <div>
            <h2 className="rp-h2">Take the whole picture to the bidding, as a PDF.</h2>
            <ul className="rp-offer-list">
              <li>
                <strong>Your bidding plan</strong>: what each bid level has won, from asking price
                to the point almost nobody goes past.
              </li>
              <li>
                <strong>Every comparable sale</strong>: address, asking price, sale price and date,
                for up to 72 homes.
              </li>
              <li>
                <strong>How {areaLabel} is moving</strong>: over-asking and prices, quarter by
                quarter.
              </li>
              <li>
                <strong>What sold this year</strong>: the latest prices from the national Property
                Price Register.
              </li>
            </ul>
            <input
              className="rp-label-input"
              aria-label="Address to print on the cover (optional)"
              placeholder="Address to print on the cover (optional)"
              value={label}
              maxLength={120}
              onChange={(e) => setLabel(e.target.value)}
            />
            <div className="rp-offer-actions">
              <button type="button" className="rp-button" onClick={buyReport} disabled={buying}>
                {buying ? 'Opening payment…' : `Get the report for €${reportPriceEuro}`}
              </button>
              <Link className="rp-link" href="/real-price/report?sample=1">
                See a sample report
              </Link>
            </div>
            <p className="rp-offer-note">
              One payment, no account and no subscription. The report opens straight after payment
              and saves as a PDF.
            </p>
          </div>
          <div className="rp-fan" aria-hidden="true">
            <div className="rp-fan-page">
              <div className="rp-fan-title">Every comparable sale</div>
              <div className="rp-fan-lines">
                {Array.from({ length: 14 }, (_, i) => (
                  <i key={i} style={{ width: `${68 + ((i * 37) % 30)}%` }} />
                ))}
              </div>
            </div>
            <div className="rp-fan-page">
              <div className="rp-fan-title">Your bidding plan</div>
              <div className="rp-fan-big">{euro(prediction.mid)}</div>
              <div className="rp-fan-small">
                Even odds at {signed(prediction.medianOverAskingPct)} on asking
              </div>
              <div className="rp-fan-lines">
                {Array.from({ length: 6 }, (_, i) => (
                  <i key={i} style={{ width: `${30 + i * 12}%`, background: 'var(--ink)' }} />
                ))}
              </div>
            </div>
            <div className="rp-fan-page">
              <div className="rp-fan-title">Real Price Report</div>
              <div className="rp-fan-big">{areaLabel}</div>
              <div className="rp-fan-small">
                {answeredFor.beds}-bed {type.label}, asking {euro(asking)}
              </div>
            </div>
          </div>
        </section>

        <section className="rp-section">
          <h2 className="rp-h2">How it works, and how often it is right</h2>
          <div className="rp-prose">
            <p>
              We hold the asking price and the final sale price of{' '}
              <strong>{salesCount.toLocaleString('en-IE')} Dublin homes</strong>. For the home you
              describe, we find the most similar recent sales and apply how they finished, relative
              to their asking prices, to yours. Our asking-price records run to {longDate(dataTo)}.
            </p>
            <p>
              We tested this on {backtest.salesTested.toLocaleString('en-IE')} sales from{' '}
              {backtest.testYear} that the method had never seen.{' '}
              <strong>
                The sale price landed inside our full range {backtest.insideFullRangePct}% of the
                time.
              </strong>{' '}
              Our middle estimate was typically {backtest.medianErrorModelPct}% away from the sale
              price; the asking price on its own was {backtest.medianErrorAskingPct}% away.
            </p>
            <p>
              It cannot see a home&apos;s condition or the mood of one bidding round, and it is not
              a valuation. Use it to judge how far an asking price is likely to move, alongside a
              viewing and a survey.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
