import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import { Navigation } from "@/components/Navigation";

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
          <Navigation />
          <main>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
