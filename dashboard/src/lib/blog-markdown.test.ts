import { describe, expect, it } from "vitest";
import { renderArticle, rewriteHref, slugify, wordCount } from "./blog-markdown";

const html = (md: string) =>
  renderArticle(md)
    .segments.filter((s) => s.type === "html")
    .map((s) => (s as { html: string }).html)
    .join("\n");

describe("renderArticle", () => {
  it("drops an opening h1 that the page already prints", () => {
    const out = html("# Dublin Bidding Wars\n\nIntro text.");
    expect(out).not.toContain("<h1");
    expect(out).not.toContain("<h2");
    expect(out).toContain("<p>Intro text.</p>");
  });

  it("turns a later h1 into an h2 so the page keeps one h1", () => {
    const out = html("Intro.\n\n# Another part");
    expect(out).toContain('<h2 id="another-part">Another part</h2>');
  });

  it("collects h2 headings with unique ids", () => {
    const { headings } = renderArticle("## Summary\n\ntext\n\n## Summary\n\n### Detail");
    expect(headings).toEqual([
      { id: "summary", text: "Summary" },
      { id: "summary-2", text: "Summary" },
    ]);
  });

  it("splits charts out as their own segments", () => {
    const { segments } = renderArticle("Before.\n\n<OverAskingChart />\n\nAfter.");
    expect(segments.map((s) => s.type)).toEqual(["html", "chart", "html"]);
    expect(segments[1]).toEqual({ type: "chart", name: "OverAskingChart" });
  });

  it("renders tables with a header row", () => {
    const out = html("| Area | Rate |\n|------|------|\n| D10 | 91.3% |\n| D24 | 90.0% |");
    expect(out).toContain('<th scope="col">Area</th>');
    expect(out).toContain("<td>D24</td><td>90.0%</td>");
    expect(out).not.toContain("------");
  });

  it("renders bullet and numbered lists", () => {
    expect(html("- one\n- **two**")).toContain("<ul><li>one</li><li><strong>two</strong></li></ul>");
    expect(html("1. first\n2. second")).toContain("<ol><li>first</li><li>second</li></ol>");
  });

  it("joins wrapped lines into one paragraph and keeps emphasis", () => {
    expect(html("A *quiet* line\nthat wraps.")).toContain("<p>A <em>quiet</em> line that wraps.</p>");
  });

  it("does not treat multiplication-style asterisks as emphasis across words", () => {
    expect(html("**Bold** and plain")).toContain("<strong>Bold</strong> and plain");
  });

  it("points links to old site sections straight at the home page", () => {
    const out = html("Use the [map](/map) or [blog](/blog/x) or [site](https://example.com).");
    expect(out).toContain('<a href="/">map</a>');
    expect(out).toContain('<a href="/blog/x">blog</a>');
    expect(out).toContain('<a href="https://example.com" rel="noopener" target="_blank">site</a>');
  });
});

describe("helpers", () => {
  it("rewriteHref keeps blog, report and external links", () => {
    expect(rewriteHref("/mortgage-calc")).toBe("/");
    expect(rewriteHref("/real-price/privacy")).toBe("/real-price/privacy");
    expect(rewriteHref("https://www.propertypriceregister.ie")).toBe("https://www.propertypriceregister.ie");
  });

  it("slugify makes readable ids", () => {
    expect(slugify("Top **Bidding** War Areas (D10–D24)")).toBe("top-bidding-war-areas-d10-d24");
  });

  it("wordCount ignores chart tags", () => {
    expect(wordCount("Three little words\n\n<OverAskingChart />")).toBe(3);
  });

  it("rewriteHref sends links to retired articles to their new address", () => {
    const retired = new Map([["old-post", "/areas"]]);
    expect(rewriteHref("/blog/old-post", retired)).toBe("/areas");
    expect(rewriteHref("/blog/live-post", retired)).toBe("/blog/live-post");
  });
});
