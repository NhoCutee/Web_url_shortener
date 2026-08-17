import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "standalone" giup Docker image gon nhe hon khi build production
  // Khi dev (docker-compose), ta dung dev server nen khong can option nay
  // output: "standalone",
};

export default nextConfig;
