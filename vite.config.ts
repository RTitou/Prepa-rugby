import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Sur GitHub Pages l'appli vit dans /<nom-du-dépôt>/ : BASE_PATH=/<nom-du-dépôt>/ (repli « / »).
function normalizeBase(value: string | undefined): string {
  const raw = (value ?? '').trim()
  if (raw === '' || raw === '/') return '/'
  return `/${raw.replace(/^\/+|\/+$/g, '')}/`
}

const base = normalizeBase(process.env.BASE_PATH)

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'icons/apple-touch-icon.png', 'robots.txt'],
      manifest: {
        name: 'Prépa Rugby',
        short_name: 'Prépa Rugby',
        description: 'Ta préparation physique de rugby, adaptée à ta charge réelle. Fonctionne hors connexion.',
        lang: 'fr',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        background_color: '#0a0a0a',
        theme_color: '#0a0a0a',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,txt,woff2}'],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    css: false,
    testTimeout: 20000,
    alias: { 'virtual:pwa-register': fileURLToPath(new URL('./tests/stubs/pwa-register.ts', import.meta.url)) },
  },
})
