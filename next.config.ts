import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
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
