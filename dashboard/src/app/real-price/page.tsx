/**
 * Real Price Check
 *
 * Server component: answers a default example so the page opens on a real
 * result, then hands off to the interactive client component.
 */

import { Metadata } from "next";
import { BACKTEST } from "@/lib/real-price/backtest";
import { analyse, extractAreas, tidyAddress } from "@/lib/real-price/model";
import { getMarket } from "@/lib/real-price/market";
import { toPublicResult } from "@/lib/real-price/public";
import { describeHome, REPORT_PRICE_CENTS } from "@/lib/real-price/report";
import { querySchema } from "@/lib/real-price/schema";
import { getSalesStore } from "@/lib/real-price/store";
import RealPriceClient from "./RealPriceClient";

const BASE_METADATA: Metadata = {
  title:
    "What Will It Really Sell For? Dublin Asking Price Checker | Irish Property Data",
  description:
    "Enter the asking price of any Dublin home and see what similar homes actually sold for, how far over asking you may need to bid, and what your budget can realistically chase.",
  keywords: [
    "how much over asking Dublin",
    "Dublin house bidding",
    "asking price vs sold price Dublin",
    "how much to bid on a house Ireland",
    "Dublin sold prices",
  ],
  openGraph: {
    title: "What will it really sell for? Dublin asking price checker",
    description:
      "Asking prices in Dublin are a starting point. See what similar homes actually sold for and how far over asking you may need to bid.",
    type: "website",
  },
};

const EXAMPLE = {
  areaKey: "d8",
  typeGroup: "terraced",
  beds: 2,
  askingPrice: 395_000,
} as const;

type Params = Record<string, string | string[] | undefined>;

/** A shared link (?area=d8&type=terraced&beds=2&asking=395000), if valid. */
function fromLink(params: Params) {
  const one = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : undefined;
  const parsed = querySchema.safeParse({
    areaKey: one("area"),
    typeGroup: one("type"),
    beds: one("beds") ? Number(one("beds")) : undefined,
    askingPrice: Number(one("asking")),
  });
  if (!parsed.success || parsed.data.beds === undefined) return null;
  return { ...parsed.data, beds: parsed.data.beds };
}

/** A shared link gets its own title and a preview picture of its answer. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Params>;
}): Promise<Metadata> {
  const linked = fromLink(await searchParams);
  const store = await getSalesStore();
  const query =
    linked && store.areaLabels.has(linked.areaKey) ? linked : EXAMPLE;
  const result = analyse(store.sales, query, store.asOf);
  const image = `/api/real-price/og?${new URLSearchParams({
    area: query.areaKey,
    type: query.typeGroup,
    beds: String(query.beds),
    asking: String(query.askingPrice),
  }).toString()}`;
  const images = [{ url: image, width: 1200, height: 630 }];
  if (!linked || query === EXAMPLE || !result) {
    return {
      ...BASE_METADATA,
      openGraph: { ...BASE_METADATA.openGraph, images },
      twitter: { card: "summary_large_image", images: [image] },
    };
  }
  const home = describeHome(query, store.areaLabels.get(query.areaKey)!);
  const price = `€${result.prediction.mid.toLocaleString("en-IE")}`;
  const title = `${price}: what a ${home} will really sell for`;
  const description = `Asking €${query.askingPrice.toLocaleString("en-IE")}. ${Math.round(result.prediction.shareAboveAsking * 100)}% of ${result.evidence.count} similar homes sold above asking. Check any Dublin home.`;
  return {
    ...BASE_METADATA,
    title,
    description,
    openGraph: { title, description, type: "website", images },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function RealPricePage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const store = await getSalesStore();
  const linked = fromLink(await searchParams);
  const linkedResult =
    linked && store.areaLabels.has(linked.areaKey)
      ? analyse(store.sales, linked, store.asOf)
      : null;
  const form = linked && linkedResult ? linked : { ...EXAMPLE };
  const result = linkedResult ?? analyse(store.sales, EXAMPLE, store.asOf);
  if (!result) throw new Error("Example check has no comparable sales");

  // The most recent sales across Dublin, for the departures-style board
  const boardSales = [...store.sales]
    .sort((a, b) => b.t - a.t)
    .slice(0, 48)
    .map((sale) => {
      const parts = tidyAddress(sale.address).split(", ");
      const area =
        extractAreas(sale.address)[0]?.label ?? parts[parts.length - 1];
      return {
        address: parts[0],
        area,
        askingPrice: sale.askingPrice,
        soldPrice: sale.soldPrice,
      };
    });

  return (
    <RealPriceClient
      areas={store.areas}
      dataTo={new Date(store.asOf).toISOString().slice(0, 10)}
      salesCount={store.sales.length}
      reportPriceEuro={REPORT_PRICE_CENTS / 100}
      backtest={BACKTEST}
      boardSales={boardSales}
      market={await getMarket("all")}
      initial={{
        form,
        answer: {
          areaLabel: store.areaLabels.get(form.areaKey) ?? "Dublin",
          result: toPublicResult(result),
        },
      }}
    />
  );
}
