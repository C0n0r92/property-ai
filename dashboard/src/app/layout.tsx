import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "Irish Property Data | Property Intelligence & Market Insights",
  description: "Know what Irish properties are really worth. Explore 40,000+ sold properties with AI-powered price insights and market predictions.",
  metadataBase: new URL('https://irishpropertydata.com'),
  alternates: {
    canonical: '/',
  },
  keywords: [
    'Dublin property', 'house prices Dublin', 'property prices Ireland', 'sold house prices', 
    'Dublin real estate', 'property market Dublin', 'Dublin property map', 'Dublin house prices 2025',
    'property sold prices Dublin', 'Dublin property search', 'Dublin property values', 
    'property price check Dublin', 'Dublin property data', 'Ireland property prices',
    'what did house sell for Dublin', 'Dublin rental prices', 'Dublin property listings',
    'rental yield Dublin', 'property investment Dublin'
  ],
  authors: [{ name: 'Irish Property Data' }],
  creator: 'Irish Property Data',
  openGraph: {
    type: 'website',
    locale: 'en_IE',
    url: 'https://irishpropertydata.com',
    siteName: 'Irish Property Data',
    title: 'Irish Property Data | Property Intelligence & Market Insights',
    description: 'Know what Irish properties are really worth. Explore 40,000+ sold properties with AI-powered price insights and market predictions.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Irish Property Data | Property Intelligence & Market Insights',
    description: 'Know what Irish properties are really worth. Explore 40,000+ sold properties with AI-powered price insights.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Irish Property Data",
              "description": "Irish Property Intelligence - Explore 43,000+ sold properties with price insights and market predictions",
              "url": "https://irishpropertydata.com",
              "applicationCategory": "RealEstateApplication",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "EUR"
              },
              "areaServed": {
                "@type": "City",
                "name": "Dublin",
                "containedInPlace": {
                  "@type": "Country",
                  "name": "Ireland"
                }
              },
              "creator": {
                "@type": "Organization",
                "name": "Irish Property Data"
              }
            })
          }}
        />
      </head>
      <body className="antialiased min-h-screen">
        <Providers>
          <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-xl">
            <div className="max-w-6xl mx-auto px-4">
              <div className="flex justify-between items-center h-16">
                <Link href="/" className="flex items-center gap-3 group">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 via-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-cyan-500/25 group-hover:shadow-cyan-500/40 transition-shadow">
                    IPD
                  </div>
                  <div className="hidden sm:flex flex-col">
                    <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                      Irish Property Data
                    </span>
                    <span className="text-[10px] text-gray-500 -mt-1 tracking-wider uppercase">Market Intelligence</span>
                  </div>
                </Link>
                
                <div className="flex items-center gap-1">
                  <Link 
                    href="/map" 
                    className="px-4 py-2 rounded-lg text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors font-medium"
                  >
                    Map
                  </Link>
                  <Link 
                    href="/areas" 
                    className="px-4 py-2 rounded-lg text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors font-medium"
                  >
                    Areas
                  </Link>
                  <Link 
                    href="/insights" 
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 text-emerald-400 hover:from-emerald-500/20 hover:to-cyan-500/20 transition-colors font-medium flex items-center gap-2"
                  >
                    <span>Insights</span>
                    <span className="text-[10px] bg-gradient-to-r from-amber-400 to-orange-500 text-black px-1.5 py-0.5 rounded-full font-bold">PRO</span>
                  </Link>
                </div>
              </div>
            </div>
          </nav>
          <main>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
