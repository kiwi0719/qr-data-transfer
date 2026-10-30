import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @raptorqr/core publishes TypeScript sources.
  transpilePackages: ["@raptorqr/core"],
};

export default nextConfig;
