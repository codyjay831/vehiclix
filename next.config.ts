import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
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
