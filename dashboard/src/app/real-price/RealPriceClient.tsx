'use client';

import { FormEvent, useMemo, useState } from 'react';
import type { RealPriceResult, Tier, TypeGroup } from '@/lib/real-price/model';
import type { AreaOption } from '@/lib/real-price/store';
import { trackEvent } from '@/lib/analytics';

interface Props {
  areas: AreaOption[];
  dataTo: string;
  salesCount: number;
  backtest: {
    testYear: number;
    salesTested: number;
    insideFullRangePct: number;
    insideLikelyRangePct: number;
    medianErrorModelPct: number;
    medianErrorAskingPct: number;
  };
}

interface ApiSuccess {
  areaLabel: string;
  result: RealPriceResult;
}

const TYPE_OPTIONS: Array<{ value: TypeGroup; label: string; plural: string }> = [
  { value: 'apartment', label: 'Apartment', plural: 'apartments' },
  { value: 'terraced', label: 'Terraced', plural: 'terraced houses' },
  { value: 'semi', label: 'Semi-detached', plural: 'semi-detached houses' },
  { value: 'detached', label: 'Detached', plural: 'detached houses' },
];

const ERROR_MESSAGES: Record<string, string> = {
  not_enough_sales:
    'There are not enough recent sales to give an honest answer for that combination. Try a wider area.',
  unknown_area: 'That area is not in our sales data yet.',
  invalid_request: 'Check the prices you entered and try again.',
};

const euro = (value: number) => `€${Math.round(value).toLocaleString('en-IE')}`;
const percent = (value: number) => `${Math.round(value * 100)}%`;
const signed = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' });
const parsePrice = (text: string) => Number(text.replace(/[^0-9]/g, ''));
const formatPriceInput = (text: string) => {
  const n = parsePrice(text);
  return n ? n.toLocaleString('en-IE') : '';
};

function evidenceSentence(tier: Tier, count: number, typePlural: string, area: string): string {
  const n = count.toLocaleString('en-IE');
  switch (tier) {
    case 'area-type-size':
      return `${n} ${typePlural} of a similar size and asking price sold in ${area}`;
    case 'area-type':
      return `${n} ${typePlural} sold in ${area}`;
    case 'area':
      return `${n} homes of all types sold in ${area} (too few ${typePlural} on their own)`;
    case 'area-2y':
      return `${n} homes of all types sold in ${area} over two years (recent sales there are thin)`;
    default:
      return `${n} ${typePlural} sold across Dublin (too few sales in ${area})`;
  }
}

const inputClass =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--accent)] focus:outline-none';
const cardClass = 'rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6';
const labelClass = 'mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]';

