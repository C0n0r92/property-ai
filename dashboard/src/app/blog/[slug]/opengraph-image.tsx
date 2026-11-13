import { ImageResponse } from "next/og";
import { readArticleMeta, topicOf } from "@/lib/blog";

export const alt = "Irish Property Data research";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#16223f";
const SOFT = "#4d586b";
const GOLD = "#a37a1f";

/** The picture shown when an article link is shared: its title on the site's paper. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const meta = readArticleMeta(slug);
  const title = meta?.title ?? "Dublin property research";
  const topic = meta ? topicOf(meta.category) : "Research";
  const date = meta
    ? new Date(meta.date).toLocaleDateString("en-IE", { month: "long", year: "numeric" })
    : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          color: INK,
          background: "linear-gradient(160deg, #fcfcfa 0%, #fdeee2 62%, #e3d6f2 100%)",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, color: GOLD, fontWeight: 600 }}>
          {`Research · ${topic}`}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: title.length > 80 ? 56 : 66,
            lineHeight: 1.1,
            fontWeight: 700,
            letterSpacing: -1.5,
          }}
        >
          {title}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: SOFT }}>
          <span>Irish Property Data</span>
          <span>{date}</span>
        </div>
      </div>
    ),
    size,
  );
}
