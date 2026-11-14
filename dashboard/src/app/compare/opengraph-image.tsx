import { OG_SIZE, ogCard } from "@/lib/og-card";

export const alt = "Compare two Dublin homes: which will really cost more?";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard({
    kicker: "Compare two homes",
    title: "The lower asking price isn’t always the cheaper home",
    footer: "What each will likely sell for once the bidding is done · free",
  });
}