export default function RealPriceClient({ areas, dataTo, salesCount, backtest }: Props) {
  const [areaKey, setAreaKey] = useState('');
  const [typeGroup, setTypeGroup] = useState<TypeGroup>('semi');
  const [beds, setBeds] = useState('3');
  const [asking, setAsking] = useState('');
  const [budget, setBudget] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<(ApiSuccess & { asking: number; type: TypeGroup }) | null>(
    null
  );

  const districts = useMemo(() => areas.filter((a) => a.kind === 'district'), [areas]);
  const localities = useMemo(() => areas.filter((a) => a.kind === 'locality'), [areas]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const askingPrice = parsePrice(asking);
    const budgetAmount = parsePrice(budget);
    if (!areaKey) return setError('Choose an area.');
    if (askingPrice < 50_000) return setError('Enter the asking price in euro.');

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/real-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          areaKey,
          typeGroup,
          beds: Number(beds),
          askingPrice,
          ...(budgetAmount >= 50_000 ? { budget: budgetAmount } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setAnswer(null);
        setError(ERROR_MESSAGES[data.error] ?? 'Something went wrong. Please try again.');
        return;
      }
      setAnswer({ ...data, asking: askingPrice, type: typeGroup });
      trackEvent({ action: 'real_price_check', category: 'tools', label: areaKey });
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-3xl px-4 pb-28 pt-8 sm:py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
            What will it really sell for?
          </h1>
          <p className="mt-3 text-lg text-[var(--foreground-secondary)]">
            In Dublin the asking price is where the bidding starts. Enter a home&apos;s asking
            price and see what similar homes actually sold for.
          </p>
        </header>

        <form onSubmit={onSubmit} className={`${cardClass} space-y-5`}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="rp-area" className={labelClass}>
                Area
              </label>
              <select
                id="rp-area"
                value={areaKey}
                onChange={(e) => setAreaKey(e.target.value)}
                className={inputClass}
              >
                <option value="">Choose an area</option>
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
            </div>
            <div>
              <label htmlFor="rp-beds" className={labelClass}>
                Bedrooms
              </label>
              <select
                id="rp-beds"
                value={beds}
                onChange={(e) => setBeds(e.target.value)}
                className={inputClass}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n === 6 ? '6 or more' : n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset>
            <legend className={labelClass}>Property type</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={typeGroup === option.value}
                  onClick={() => setTypeGroup(option.value)}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    typeGroup === option.value
                      ? 'border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--foreground)]'
                      : 'border-[var(--border)] text-[var(--foreground-secondary)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="rp-asking" className={labelClass}>
                Asking price (€)
              </label>
              <input
                id="rp-asking"
                inputMode="numeric"
                placeholder="495,000"
                value={asking}
                onChange={(e) => setAsking(formatPriceInput(e.target.value))}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="rp-budget" className={labelClass}>
                Your maximum budget (€, optional)
              </label>
              <input
                id="rp-budget"
                inputMode="numeric"
                placeholder="520,000"
                value={budget}
                onChange={(e) => setBudget(formatPriceInput(e.target.value))}
                className={inputClass}
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-[var(--negative)]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--accent)] px-4 py-3 font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            {loading ? 'Checking sales…' : 'Check this asking price'}
          </button>
        </form>

        {answer && <Result answer={answer} />}

        <section className={`${cardClass} mt-8 text-sm text-[var(--foreground-secondary)]`}>
          <h2 className="mb-2 text-base font-semibold text-[var(--foreground)]">
            How this works, and how accurate it is
          </h2>
          <p>
            We compare the asking price and final sale price of {salesCount.toLocaleString('en-IE')}{' '}
            Dublin homes, then apply the pattern from the most similar recent sales to the asking
            price you enter. Sales data runs to {longDate(dataTo)}.
          </p>
          <p className="mt-3">
            We tested it on {backtest.salesTested.toLocaleString('en-IE')} sales from{' '}
            {backtest.testYear} that the model had not seen. The final price landed inside our full
            range {backtest.insideFullRangePct}% of the time and inside the most likely range{' '}
            {backtest.insideLikelyRangePct}% of the time. Our middle estimate was typically{' '}
            {backtest.medianErrorModelPct}% away from the sale price; the asking price itself was{' '}
            {backtest.medianErrorAskingPct}% away.
          </p>
          <p className="mt-3">
            It cannot see a home&apos;s condition, finish or the mood of a particular bidding
            round, and it is not a valuation. Use it to judge how far an asking price is likely to
            move, alongside a viewing and a survey.
          </p>
        </section>
      </div>
    </div>
  );
}

