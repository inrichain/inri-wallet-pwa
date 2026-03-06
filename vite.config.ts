import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/inri-wallet-pwa/',

  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'INRI Wallet',
        short_name: 'INRI Wallet',
        start_url: '/',
        display: 'standalone',
        background_color: '#0b0b0f',
        theme_color: '#4e8cff',
        icons: [
          {
            src: '/favicon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/favicon.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})
