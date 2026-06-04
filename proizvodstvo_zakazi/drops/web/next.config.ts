import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Минимальный артефакт для Docker / VPS без полного node_modules (см. deploy/README.md)
  output: "standalone",
};

export default nextConfig;
