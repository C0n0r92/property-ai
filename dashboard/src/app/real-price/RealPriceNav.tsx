import Link from "next/link";

/** Floating pill navigation for the Real Price pages. */
export default function RealPriceNav({ cta = true }: { cta?: boolean }) {
  return (
    <nav className="rp-nav rp-no-print" aria-label="Real Price">
      <Link href="/real-price" className="rp-nav-brand">
        <svg viewBox="0 0 28 28" width="26" height="26" aria-hidden="true">
          <path d="M4 25V12l10-8 10 8v13z" fill="var(--ink)" />
          <path d="M11 25v-7a3 3 0 0 1 6 0v7z" fill="var(--brass-bright)" />
        </svg>
        Real Price
      </Link>
      <Link href="/" className="rp-nav-link">
        Dublin data
      </Link>
      {cta && (
        <a href="#report" className="rp-nav-cta">
          Get the report
        </a>
      )}
    </nav>
  );
}
