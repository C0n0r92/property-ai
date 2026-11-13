import type { Metadata } from "next";
import Link from "next/link";
import RpShell from "@/components/rp/RpShell";
import SiteFooter from "@/components/rp/SiteFooter";
import RealPriceNav from "./real-price/RealPriceNav";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

/** Any address the site does not know: say so, and offer the main ways in. */
export default function NotFound() {
  return (
    <RpShell>
      <RealPriceNav cta="/#report" />
      <main className="rp-wrap rp-notfound">
        <p className="rp-eyebrow">404</p>
        <h1 className="rp-area-title">That page isn&apos;t here.</h1>
        <p className="rp-area-lede">
          It may have moved when the site changed. These are the places most people are looking for:
        </p>
        <ul className="rp-notfound-links">
          <li>
            <Link href="/">Check what a Dublin home will really sell for</Link>
          </li>
          <li>
            <Link href="/areas">Every area: how far over asking homes sell</Link>
          </li>
          <li>
            <Link href="/reports">The monthly over-asking report</Link>
          </li>
          <li>
            <Link href="/blog">Research on the Dublin market</Link>
          </li>
        </ul>
      </main>
      <SiteFooter />
    </RpShell>
  );
}
