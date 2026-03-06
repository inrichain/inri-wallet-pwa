import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/inri-wallet-pwa/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: [
        "favicon.png",
        "apple-touch-icon.png",
        "pwa-192.png",
        "pwa-512.png",
        "token-inri.png",
        "token-iusd.png",
        "token-winri.png",
        "token-dnr.png"
      ],
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"]
      },
      manifest: {
        id: "/inri-wallet-pwa/",
        name: "INRI Wallet",
        short_name: "INRI Wallet",
        description: "Official INRI Wallet PWA",
        theme_color: "#0b0b0f",
        background_color: "#0b0b0f",
        display: "standalone",
        orientation: "portrait",
        scope: "/inri-wallet-pwa/",
        start_url: "/inri-wallet-pwa/",
        icons: [
          {
            src: "/inri-wallet-pwa/pwa-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/inri-wallet-pwa/pwa-512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "/inri-wallet-pwa/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/inri-wallet-pwa/apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png"
          }
        ]
      }
    })
  ]
});
