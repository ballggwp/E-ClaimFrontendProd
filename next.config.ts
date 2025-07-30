import type { NextConfig } from "next";

const nextConfig = {
  // basePath: '/claim',
  assetPrefix: "/claim/",
  images: {
    path: '/claim/_next/image',
  },
  async rewrites() {
    return [
      {
        source: '/claimback/uploads/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads/:path*`
      },
    ]
  }
};
export default nextConfig;
