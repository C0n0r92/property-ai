import { Bricolage_Grotesque, Source_Serif_4 } from "next/font/google";
import "@/app/real-price/real-price.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["wdth", "opsz"],
  variable: "--font-rp-display",
  display: "swap",
});

// "optional": the font is preloaded and used if it arrives within ~100 ms;
// otherwise the page keeps the stand-in for that visit instead of swapping
// mid-read. The hero sentence's italic fields have no size-matched stand-in,
// so a late swap re-wrapped the sentence and made the hero jump on phones.
const prose = Source_Serif_4({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-rp-prose",
  display: "optional",
});

/**
 * The look shared by the home page, the report and the blog: fonts, colours
 * and the warm page background.
 */
export default function RpShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={`rp ${display.variable} ${prose.variable}`}>{children}</div>
  );
}
