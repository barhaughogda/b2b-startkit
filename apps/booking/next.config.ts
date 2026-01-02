import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ["@startkit/ui", "@startkit/auth", "@startkit/database", "@startkit/config"],
};

export default nextConfig;
