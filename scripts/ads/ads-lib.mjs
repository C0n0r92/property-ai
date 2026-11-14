/**
 * Google Ads Editor rows for the price check, built from the site's own
 * figures. Pure functions (tested in ads-lib.test.mjs); build-ads.ts reads
 * the data and writes the file.
 *
 * Column names follow Google Ads Editor's CSV column reference. Every
 * campaign, ad group, keyword and ad is created Paused: importing never
 * spends money until someone switches it on.
 */

export const LIMITS = { headline: 30, description: 90, path: 15 };

export const COLUMNS = [
  'Campaign',
  'Campaign type',
  'Campaign daily budget',
  'Bid strategy type',
  'Campaign status',
  'Ad group',
  'Max CPC',
  'Keyword',
  'Criterion type',
  ...Array.from({ length: 15 }, (_, i) => `Headline ${i + 1}`),
  ...Array.from({ length: 4 }, (_, i) => `Description ${i + 1}`),
  'Final URL',
  'Path 1',
  'Path 2',
  'Status',
];

/** Searches that are not looking to buy or check a price */
export const NEGATIVES = [
  'rent', 'rental', 'rentals', 'to let', 'letting', 'lettings', 'tenant', 'landlord', 'house share', 'room',
  'jobs', 'job', 'salary', 'career', 'course', 'courses', 'training', 'college',
  'commercial', 'office', 'retail unit', 'warehouse', 'industrial', 'land for sale', 'site for sale',
  'student accommodation', 'hotel', 'airbnb', 'holiday', 'mortgage calculator', 'free valuation',
];

