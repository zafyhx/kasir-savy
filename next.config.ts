import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  // Precache seluruh app shell (JS/CSS/manifest) — tidak ada lagi /api/*
  // yang butuh network-first, jadi app harus utuh berfungsi offline.
  workboxOptions: {
    skipWaiting: true,
    runtimeCaching: [
      {
        urlPattern: /.*/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "kasir-savy-runtime",
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withPWA(nextConfig);
