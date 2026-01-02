import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@startkit/ui", "@startkit/auth", "@startkit/database", "@startkit/config"],
};

export default nextConfig;
