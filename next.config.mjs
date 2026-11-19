/** @type {import('next').NextConfig} */
const isGhPages = process.env.DEPLOY_TARGET === 'gh-pages';

const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  ...(isGhPages ? {
    output: 'export',
    basePath: '/nafas-iraq',
    assetPrefix: '/nafas-iraq/',
  } : {}),
};

export default nextConfig;
