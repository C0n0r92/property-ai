"use client";

import Link from "next/link";
import SoldAlert from "./SoldAlert";

export interface WorthHome {
  address: string;
  county: string;
  areaName: string;
  lastSale: { price: number; date: string; newBuild: boolean };
  previous: Array<{ price: number; date: string }>;
  estimate: { mid: number; low: number; high: number; areaChangePct: number; neighbours: number };
  extended: { year: number; work: string } | null;
  accuracy: { medianAbs: number; within10: number; tested: number } | null;
  streetSlug: string | null;
}

const euro = (v: number) => `€${Math.round(v).toLocaleString("en-IE")}`;
const short = (v: number) => (v >= 1_000_000 ? `€${(v / 1_000_000).toFixed(2)}m` : `€${Math.round(v / 1000)}k`);
const monthYear = (iso: string) => new Date(iso).toLocaleDateString("en-IE", { month: "long", year: "numeric" });
const signed = (v: number) => `${v >= 0 ? "up" : "down"} ${Math.abs(Math.round(v))}%`;

/** One home's estimate: the figure, why, how sure, and what to do next. */
export default function WorthCard({ home, showStreetLink = true }: { home: WorthHome; showStreetLink?: boolean }) {
  const e = home.estimate;
  const dublin = home.county === "Dublin";
  return (
    <article className="rp-worth-card">
      <p className="rp-worth-home">{home.address}</p>
      <p className="rp-worth-figure">
        About <strong>{euro(e.mid)}</strong>
      </p>
      <p className="rp-worth-range">
        Likely {short(e.low)} to {short(e.high)}
      </p>
      <ul className="rp-worth-why">
        <li>
          Last sold for <strong>{euro(home.lastSale.price)}</strong> in {monthYear(home.lastSale.date)}
          {home.lastSale.newBuild ? " (new, before VAT)" : ""}.
        </li>
        <li>
          {home.areaName} prices are {signed(e.areaChangePct)} since.
        </li>
        {e.neighbours >= 3 && <li>Weighed against {e.neighbours} similar homes sold on the street lately.</li>}
        {home.extended && (
          <li>
            {home.extended.work.charAt(0).toUpperCase() + home.extended.work.slice(1)} granted in {home.extended.year}:
            extended homes resold about 6% above their area&apos;s trend.
          </li>
        )}
      </ul>
      {home.accuracy && (
        <p className="rp-worth-accuracy">
          A guide, not a valuation: typically within {Math.round(home.accuracy.medianAbs)}% of the real price
          {dublin ? " in Dublin" : ` in Co. ${home.county}`}, tested on {home.accuracy.tested.toLocaleString("en-IE")}{" "}
          recent resales. It can&apos;t see condition or work done without permission.
        </p>
      )}
      <div className="rp-worth-actions">
        {dublin && (
          <Link href="/#check" className="rp-button rp-button--ink">
            Buying it? See what it will sell for
          </Link>
        )}
        {showStreetLink && home.streetSlug && (
          <Link href={`/streets/${home.streetSlug}`} className="rp-link">
            Every sale on the street
          </Link>
        )}
      </div>
      <SoldAlert address={home.address} county={home.county} compact />
    </article>
  );
}
