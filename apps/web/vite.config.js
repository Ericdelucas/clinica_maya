import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  base: './',
  build: {
    // Render publica a pasta dist na raiz do repositório
    outDir: path.resolve(__dirname, '../../dist'),
    emptyOutDir: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico,png,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        clientsClaim: true,
        skipWaiting: true,
      },
      manifest: {
        name: 'Clínica Maya',
        short_name: 'Clínica Maya',
        description: 'Plataforma fisioterapêutica interativa',
        theme_color: '#2563eb',
        background_color: '#f4f8fc',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: './',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
  },
});
