/**
 * "Tell me what it sold for": one email when a home a visitor checked
 * appears in the Property Price Register.
 *
 * The web server checks every few hours (instrumentation.ts), since that is
 * where email is set up. Matching uses the register's address key (house
 * number and street), then the district or town must agree.
 */
import { randomBytes } from 'node:crypto';
import { addressKey, sameArea } from './address';
import { tidyAddress } from './model';
import { getPool } from './pool';
import { sendMail } from './mailer';

export interface OpenAlert {
  id: number;
  email: string;
  address: string;
  address_key: string;
  district: string | null;
  asking_price: number | null;
  predicted_mid: number | null;
  token: string;
  created_at: string;
  /** The county the home is in ('Dublin', 'Kildare' ...) */
  county: string;
}

interface RegisterRow {
  id: string;
  date: string;
  address: string;
  price: number;
  district: string | null;
  county?: string;
}

/** Part-shares and other non-market transfers */
const MARKET_PRICE = 50_000;
/** The register records completion; a sale agreed before the alert completes soon after. */
const GRACE_DAYS = 14;
/** Unsent alerts are deleted after this long (as the privacy page says). */
export const ALERT_MONTHS = 18;

/** The home an alert watches; null without a house number (it could be many homes). */
export function alertTarget(address: string): { key: string; district: string | null } | null {
  const key = addressKey(address);
  return key.specific ? { key: key.key, district: key.district } : null;
}

/** The first market sale of the alert's home since (about) when it was set. */
export function matchSale(alert: OpenAlert, sales: RegisterRow[]): RegisterRow | null {
  const since = new Date(alert.created_at).getTime() - GRACE_DAYS * 86_400_000;
  const fits = sales
    .filter((s) => s.price >= MARKET_PRICE && new Date(s.date).getTime() >= since)
    .filter((s) => !s.county || s.county === alert.county)
    .filter((s) => (alert.district && s.district ? alert.district === s.district : sameArea(s.address, alert.address)))
    .sort((a, b) => a.date.localeCompare(b.date));
  return fits[0] ?? null;
}

const euro = (v: number) => `€${Math.round(v).toLocaleString('en-IE')}`;
const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' });

/** The email that says what the home sold for. */
export function soldEmail(
  alert: OpenAlert,
  sale: { date: string; price: number },
  site: string,
  streetPath: string | null
): { subject: string; text: string; html: string } {
  const home = tidyAddress(alert.address).split(',')[0].trim();
  const lines: string[] = [`${tidyAddress(alert.address)} sold for ${euro(sale.price)}, recorded on ${longDate(sale.date)}.`];
  if (alert.asking_price) {
    const pct = ((sale.price - alert.asking_price) / alert.asking_price) * 100;
    lines.push(
      Math.abs(pct) < 0.05
        ? `That is exactly its asking price of ${euro(alert.asking_price)}.`
        : `That is ${Math.abs(pct).toFixed(1)}% ${pct > 0 ? 'over' : 'under'} its asking price of ${euro(alert.asking_price)}.`
    );
  }
  if (alert.predicted_mid) lines.push(`Our price check said about ${euro(alert.predicted_mid)}.`);
  const more = streetPath ? `${site}${streetPath}` : `${site}/`;
  const footer = `You asked us to tell you what this home sold for. This is the only email about it; we have now deleted the request. From the Property Price Register.`;

  const text = [...lines, '', `Every sale on the street: ${more}`, '', footer].join('\n');
  const html = `<!doctype html><html><body style="margin:0;background:#fcfcfa;font-family:Helvetica,Arial,sans-serif;color:#16223f">
<div style="max-width:520px;margin:0 auto;padding:32px 24px">
<p style="font-size:15px;margin:0 0 6px;color:#4d586b">${escapeHtml(tidyAddress(alert.address))} sold for</p>
<p style="font-size:44px;font-weight:700;letter-spacing:-1px;margin:0 0 18px">${euro(sale.price)}</p>
${lines
  .slice(1)
  .map((l) => `<p style="font-size:16px;line-height:1.6;margin:0 0 10px;color:#4d586b">${escapeHtml(l)}</p>`)
  .join('\n')}
<p style="font-size:14px;margin:18px 0 28px"><a href="${escapeHtml(more)}" style="color:#2f4fb0">${streetPath ? 'Every sale on the street' : 'Check another home'}</a></p>
<p style="font-size:12px;color:#7d869a;line-height:1.5;margin:0">Recorded on ${escapeHtml(longDate(sale.date))}. ${escapeHtml(footer)}</p>
</div></body></html>`;
  return { subject: `${home} sold for ${euro(sale.price)}`, text, html };
}

