import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@prisma/client"],
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
