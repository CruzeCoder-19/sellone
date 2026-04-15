import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "example-blobs.netlify.app",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
