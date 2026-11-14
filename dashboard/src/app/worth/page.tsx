import type { Metadata } from "next";
import Link from "next/link";
import { worthAccuracy } from "@/lib/real-price/worth-data";
import WorthLookup from "./WorthLookup";

// Accuracy from the live database (the build has no database)
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "What Is My House Worth? Free Estimate, Any County",
  description:
    "A free estimate for any home in Ireland that has sold since 2010: its last sale price, brought to today with how prices moved in its area.",
  alternates: { canonical: "/worth" },
};

type Search = Promise<{ address?: string }>;

export default async function WorthPage({ searchParams }: { searchParams: Search }) {
  const { address } = await searchParams;
  const accuracy = await worthAccuracy();
  const all = accuracy?.all;
  return (
    <main className="rp-area">
      <section className="rp-wrap rp-areas-head">
        <p className="rp-eyebrow">Every county · free</p>
        <h1 className="rp-blog-title">What is it worth?</h1>
        <p className="rp-blog-lede">
          Any home in Ireland that has sold since 2010: its last sale price, brought to today with how prices moved
          around it.
        </p>
        <WorthLookup initial={typeof address === "string" ? address.slice(0, 200) : ""} />
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
