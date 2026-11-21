/** @type {import('next').NextConfig} */
const isGhPages = process.env.DEPLOY_TARGET === 'gh-pages';

const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: isGhPages ? '/nafas-iraq' : '',
  },
  ...(isGhPages ? {
    output: 'export',
    basePath: '/nafas-iraq',
    assetPrefix: '/nafas-iraq/',
  } : {}),
};

export default nextConfig;
