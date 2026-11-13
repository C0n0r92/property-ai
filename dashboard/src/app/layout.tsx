import type { Metadata, Viewport } from "next";
import "./globals.css";
import Analytics from "@/components/rp/Analytics";
import { jsonLd, SITE_NAME, SITE_URL } from "@/lib/site";

const DESCRIPTION =
  "What Dublin homes really sell for. Compare asking and sold prices for 47,000+ Dublin homes, see how far over asking each area goes, and read data-led market research.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Dublin Asking vs Sold Prices`,
    // Pages set their own title; the site name follows it
    template: `%s | ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  // No canonical here: each page sets its own, so none inherits the home page's
  openGraph: {
    type: "website",
    locale: "en_IE",
    siteName: SITE_NAME,
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbf7f2",
};

const SITE_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/icon`,
      email: "hello@irishpropertydata.com",
      areaServed: { "@type": "City", name: "Dublin" },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      inLanguage: "en-IE",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IE" data-scroll-behavior="smooth">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(SITE_DATA) }}
        />
        <main>{children}</main>
        <Analytics />
      </body>
    </html>
  );
}
