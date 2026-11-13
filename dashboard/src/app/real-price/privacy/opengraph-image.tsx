import { OG_SIZE, ogCard } from "@/lib/og-card";

export const alt = "Irish Property Data privacy and cookies";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard({ kicker: "Privacy and cookies", title: "What we collect, and why" });
}
