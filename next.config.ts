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
  transpilePackages: ['puppeteer'],
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core', 'sharp', 'pdfjs-dist', 'pdf-parse'],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