/** The confirmation sent when an alert is set. */
export function confirmEmail(alert: { address: string; token: string }, site: string) {
  const stop = `${site}/sold-alert/stop?token=${alert.token}`;
  const home = tidyAddress(alert.address);
  const text = [
    `We'll email you once, when ${home} shows up in the Property Price Register, with what it sold for.`,
    '',
    'Sales usually appear one to three months after the sale closes.',
    '',
    `Didn't ask for this, or changed your mind? ${stop}`,
  ].join('\n');
  const html = `<!doctype html><html><body style="margin:0;background:#fcfcfa;font-family:Helvetica,Arial,sans-serif;color:#16223f">
<div style="max-width:520px;margin:0 auto;padding:32px 24px">
<p style="font-size:18px;line-height:1.5;margin:0 0 14px">We'll email you once, when <b>${escapeHtml(home)}</b> shows up in the Property Price Register, with what it sold for.</p>
<p style="font-size:15px;line-height:1.6;margin:0 0 24px;color:#4d586b">Sales usually appear one to three months after the sale closes.</p>
<p style="font-size:12px;color:#7d869a;line-height:1.5;margin:0">Didn't ask for this, or changed your mind? <a href="${escapeHtml(stop)}" style="color:#2f4fb0">Stop this alert</a>.</p>
</div></body></html>`;
  return { subject: `We'll tell you what ${home.split(',')[0]} sells for`, text, html };
}

export const newToken = () => randomBytes(24).toString('base64url');

/**
 * Check open alerts against the register and send what has sold. Returns
 * counts; never throws.
 */
export async function runSoldAlerts(site: string): Promise<{ open: number; sent: number; expired: number }> {
  const db = getPool();
  if (!db) return { open: 0, sent: 0, expired: 0 };
  try {
    const expired =
      (await db.query(`DELETE FROM sold_alerts WHERE notified_at IS NULL AND created_at < NOW() - INTERVAL '${ALERT_MONTHS} months'`))
        .rowCount ?? 0;
    const { rows: alerts } = await db.query<OpenAlert>(
      `SELECT id, email, address, address_key, district, asking_price, predicted_mid, token, created_at::text, county
         FROM sold_alerts WHERE notified_at IS NULL`
    );
    let sent = 0;
    for (const alert of alerts) {
      const { rows } = await db.query<RegisterRow & { street_slug: string | null }>(
        `SELECT r.id, r.sold_date::text AS date, r.address, r.price, r.district, r.county, s.slug AS street_slug
           FROM register_sales r LEFT JOIN streets s ON s.slug = r.street_slug
          WHERE r.address_key = $1 AND r.county = $3 AND r.sold_date >= ($2::timestamptz - INTERVAL '${GRACE_DAYS} days')::date`,
        [alert.address_key, alert.created_at, alert.county]
      );
      const sale = matchSale(alert, rows);
      if (!sale) continue;
      const street = rows.find((r) => r.id === sale.id)?.street_slug ?? null;
      const mail = soldEmail(alert, sale, site, street ? `/streets/${street}` : null);
      if (!(await sendMail({ to: alert.email, ...mail }))) continue;
      // Done: keep only what was found, not the visitor's email
      await db.query(
        `UPDATE sold_alerts SET notified_at = NOW(), sale_date = $2, sale_price = $3, email = '', token = 'sent-' || id WHERE id = $1`,
        [alert.id, sale.date, sale.price]
      );
      sent++;
    }
    return { open: alerts.length - sent, sent, expired };
  } catch (error) {
    console.error('Sold alerts check failed:', error instanceof Error ? error.message : error);
    return { open: 0, sent: 0, expired: 0 };
  }
}
