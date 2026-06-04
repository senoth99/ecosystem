import type { NextConfig } from "next";
import { buildDevRewrites } from "./src/lib/dev-app-proxy";

const authUrl = process.env.AUTH_SERVICE_URL ?? "http://127.0.0.1:4001";
const proxyApps = process.env.ECOSYSTEM_PROXY_APPS !== "false";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    if (!proxyApps) {
      return [{ source: "/api/eco/:path*", destination: `${authUrl}/:path*` }];
    }
    return buildDevRewrites(authUrl);
  }
};

export default nextConfig;
