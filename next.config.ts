import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  /**
   * pdfjs-dist: fake worker loads pdf.worker.mjs via dynamic import (not traced by default).
   * Include the worker file in standalone output for server-side PDF text extraction.
   */
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    ],
  },
  serverExternalPackages: [
    "@prisma/client",
    "@google-cloud/cloud-sql-connector",
    "@napi-rs/canvas",
    "pdf-parse",
    "tesseract.js",
    "@tesseract.js-data/eng",
    "openai",
  ],
  deploymentId: process.env.NEXT_DEPLOYMENT_ID || undefined,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "vehiclix.app",
      },
      {
        protocol: "https",
        hostname: "*.vehiclix.app",
      },
    ],
  },
};

export default nextConfig;
