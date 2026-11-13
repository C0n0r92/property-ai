/**
 * Home page: the Real Price check.
 *
 * Server component: answers a default example (or the home in a shared link)
 * so the page opens on a real result, then hands off to the interactive
 * client component.
 */

import { Metadata } from "next";
import { BACKTEST } from "@/lib/real-price/backtest";
import RpShell from "@/components/rp/RpShell";
import {
  analyse,
  extractAreas,
  tidyAddress,
  typicalAsking,
  type TypeGroup,
} from "@/lib/real-price/model";
import { getMarketInsights } from "@/lib/real-price/insights";
import { getMarket } from "@/lib/real-price/market";
import { toPublicResult } from "@/lib/real-price/public";
import { reportPrice } from "@/lib/real-price/pricing";
import { describeHome } from "@/lib/real-price/report";
import { querySchema } from "@/lib/real-price/schema";
import { getSalesStore, type SalesStore } from "@/lib/real-price/store";
import { jsonLd, SITE_NAME, SITE_URL } from "@/lib/site";
import RealPriceClient from "./real-price/RealPriceClient";

const BASE_METADATA: Metadata = {
  // The site name is part of this title already, so skip the layout's suffix
  title: {
    absolute: "Dublin Sold vs Asking Price Checker | Irish Property Data",
  },
  description:
    "How much over asking will a Dublin home sell for? Enter its asking price and see what similar homes really sold for. Free, from 49,000 Dublin sales.",
  // Answers for a shared home all point at the one page
  alternates: { canonical: "/" },
  openGraph: {
    title: "What will it really sell for? Dublin asking price checker",
    description:
      "Asking prices in Dublin are a starting point. See what similar homes actually sold for and how far over asking you may need to bid.",
    type: "website",
    url: "/",
  },
};

const EXAMPLE = {
  areaKey: "d8",
  typeGroup: "terraced",
  beds: 2,
  askingPrice: 395_000,
} as const;

type Params = Record<string, string | string[] | undefined>;

/** Home type and size assumed when a link names only an area. */
const AREA_ONLY_DEFAULTS = { typeGroup: "semi" as TypeGroup, beds: 3 };

/**
 * The home in a link, if valid. A full link
 * (?area=d8&type=terraced&beds=2&asking=395000) is answered as given. A link
 * with only an area (?area=d8, where old area pages redirect) is answered
 * for a typical home there, at its typical asking price.
 */
function fromLink(params: Params, store: SalesStore) {
  const one = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : undefined;
  const areaKey = one("area");
  if (!areaKey || !store.areaLabels.has(areaKey)) return null;
  const typeGroup = one("type") ?? AREA_ONLY_DEFAULTS.typeGroup;
  const beds = one("beds") ? Number(one("beds")) : AREA_ONLY_DEFAULTS.beds;
  let askingPrice = Number(one("asking"));
  if (!one("asking")) {
    const parsedHome = querySchema
      .pick({ typeGroup: true, beds: true })
      .safeParse({ typeGroup, beds });
    if (!parsedHome.success || parsedHome.data.beds === undefined) return null;
    askingPrice =
      typicalAsking(
        store.sales,
        { areaKey, typeGroup: parsedHome.data.typeGroup, beds: parsedHome.data.beds },
        store.asOf,
      ) ?? NaN;
  }
  const parsed = querySchema.safeParse({ areaKey, typeGroup, beds, askingPrice });
  if (!parsed.success || parsed.data.beds === undefined) return null;
  return { ...parsed.data, beds: parsed.data.beds };
}

/** A shared link gets its own title and a preview picture of its answer. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Params>;
}): Promise<Metadata> {
  const store = await getSalesStore();
  const linked = fromLink(await searchParams, store);
  const query = linked ?? EXAMPLE;
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
  const linked = fromLink(await searchParams, store);
  const linkedResult = linked ? analyse(store.sales, linked, store.asOf) : null;
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

  const price = reportPrice();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Real Price check",
    url: `${SITE_URL}/`,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    description:
      "See what similar Dublin homes sold for compared with their asking price, and how far over asking a winning bid went.",
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: `${SITE_URL}/` },
    areaServed: { "@type": "City", name: "Dublin" },
    offers: [
      { "@type": "Offer", name: "Price check", price: "0", priceCurrency: "EUR" },
      {
        "@type": "Offer",
        name: "Full report (PDF)",
        price: (price.cents / 100).toFixed(2),
        priceCurrency: "EUR",
      },
    ],
  };

  return (
    <RpShell>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
    />
    <RealPriceClient
      areas={store.areas}
      dataTo={new Date(store.asOf).toISOString().slice(0, 10)}
      salesCount={store.sales.length}
      price={price}
      backtest={BACKTEST}
      boardSales={boardSales}
      market={await getMarket("all")}
      insights={await getMarketInsights()}
      initial={{
        form,
        answer: {
          areaLabel: store.areaLabels.get(form.areaKey) ?? "Dublin",
          result: toPublicResult(result),
        },
      }}
    />
    </RpShell>
  );
}
