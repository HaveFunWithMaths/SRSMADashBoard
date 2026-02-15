import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // @ts-ignore
    outputFileTracingIncludes: {
      '/api/**/*': ['./Data/**/*'],
      '/dashboard/**/*': ['./Data/**/*'],
      '/teacher/**/*': ['./Data/**/*'],
    },
  },
};

export default nextConfig;
