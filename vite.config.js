import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Auto-register the service worker on page load and keep it
      // up to date (workbox handles the swap dance).
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "favicon-32.png",
        "apple-touch-icon.png",
        "brand-icon.svg",
      ],
      // ── Web App Manifest ────────────────────────────────────────────
      manifest: {
        name: "Suppliers First",
        short_name: "Suppliers",
        description:
          "Procurement command centre — purchase requests, RFQs, POs, goods receipts and payments for the Meka Group.",
        theme_color: "#dc2626",
        background_color: "#0a0a0e",
        display: "standalone",
        orientation: "portrait",
        start_url: "/app",
        scope: "/",
        lang: "en-IN",
        categories: ["business", "productivity"],
        icons: [
          { src: "/pwa-192.png",          sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/pwa-512.png",          sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/pwa-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        // App shortcuts surface in the launcher long-press menu on mobile
        // OSes that support them — quick jumps into the most common
        // landing pages for the procurement workflow.
        shortcuts: [
          {
            name: "New Request",
            short_name: "New PR",
            description: "Raise a fresh purchase request",
            url: "/app/purchase-requests/new",
            icons: [{ src: "/pwa-192.png", sizes: "192x192" }],
          },
          {
            name: "Goods Receipts",
            short_name: "Receipts",
            description: "Log incoming shipments",
            url: "/app/grn",
            icons: [{ src: "/pwa-192.png", sizes: "192x192" }],
          },
          {
            name: "Payments",
            short_name: "Payments",
            description: "Vendor payment dashboard",
            url: "/app/payments",
            icons: [{ src: "/pwa-192.png", sizes: "192x192" }],
          },
        ],
      },
      // ── Workbox: runtime caching strategy ────────────────────────────
      workbox: {
        // Pre-cache everything in dist/* on install (build assets).
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "/index.html",
        // Don't intercept API or storage requests — they're stateful and
        // the Zustand TTL/dedup layer we shipped earlier already handles
        // app-level caching.
        navigateFallbackDenylist: [/^\/api\//, /^\/storage\//],
        runtimeCaching: [
          {
            // Google Fonts CSS — short, mutable, stale-while-revalidate.
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "gfonts-css",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            // Google Fonts font files — long, immutable, cache-first.
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gfonts-files",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        // Off in dev — the SW would cache hot-reloaded chunks aggressively
        // and break refreshes. Flip to true to test the manifest / install
        // prompt locally.
        enabled: false,
      },
    }),
  ],
});
