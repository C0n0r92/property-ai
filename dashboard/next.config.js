/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable Turbopack to avoid compatibility issues with Tailwind CSS v4
  experimental: {
    turbo: false,
  },
};

module.exports = nextConfig;