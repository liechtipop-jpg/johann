import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Cockpit',
        short_name: 'Cockpit',
        description: 'Schule, Lernen und Üben – alles lokal auf deinem Gerät.',
        lang: 'de-CH',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f7f5f1',
        theme_color: '#f7f5f1',
        categories: ['education', 'productivity'],
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Note erfassen', short_name: 'Note', url: '/?neu=note' },
          { name: 'Prüfung erfassen', short_name: 'Prüfung', url: '/?neu=pruefung' },
          { name: 'Aufgabe erfassen', short_name: 'Aufgabe', url: '/?neu=aufgabe' },
        ],
      },
      workbox: {
        // Nur lateinische Schriftschnitte vorab speichern; andere Schriftsysteme lädt der Browser bei Bedarf.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}', '**/*latin*.woff2'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
});
