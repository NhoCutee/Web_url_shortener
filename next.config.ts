import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.watchOptions = {
      ignored: ["**/node_modules/**", "**/.git/**", "**/.bin/**", "**/.next/**"],
    };
    return config;
  },
};

export default nextConfig;