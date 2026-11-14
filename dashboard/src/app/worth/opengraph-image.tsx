import { OG_SIZE, ogCard } from "@/lib/og-card";

export const alt = "What is it worth? A free estimate for any home in Ireland";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard({
    kicker: "Every county · free",
    title: "What is your home worth today?",
    footer: "Its last sale price, brought to today with how prices moved around it",
  });
}
