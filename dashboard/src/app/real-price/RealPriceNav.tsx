import Link from "next/link";

/**
 * Floating pill navigation on every page. `cta` is where "Get the report"
 * leads: the offer on this page (#report), or the home page's offer from
 * anywhere else ("/#report"). False hides it. On phones the links fold into
 * a menu so the brand and the report button keep their place.
 */
const LINKS = [
  { href: "/worth", label: "Look up a home" },
  { href: "/areas", label: "Prices" },
  { href: "/blog", label: "Research" },
];

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
      <span className="rp-nav-links">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="rp-nav-link">
            {l.label}
          </Link>
        ))}
      </span>
      <details className="rp-nav-more">
        <summary className="rp-nav-link">Menu</summary>
        <div className="rp-nav-menu">
          <Link href="/">Check a price</Link>
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
          <Link href="/streets">Streets</Link>
          <Link href="/track-record">Track record</Link>
        </div>
      </details>
      {cta && (
        <a href={cta} className="rp-nav-cta">
          Get the report
        </a>
      )}
    </nav>
  );
}
