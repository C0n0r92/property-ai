import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Trace from this folder so the standalone server lands at a fixed path
  outputFileTracingRoot: __dirname,
  // pg is a server-only native-style dependency: load it at runtime, do not bundle
  serverExternalPackages: ['pg'],
  compress: true, // Enable gzip compression for API responses
  // The raw datasets sit in /public so server code can read them from disk.
  // They are the product, so they must never be downloadable: send any
  // request for them to the not-found page before public files are served.
  // The site used to have many sections; it is now the price check and the
  // blog. Old addresses are kept alive so links and search rankings carry over.
  async redirects() {
    const toHome = [
      '/map', '/areas', '/insights', '/planning', '/amenities', '/login', '/alerts',
      '/mortgage-calc', '/mortgage-scenarios', '/property', '/tools',
    ];
    return [
      // The price check moved from /real-price to the home page (query kept)
      { source: '/real-price', destination: '/', permanent: true },
      // An area page opens the check for that area
      { source: '/areas/dublin-:n(\\d{1,2}[wW]?)', destination: '/?area=d:n', permanent: true },
      { source: '/areas/dublin:n(\\d{1,2}[wW]?)', destination: '/?area=d:n', permanent: true },
      { source: '/areas/:slug', destination: '/?area=:slug', permanent: true },
      { source: '/research', destination: '/blog', permanent: true },
      { source: '/research/:path*', destination: '/blog', permanent: true },
      { source: '/insights', destination: '/blog', permanent: true },
      ...toHome.flatMap((path) => [
        { source: path, destination: '/', permanent: true },
        { source: `${path}/:path*`, destination: '/', permanent: true },
      ]),
      { source: '/auth/:path*', destination: '/', permanent: true },
    ];
  },
  async rewrites() {
    const privateFiles = ['/data.json', '/data-:date.json', '/ppr-dublin.json', '/properties.json', '/listings.json'];
    return {
      beforeFiles: privateFiles.map((source) => ({ source, destination: '/404' })),
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;