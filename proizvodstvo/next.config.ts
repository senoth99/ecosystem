import type { NextConfig } from "next";

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.cashercollection.com" },
      { protocol: "https", hostname: "cashercollection.com" },
    ],
  },
};

export default nextConfig;
