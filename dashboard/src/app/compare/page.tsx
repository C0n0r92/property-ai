import type { Metadata } from "next";
import { decodeHome, type CompareHome } from "@/lib/real-price/compare";
import { getSalesStore } from "@/lib/real-price/store";
import CompareHomes from "./CompareHomes";

// Area list from the live database (the build has no database)
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Compare Two Dublin Homes: Which Costs More?",
  description:
    "Put two Dublin homes side by side. See what each will likely sell for once the bidding is done, and whether the cheaper asking price is really cheaper.",
  alternates: { canonical: "/compare" },
};

type Search = Promise<{ a?: string; b?: string }>;

const DEFAULTS: [CompareHome, CompareHome] = [
  { areaKey: "d8", typeGroup: "terraced", beds: 3, askingPrice: 450_000 },
  { areaKey: "d12", typeGroup: "semi", beds: 3, askingPrice: 475_000 },
];

export default async function ComparePage({ searchParams }: { searchParams: Search }) {
  const params = await searchParams;
  const store = await getSalesStore();
  const known = new Set(store.areas.map((a) => a.key));
  // Districts first, in order, then the named areas
  const areas = [...store.areas]
    .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "district" ? -1 : 1))
    .map((a) => ({ key: a.key, label: a.label }));
  const pick = (value: string | undefined, fallback: CompareHome) => {
    const home = decodeHome(value);
    return home && known.has(home.areaKey) ? home : fallback;
  };
  const initial: [CompareHome, CompareHome] = [pick(params.a, DEFAULTS[0]), pick(params.b, DEFAULTS[1])];

  return (
    <main className="rp-area">
      <section className="rp-wrap rp-areas-head">
        <p className="rp-eyebrow">Compare two homes</p>
        <h1 className="rp-area-title">Which will really cost more?</h1>
        <p className="rp-area-lede">
          A lower asking price isn&apos;t always the cheaper home. Put two side by side, paste their listing links or
          describe them, and see what each will likely sell for once the bidding is done, from recent sales of similar
          homes in each area.
        </p>
        <CompareHomes areas={areas} initial={initial} />
      </section>
    </main>
  );
}
