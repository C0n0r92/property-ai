/**
 * Turns a blog article's Markdown into HTML blocks and chart placeholders.
 *
 * The articles are files in this repository (public/blog-content), written in
 * a small subset of Markdown with some inline HTML, so the HTML is passed
 * through rather than escaped. A line that is only a component tag, such as
 * `<OverAskingChart />`, becomes a chart.
 */

export type Segment = { type: "html"; html: string } | { type: "chart"; name: string };

export interface Heading {
  id: string;
  text: string;
}

export interface RenderedArticle {
  segments: Segment[];
  /** Second-level headings, for "In this article". */
  headings: Heading[];
}

const CHART_LINE = /^<([A-Z][A-Za-z0-9]*)\s*\/>$/;

/** Plain text of an inline Markdown/HTML fragment. */
function plain(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/\*\*|__|\*|`/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .trim();
}

export function slugify(text: string): string {
  return plain(text)
    .toLowerCase()
    .replace(/&[a-z]+;/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Links inside articles still point at sections of the old site (/map,
 * /mortgage-calc, ...). Those now redirect to the price check, so link
 * straight there instead of through a redirect.
 */
export function rewriteHref(href: string, redirects?: ReadonlyMap<string, string>): string {
  if (!href.startsWith("/")) return href;
  const retired = href.match(/^\/blog\/([^/?#]+)/);
  if (retired && redirects?.has(retired[1])) return redirects.get(retired[1])!;
  if (href === "/" || href.startsWith("/blog") || href.startsWith("/real-price/")) return href;
  return "/";
}

let activeRedirects: ReadonlyMap<string, string> | undefined;

function inline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label: string, href: string) => {
      const target = rewriteHref(href, activeRedirects);
      const external = /^https?:\/\//.test(target);
      return external
        ? `<a href="${target}" rel="noopener" target="_blank">${label}</a>`
        : `<a href="${target}">${label}</a>`;
    })
    // Raw HTML links in older articles get the same treatment
    .replace(/<a\s+href="(\/[^"]*)"/g, (_, href: string) => `<a href="${rewriteHref(href, activeRedirects)}"`);
}

const isTableRow = (line: string) => /^\|.*\|$/.test(line);
const isSeparator = (line: string) => /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(line);
const cells = (line: string) =>
  line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());

/**
 * Render an article. The page prints the title as its h1, so an opening
 * `# Title` line (which every article starts with) is dropped, and any later
 * h1 becomes an h2. `redirects` (retired slug -> new address) sends links to
 * retired articles straight to where they now lead.
 */
export function renderArticle(markdown: string, redirects?: ReadonlyMap<string, string>): RenderedArticle {
  activeRedirects = redirects;
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const segments: Segment[] = [];
  const headings: Heading[] = [];
  const usedIds = new Set<string>();
  let html: string[] = [];
  let paragraph: string[] = [];
  let firstContent = true;

  const flushParagraph = () => {
    if (paragraph.length) html.push(`<p>${inline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const flushHtml = () => {
    flushParagraph();
    if (html.length) segments.push({ type: "html", html: html.join("\n") });
    html = [];
  };
  const uniqueId = (text: string) => {
    const base = slugify(text) || "section";
    let id = base;
    for (let n = 2; usedIds.has(id); n++) id = `${base}-${n}`;
    usedIds.add(id);
    return id;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      flushParagraph();
      continue;
    }

    const chart = line.match(CHART_LINE);
    if (chart) {
      flushHtml();
      segments.push({ type: "chart", name: chart[1] });
      firstContent = false;
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      const level = heading[1].length;
      const text = heading[2].replace(/\s+#+$/, "");
      // The page prints the title itself
      if (level === 1 && firstContent) {
        firstContent = false;
        continue;
      }
      firstContent = false;
      // h1 inside the body would compete with the page title
      const tag = level === 1 ? 2 : level;
      const id = uniqueId(text);
      if (tag === 2) headings.push({ id, text: plain(text) });
      html.push(`<h${tag} id="${id}">${inline(text)}</h${tag}>`);
      continue;
    }
    firstContent = false;

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flushParagraph();
      html.push("<hr />");
      continue;
    }

    if (isTableRow(line)) {
      flushParagraph();
      const rows: string[] = [];
      while (i < lines.length && isTableRow(lines[i].trim())) rows.push(lines[i++].trim());
      i--;
      const hasHeader = rows.length > 1 && isSeparator(rows[1]);
      const head = hasHeader ? rows[0] : null;
      const body = rows.filter((r, n) => !isSeparator(r) && !(hasHeader && n === 0));
      html.push(
        '<div class="rp-article-table"><table>' +
          (head ? `<thead><tr>${cells(head).map((c) => `<th scope="col">${inline(c)}</th>`).join("")}</tr></thead>` : "") +
          `<tbody>${body.map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody>` +
          "</table></div>",
      );
      continue;
    }

    const bullet = /^[-*+]\s+/;
    const numbered = /^\d+[.)]\s+/;
    if (bullet.test(line) || numbered.test(line)) {
      flushParagraph();
      const ordered = numbered.test(line);
      const marker = ordered ? numbered : bullet;
      const items: string[] = [];
      while (i < lines.length && marker.test(lines[i].trim())) {
        items.push(`<li>${inline(lines[i].trim().replace(marker, ""))}</li>`);
        i++;
      }
      i--;
      const tag = ordered ? "ol" : "ul";
      html.push(`<${tag}>${items.join("")}</${tag}>`);
      continue;
    }

    if (line.startsWith(">")) {
      flushParagraph();
      const quote: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quote.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      i--;
      html.push(`<blockquote><p>${inline(quote.join(" "))}</p></blockquote>`);
      continue;
    }

    // A line that is a block of HTML stands on its own
    if (/^<\/?(ul|ol|li|div|table|thead|tbody|tr|td|th|p|h[1-6]|blockquote|figure|img|br|hr)\b/i.test(line)) {
      flushParagraph();
      html.push(inline(line));
      continue;
    }

    paragraph.push(line);
  }

  flushHtml();
  return { segments, headings };
}

/** Words in an article, for reading time when an article does not give one. */
export function wordCount(markdown: string): number {
  return plain(markdown.replace(/<[A-Z][A-Za-z0-9]*\s*\/>/g, "")).split(/\s+/).filter(Boolean).length;
}
