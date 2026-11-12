/**
 * Real Price Check
 *
 * Server component: answers a default example so the page opens on a real
 * result, then hands off to the interactive client component.
 */

import { Metadata } from "next";
import { BACKTEST } from "@/lib/real-price/backtest";
import { analyse, extractAreas, tidyAddress } from "@/lib/real-price/model";
import { REPORT_PRICE_CENTS } from "@/lib/real-price/report";
import { getSalesStore } from "@/lib/real-price/store";
import RealPriceClient from "./RealPriceClient";

export const metadata: Metadata = {
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

export default function RealPricePage() {
  const store = getSalesStore();
  const result = analyse(store.sales, EXAMPLE, store.asOf);
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
      initial={{
        form: { ...EXAMPLE },
        answer: {
          areaLabel: store.areaLabels.get(EXAMPLE.areaKey) ?? "Dublin 8",
          result,
        },
      }}
    />
  );
}
