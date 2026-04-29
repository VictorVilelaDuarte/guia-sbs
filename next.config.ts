import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "edxrpmsfmmnfiuzdkbmw.supabase.co",
      },
    ],
  },
};

export default nextConfig;
