import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent @vercel/nft from packing local private blobs into every traced serverless
  // function (LocalStorageProvider references storage/documents via fs).
  outputFileTracingExcludes: {
    "/*": [
      "./storage/**/*",
      "./prisma/migrations_legacy_20260329/**/*",
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  serverExternalPackages: [
    "@prisma/client",
    "@google-cloud/cloud-sql-connector",
    "tesseract.js",
    "@tesseract.js-data/eng",
    "openai",
    "pdf-parse",
    "sharp",
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
