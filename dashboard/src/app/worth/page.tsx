import type { Metadata } from "next";
import Link from "next/link";
import { worthAccuracy } from "@/lib/real-price/worth-data";
import HomeSearch from "@/components/rp/HomeSearch";

// Accuracy from the live database (the build has no database)
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Look Up Any Home: Sold Prices and What It's Worth",
  description:
    "Any home in Ireland: every sale since 2010, what it's likely worth today, its listings and planning. Free.",
  alternates: { canonical: "/worth" },
};

export default async function WorthPage() {
  const accuracy = await worthAccuracy();
  const all = accuracy?.all;
  return (
    <main className="rp-area">
      <section className="rp-wrap rp-areas-head">
        <p className="rp-eyebrow">Every county · free</p>
        <h1 className="rp-blog-title">Look up any home.</h1>
        <p className="rp-blog-lede">
          Every sale since 2010, what it&apos;s likely worth today, and if it&apos;s for sale in Dublin, what it will
          really sell for.
        </p>
        <HomeSearch />
        <ul className="rp-how rp-worth-how">
          <li>
            <strong>From the Property Price Register.</strong> The home&apos;s last sale, and every resale in its area
            since 2010 to measure how prices moved.
          </li>
          {all && (
            <li>
              <strong>Tested.</strong> Typically within {Math.round(all.medianAbs)}% of the real price across{" "}
              {all.tested.toLocaleString("en-IE")} recent resales; {Math.round(all.within10)}% within 10%.
            </li>
          )}
          <li>
            <strong>Buying in Dublin?</strong> The <Link href="/#check">price check</Link> uses the asking price too,
            and is typically within 5%.
          </li>
        </ul>
      </section>
    </main>
  );
}
