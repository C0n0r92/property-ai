import nodemailer, { type Transporter } from 'nodemailer';
import type { Query } from './model';
import type { PublicResult } from './public';
import { describeHome } from './report';

let transport: Transporter | null | undefined;

/** SMTP from SMTP_URL (e.g. smtps://user:pass@smtp.example.com:465). */
function getTransport(): Transporter | null {
  if (transport !== undefined) return transport;
  transport = process.env.SMTP_URL ? nodemailer.createTransport(process.env.SMTP_URL) : null;
  return transport;
}

export function emailConfigured(): boolean {
  return Boolean(process.env.SMTP_URL && process.env.EMAIL_FROM);
}

const euro = (value: number) => `€${Math.round(value).toLocaleString('en-IE')}`;
const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function resultLink(siteUrl: string, query: Query): string {
  const params = new URLSearchParams({
    area: query.areaKey,
    type: query.typeGroup,
    beds: String(query.beds ?? 3),
    asking: String(query.askingPrice),
  });
  return `${siteUrl}/real-price?${params.toString()}`;
}

/** Send the free result. Returns false if email is not set up or sending failed. */
export async function sendResultEmail(options: {
  to: string;
  query: Query;
  areaLabel: string;
  result: PublicResult;
  siteUrl: string;
}): Promise<boolean> {
  const mailer = getTransport();
  const from = process.env.EMAIL_FROM;
  if (!mailer || !from) return false;

  const { to, query, areaLabel, result, siteUrl } = options;
  const home = describeHome(query, areaLabel);
  const link = resultLink(siteUrl, query);
  const { prediction, evidence } = result;
  const over = `${prediction.medianOverAskingPct >= 0 ? '+' : ''}${prediction.medianOverAskingPct.toFixed(1)}%`;
  const above = Math.round(prediction.shareAboveAsking * 100);

  const text = [
    `A ${home} asking ${euro(query.askingPrice)} will likely sell for about ${euro(prediction.mid)}.`,
    '',
    `${above}% of ${evidence.count} similar sales went above asking. The typical result was ${over} on the asking price.`,
    '',
    `See it again, and try a bid: ${link}`,
    `The full bidding report, with every comparable sale: ${link}#report`,
  ].join('\n');

  const html = `<!doctype html><html><body style="margin:0;background:#fcfcfa;font-family:Helvetica,Arial,sans-serif;color:#16223f">
<div style="max-width:520px;margin:0 auto;padding:32px 24px">
<p style="font-size:15px;margin:0 0 6px;color:#4d586b">A ${escapeHtml(home)} asking ${euro(query.askingPrice)} will likely sell for about</p>
<p style="font-size:44px;font-weight:700;letter-spacing:-1px;margin:0 0 18px">${euro(prediction.mid)}</p>
<p style="font-size:16px;line-height:1.6;margin:0 0 24px;color:#4d586b">${above}% of ${evidence.count} similar sales went above asking. The typical result was <b style="color:#16223f">${over}</b> on the asking price.</p>
<p style="margin:0 0 12px"><a href="${escapeHtml(link)}" style="display:inline-block;background:#16223f;color:#fcfcfa;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px">See it again and try a bid</a></p>
<p style="font-size:14px;margin:0 0 28px"><a href="${escapeHtml(link)}#report" style="color:#2f4fb0">Get the full bidding report, with every comparable sale</a></p>
<p style="font-size:12px;color:#7d869a;line-height:1.5;margin:0">You asked us to email you this result. Based on sales up to ${escapeHtml(evidence.to)}. Not a valuation.</p>
</div></body></html>`;

  try {
    await mailer.sendMail({ from, to, subject: `${euro(prediction.mid)}: what a ${home} will really sell for`, text, html });
    return true;
  } catch (error) {
    console.error('Result email failed:', error instanceof Error ? error.message : error);
    return false;
  }
}
