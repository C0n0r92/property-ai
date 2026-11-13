import type { Metadata } from "next";
import Link from "next/link";
import { availableMonths, buildMonthlyReport } from "@/lib/real-price/monthly-report";
import { getSalesStore } from "@/lib/real-price/store";

// Built from the live database on request. Pre-building at deploy time would
// use the seed file (the build has no database), showing old figures.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Dublin Over-Asking Report | Irish Property Data" },
  description:
    "Each month: how far over asking Dublin homes sold, the share above asking, the hottest districts and the biggest overbids. From matched asking and sale prices.",
  alternates: { canonical: "/reports" },
};

const signed = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}%`;

export default async function ReportsIndex() {
  const store = await getSalesStore();
  const months = availableMonths(store).slice(0, 24);
  const reports = months.map((m) => buildMonthlyReport(store, m)!).filter(Boolean);
  const [latest, ...rest] = reports;

  return (
    <main className="rp-wrap rp-blog rp-reports-index">
      <header className="rp-blog-head">
        <p className="rp-eyebrow">Monthly report</p>
        <h1 className="rp-blog-title">How far over asking Dublin sold, month by month.</h1>
        <p className="rp-blog-lede">
          Every month we pair each Dublin sale on the Property Price Register with the price it was advertised at,
          and report how far over asking homes went: overall, by district, by type and by price.
        </p>
      </header>

      {latest && (
        <Link href={`/reports/${latest.month}`} className="rp-blog-lead">
          <span className="rp-blog-meta">Latest · {latest.label}</span>
          <span className="rp-blog-lead-title">
            Dublin homes sold for {signed(latest.medianOverAskingPct)} on asking in {latest.label}
          </span>
          <span className="rp-blog-lead-excerpt">
            {Math.round(latest.shareAboveAsking * 100)}% sold above asking, from {latest.count} sales.
            {latest.districts[0] && ` Hottest: ${latest.districts[0].label} at ${signed(latest.districts[0].medianOverAskingPct)}.`}
          </span>
          <span className="rp-blog-read">Read the report →</span>
        </Link>
      )}

      <ol className="rp-blog-list rp-reports-list">
        {rest.map((r) => (
          <li key={r.month}>
            <Link href={`/reports/${r.month}`} className="rp-blog-item">
              <span className="rp-blog-meta">{r.count} sales</span>
              <span className="rp-blog-item-title">
                {r.label}: {signed(r.medianOverAskingPct)} on asking, {Math.round(r.shareAboveAsking * 100)}% above
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