function Result({ answer }: { answer: ApiSuccess & { asking: number; type: TypeGroup } }) {
  const { result, areaLabel, asking, type } = answer;
  const { prediction, bidLadder, evidence, budget } = result;
  const typePlural = TYPE_OPTIONS.find((o) => o.value === type)?.plural ?? 'homes';

  // Range bar scale, padded so markers never sit on the edge
  const scaleMin = Math.min(prediction.low, asking) * 0.98;
  const scaleMax = Math.max(prediction.high, asking) * 1.02;
  const position = (value: number) => `${((value - scaleMin) / (scaleMax - scaleMin)) * 100}%`;
  const width = (from: number, to: number) =>
    `${((to - from) / (scaleMax - scaleMin)) * 100}%`;

  return (
    <div className="mt-8 space-y-6" aria-live="polite">
      <section className={cardClass}>
        <p className="text-sm text-[var(--foreground-secondary)]">Likely to sell for around</p>
        <p className="mt-1 text-4xl font-bold text-[var(--foreground)] sm:text-5xl">
          {euro(prediction.mid)}
        </p>
        <p className="mt-2 text-[var(--foreground-secondary)]">
          That is {signed((prediction.mid / asking - 1) * 100)} on the {euro(asking)} asking price.
          Most similar sales closed between{' '}
          <strong className="text-[var(--foreground)]">{euro(prediction.likelyLow)}</strong> and{' '}
          <strong className="text-[var(--foreground)]">{euro(prediction.likelyHigh)}</strong>.
        </p>

        <div className="mt-6">
          <div className="relative h-3 rounded-full bg-[var(--background)]">
            <div
              className="absolute h-3 rounded-full bg-[var(--accent)] opacity-30"
              style={{ left: position(prediction.low), width: width(prediction.low, prediction.high) }}
            />
            <div
              className="absolute h-3 rounded-full bg-[var(--accent)]"
              style={{
                left: position(prediction.likelyLow),
                width: width(prediction.likelyLow, prediction.likelyHigh),
              }}
            />
            <div
              className="absolute -top-1.5 h-6 w-0.5 bg-[var(--foreground)]"
              style={{ left: position(asking) }}
              title={`Asking price ${euro(asking)}`}
            />
          </div>
          <div className="mt-3 flex justify-between text-xs text-[var(--foreground-muted)]">
            <span>Low end {euro(prediction.low)}</span>
            <span>White line: asking price</span>
            <span>High end {euro(prediction.high)}</span>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-5">
          <div>
            <dt className="text-sm text-[var(--foreground-secondary)]">Sold above asking</dt>
            <dd className="text-2xl font-semibold text-[var(--foreground)]">
              {percent(prediction.shareAboveAsking)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-[var(--foreground-secondary)]">Typical result vs asking</dt>
            <dd className="text-2xl font-semibold text-[var(--foreground)]">
              {signed(prediction.medianOverAskingPct)}
            </dd>
          </div>
        </dl>
      </section>

      {budget && (
        <section className={cardClass}>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Your budget</h2>
          <p className="mt-2 text-[var(--foreground-secondary)]">
            A final bid of {euro(budget.amount)} would have been enough in{' '}
            <strong className="text-[var(--foreground)]">{percent(budget.chance)}</strong> of
            similar sales at this asking price.
          </p>
          <p className="mt-3 text-[var(--foreground-secondary)]">
            With {euro(budget.amount)} to spend here, look at asking prices up to{' '}
            <strong className="text-[var(--foreground)]">{euro(budget.evenOddsAsking)}</strong> for
            even odds, or up to{' '}
            <strong className="text-[var(--foreground)]">{euro(budget.safeAsking)}</strong> to win
            three times out of four.
          </p>
        </section>
      )}

      <section className={cardClass}>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">How far each bid gets you</h2>
        <p className="mt-1 text-sm text-[var(--foreground-secondary)]">
          The share of similar sales where a bid this far over asking would have been enough.
        </p>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--foreground-muted)]">
              <th className="pb-2 font-medium">Final bid</th>
              <th className="px-3 pb-2 font-medium">Over asking</th>
              <th className="pb-2 font-medium">Enough in</th>
            </tr>
          </thead>
          <tbody>
            {bidLadder.map((rung) => (
              <tr key={rung.bid} className="border-t border-[var(--border)]">
                <td className="py-2 font-medium text-[var(--foreground)]">{euro(rung.bid)}</td>
                <td className="px-3 py-2 text-[var(--foreground-secondary)]">
                  {rung.overAskingPct === 0 ? 'Asking' : `+${rung.overAskingPct}%`}
                </td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 rounded-full bg-[var(--background)] sm:w-40">
                      <div
                        className="h-2 rounded-full bg-[var(--positive)]"
                        style={{ width: `${rung.chance * 100}%` }}
                      />
                    </div>
                    <span className="text-[var(--foreground)]">{percent(rung.chance)}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={cardClass}>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">The evidence</h2>
        <p className="mt-1 text-sm text-[var(--foreground-secondary)]">
          Based on {evidenceSentence(result.tier, evidence.count, typePlural, areaLabel)} between{' '}
          {longDate(evidence.from)} and {longDate(evidence.to)}. The five most recent:
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--foreground-muted)]">
                <th className="pb-2 font-medium">Address</th>
                <th className="hidden pb-2 font-medium sm:table-cell">Sold</th>
                <th className="pb-2 text-right font-medium">Asking</th>
                <th className="pb-2 pl-3 text-right font-medium">Sold for</th>
                <th className="pb-2 pl-3 text-right font-medium">Difference</th>
              </tr>
            </thead>
            <tbody>
              {evidence.recent.map((sale) => (
                <tr key={`${sale.address}-${sale.soldDate}`} className="border-t border-[var(--border)]">
                  <td className="py-2 pr-3 text-[var(--foreground)]">{sale.address}</td>
                  <td className="hidden whitespace-nowrap py-2 pr-3 text-[var(--foreground-secondary)] sm:table-cell">
                    {longDate(sale.soldDate)}
                  </td>
                  <td className="py-2 text-right text-[var(--foreground-secondary)]">
                    {euro(sale.askingPrice)}
                  </td>
                  <td className="py-2 pl-3 text-right text-[var(--foreground)]">{euro(sale.soldPrice)}</td>
                  <td
                    className={`py-2 pl-3 text-right ${
                      sale.overAskingPct >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'
                    }`}
                  >
                    {signed(sale.overAskingPct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
