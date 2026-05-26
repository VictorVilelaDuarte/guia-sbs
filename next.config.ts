import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.247", "192.168.1.102"],
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
