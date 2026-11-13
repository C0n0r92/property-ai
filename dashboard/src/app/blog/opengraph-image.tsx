import { OG_SIZE, ogCard } from "@/lib/og-card";

export const alt = "Dublin property market research";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard({
    kicker: "Research",
    title: "The Dublin property market, from the sales themselves",
    footer: "How far over asking, where, for which homes, and when",
  });
}
