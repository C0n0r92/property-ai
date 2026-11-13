"use client";

import type { ComponentType } from "react";
import * as Charts from "@/components/BlogCharts";

/** Chart names used in older articles for charts that were later renamed. */
const RENAMED: Record<string, string> = {
  YieldDistributionChart: "YieldDistributionChartNew",
  SizeEfficiencyChart: "SizeEfficiencyChartNew",
  PremiumDistributionChart: "PremiumDistributionChartNew",
};

const library = Charts as unknown as Record<string, ComponentType | undefined>;

/** A chart named in an article, e.g. <OverAskingChart />. Unknown names render nothing. */
export default function ArticleChart({ name }: { name: string }) {
  const Chart = library[RENAMED[name] ?? name];
  if (!Chart) return null;
  return (
    <figure className="rp-article-chart">
      <Chart />
    </figure>
  );
}
