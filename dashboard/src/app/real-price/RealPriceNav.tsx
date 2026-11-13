import Link from "next/link";

/**
 * Floating pill navigation shared by the home page, the report and the blog.
 * `cta` is where "Get the report" leads: the offer on this page (#report), or
 * the home page's offer from anywhere else ("/#report"). False hides it.
 */
export default function RealPriceNav({
  cta = "#report",
}: {
  cta?: string | false;
}) {
  return (
    <nav className="rp-nav rp-no-print" aria-label="Main">
      <Link href="/" className="rp-nav-brand">
        <svg viewBox="0 0 28 28" width="26" height="26" aria-hidden="true">
          <path d="M4 25V12l10-8 10 8v13z" fill="var(--ink)" />
          <path d="M11 25v-7a3 3 0 0 1 6 0v7z" fill="var(--brass-bright)" />
        </svg>
        Real Price
      </Link>
      <Link href="/areas" className="rp-nav-link">
        Areas
      </Link>
      <Link href="/blog" className="rp-nav-link">
        Research
      </Link>
      {cta && (
        <a href={cta} className="rp-nav-cta">
          Get the report
        </a>
      )}
    </nav>
  );
}
