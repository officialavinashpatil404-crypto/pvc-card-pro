import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from '@vercel/analytics/next';
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    template: '%s | Rapid PVC',
    default: 'Rapid PVC - Instant PVC Card Generation for CSCs',
  },
  description: 'The most advanced and secure PVC card generation tool for CSC operators. Instantly extract and generate print-ready Aadhaar, PAN, and Ayushman PVC cards.',
  keywords: ['PVC Card', 'CSC', 'Aadhaar Print', 'PAN Print', 'Ayushman PVC', 'e-Shram PVC', 'High Resolution PVC'],
  authors: [{ name: 'Rapid PVC' }],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Rapid PVC - Instant PVC Card Generation',
    description: 'Secure, fast, and high-quality PVC card generation from PDFs. Zero-retention policy for ultimate citizen privacy.',
    type: 'website',
    locale: 'en_IN',
    siteName: 'Rapid PVC',
  },
};

import NextTopLoader from 'nextjs-toploader';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`} suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body>
        <NextTopLoader color="#059669" showSpinner={false} />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
