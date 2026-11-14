import { OG_SIZE, ogCard } from "@/lib/og-card";

export const alt = "Look up any home in Ireland: sold prices and what it's worth";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard({
    kicker: "Every county · free",
    title: "Look up any home in Ireland",
    footer: "Every sale since 2010, what it's worth today, its listings and planning"
  });
}
