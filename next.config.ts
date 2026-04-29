import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // All blob images are served through /api/blobs/{store}/{key} (relative URLs),
  // so no remotePatterns entry is required for file storage.
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