const signed = (v) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}%`;
const k = (v) => (v >= 1_000_000 ? `€${(v / 1_000_000).toFixed(2)}m` : `€${Math.round(v / 1000)}k`);

/** Keep only texts within the limit, without repeats, at most `max`. */
export function fit(texts, limit, max) {
  const seen = new Set();
  const out = [];
  for (const t of texts) {
    const text = t.replace(/\s+/g, ' ').trim();
    if (!text || text.length > limit || seen.has(text.toLowerCase())) continue;
    seen.add(text.toLowerCase());
    out.push(text);
    if (out.length === max) break;
  }
  return out;
}

/** A path segment: lower case, letters, digits and hyphens, at most 15 characters. */
export const pathPart = (text) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, LIMITS.path).replace(/-$/, '');

/** An area's ad: headlines and descriptions from its figures. */
export function areaAd(area, site, accuracy) {
  const over = signed(area.medianOverAskingPct);
  const share = Math.round(area.shareAboveAsking * 100);
  const headlines = fit(
    [
      `${area.label} Sold Prices`,
      `${area.label}: ${over} Over Asking`,
      `${area.label} House Prices`,
      `${share}% Sold Above Asking`,
      `Typical Sale ${k(area.medianPrice)}`,
      'What Will It Really Sell For?',
      'Check Any Home Free',
      'Paste a Daft or MyHome Link',
      'Sold vs Asking, Street by Street',
      'From the Price Register',
      `${accuracy.insideRangePct}% Land in Our Range`,
      'How Much Over Asking to Bid',
      'Free Dublin Price Check',
    ],
    LIMITS.headline,
    15
  );
  const descriptions = fit(
    [
      `${area.label} homes sold ${over} on asking in the last year. See what similar homes got.`,
      `Homes here sold ${over} on asking in the last year. See what similar homes got.`,
      `Paste a listing link and see what similar ${area.label} homes really sold for.`,
      'Paste a listing link and see what similar homes here really sold for.',
      'Every sale on the Price Register, paired with its asking price. Free, no sign-up.',
      `Our estimate is typically ${accuracy.medianModelErrorPct.toFixed(1)}% from the sale price. Asking: ${accuracy.medianAskingErrorPct.toFixed(1)}%.`,
    ],
    LIMITS.description,
    4
  );
  return {
    headlines,
    descriptions,
    finalUrl: `${site}/areas/${area.slug}`,
    path1: 'sold-prices',
    path2: pathPart(area.label),
  };
}

/** The generic ad: what will it sell for. */
export function checkAd(site, dublin, accuracy) {
  return {
    headlines: fit(
      [
        'What Will It Really Sell For?',
        'Dublin Sold vs Asking Prices',
        'Check Any Dublin Home Free',
        `Dublin Homes: ${signed(dublin.medianOverAskingPct)} on Asking`,
        `${Math.round(dublin.shareAboveAsking * 100)}% Sold Above Asking`,
        'Paste a Daft or MyHome Link',
        'From the Price Register',
        `${accuracy.insideRangePct}% Land in Our Range`,
        'How Much Over Asking to Bid',
        'See Similar Homes’ Real Prices',
        'Free, No Sign-Up',
        'Bid With the Real Numbers',
      ],
      LIMITS.headline,
      15
    ),
    descriptions: fit(
      [
        'Enter a Dublin home and its asking price: see what similar homes really sold for.',
        'Every sale on the Price Register, paired with its asking price. Free, no sign-up.',
        `Our estimate is typically ${accuracy.medianModelErrorPct.toFixed(1)}% from the sale price. Asking: ${accuracy.medianAskingErrorPct.toFixed(1)}%.`,
        'Paste a MyHome or Daft link and get the likely sale price in seconds.',
      ],
      LIMITS.description,
      4
    ),
    finalUrl: `${site}/`,
    path1: 'price-check',
    path2: 'dublin',
  };
}

/** Keywords for an area, as [text, match type]. */
export function areaKeywords(label) {
  const l = label.toLowerCase();
  return [
    [`house prices ${l}`, 'Phrase'],
    [`${l} house prices`, 'Phrase'],
    [`sold prices ${l}`, 'Phrase'],
    [`${l} sold prices`, 'Phrase'],
    [`property prices ${l}`, 'Phrase'],
    [`${l} property price register`, 'Phrase'],
    [`how much over asking ${l}`, 'Phrase'],
  ];
}

export const CHECK_KEYWORDS = [
  ['what will my house sell for dublin', 'Phrase'],
  ['how much will a house sell for dublin', 'Phrase'],
  ['sold vs asking price dublin', 'Phrase'],
  ['how much over asking dublin', 'Phrase'],
  ['dublin house price checker', 'Phrase'],
  ['dublin sold house prices', 'Phrase'],
  ['property price register dublin', 'Phrase'],
  ['house sold prices dublin', 'Phrase'],
  ['how much over asking should i bid', 'Phrase'],
  ['bidding war dublin house', 'Phrase'],
  ['what did my neighbours house sell for', 'Phrase'],
];

const blank = () => Object.fromEntries(COLUMNS.map((c) => [c, '']));

/** Every row of the import: campaign, ad groups, keywords, ads, negatives. */
export function buildRows({ site, campaign, budget, dublin, areas, accuracy }) {
  const rows = [];
  const row = (values) => rows.push({ ...blank(), ...values });
  row({
    Campaign: campaign,
    'Campaign type': 'Search',
    'Campaign daily budget': budget.toFixed(2),
    'Bid strategy type': 'Maximize clicks',
    'Campaign status': 'Paused',
  });
  for (const negative of NEGATIVES) row({ Campaign: campaign, Keyword: negative, 'Criterion type': 'Campaign negative' });

  const group = (name, keywords, ad) => {
    row({ Campaign: campaign, 'Ad group': name, 'Max CPC': '1.00', Status: 'Paused' });
    for (const [text, match] of keywords) row({ Campaign: campaign, 'Ad group': name, Keyword: text, 'Criterion type': match, Status: 'Paused' });
    const adRow = { Campaign: campaign, 'Ad group': name, 'Final URL': ad.finalUrl, 'Path 1': ad.path1, 'Path 2': ad.path2, Status: 'Paused' };
    ad.headlines.forEach((h, i) => (adRow[`Headline ${i + 1}`] = h));
    ad.descriptions.forEach((d, i) => (adRow[`Description ${i + 1}`] = d));
    row(adRow);
  };

  group('Price check', CHECK_KEYWORDS, checkAd(site, dublin, accuracy));
  for (const area of areas) group(`Area: ${area.label}`, areaKeywords(area.label), areaAd(area, site, accuracy));
  return rows;
}

/** CSV text (RFC 4180 quoting). */
export function toCsv(rows, columns = COLUMNS) {
  const cell = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.join(','), ...rows.map((r) => columns.map((c) => cell(r[c])).join(','))].join('\n') + '\n';
}
