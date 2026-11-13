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