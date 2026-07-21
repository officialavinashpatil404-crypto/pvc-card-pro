import type { NextConfig } from "next";

const nextConfig: any = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  outputFileTracingIncludes: {
    '/api/**/*': [
      './node_modules/@sparticuz/chromium/bin/**',
      './public/fonts/**/*'
    ],
  },
  transpilePackages: ['puppeteer', 'pdfjs-dist'],
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core', 'sharp'],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
