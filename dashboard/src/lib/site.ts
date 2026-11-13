/** The public address of the site, without a trailing slash. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://irishpropertydata.com"
).replace(/\/+$/, "");

export const SITE_NAME = "Irish Property Data";

/** JSON for a <script type="application/ld+json">, safe to inline in HTML. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
