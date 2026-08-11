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
      './public/fonts/**',
      './public/fonts/*',
      './node_modules/pdfjs-dist/**'
    ],
  },
  transpilePackages: ['puppeteer'],
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core', 'sharp', 'pdfjs-dist', 'pdf-parse'],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
