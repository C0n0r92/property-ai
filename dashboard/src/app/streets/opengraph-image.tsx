import { OG_SIZE, ogCard } from "@/lib/og-card";

export const alt = "House prices, street by street, from the Property Price Register";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard({
    kicker: "Dublin and every county",
    title: "House prices, street by street",
    footer: "Every sold price since 2010 · typical prices now · homes sold twice",
  });
}
