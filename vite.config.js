import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ command }) => {
  // On GitHub Pages the site lives at https://<user>.github.io/<repo>/, so the
  // built assets need that prefix. The dev server must stay on the root
  // instead: a base path there would leave http://localhost:5173/ blank.
  // The deploy workflow sets BASE_PATH from the repository name; the fallback
  // only matters for a local `npm run build` followed by `npm run preview`.
  const base = command === 'build' ? (process.env.BASE_PATH || '/working-hours/') : '/'

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['apple-touch-icon.png', 'favicon.svg'],
        manifest: {
          name: 'Ore lavorate',
          short_name: 'Ore',
          description: 'Registro delle sessioni di lavoro e calcolo dei compensi',
          start_url: base,
          scope: base,
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#f6f5f2',
          theme_color: '#1c1b19',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}']
        }
      })
    ]
  }
})
