/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
  async redirects() {
    return [
      // /dsar's homepage was promoted to root "/" — keep old links/bookmarks working.
      { source: '/dsar', destination: '/', permanent: false },
    ];
  },
};

module.exports = nextConfig;
