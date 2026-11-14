import Link from "next/link";
import CookieSettingsLink from "./CookieSettingsLink";

/** Footer for pages other than the home page (which has its own). */
export default function SiteFooter() {
  return (
    <footer className="rp-footer rp-wrap rp-no-print">
      <span>
        Irish Property Data. Dublin asking and sold prices. Not a valuation.
      </span>
      <span>
        <Link href="/">Check a home</Link>
        <Link href="/areas">Areas</Link>
        <Link href="/streets">Streets</Link>
        <Link href="/compare">Compare two homes</Link>
        <Link href="/reports">Monthly report</Link>
        <Link href="/track-record">Track record</Link>
        <Link href="/blog">Research</Link>
        <Link href="/real-price/privacy">Privacy</Link>
        <CookieSettingsLink />
      </span>
    </footer>
  );
}
