import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  compress: true, // Enable gzip compression for API responses
  devIndicators: false, // Disable development indicators like "2 Issues" badge
};

export default nextConfig;