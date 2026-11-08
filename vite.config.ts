import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { Plugin } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

/**
 * Schreibt dist/_headers (Cloudflare Pages / Netlify) mit strenger Content-Security-Policy.
 * Der Hash des kleinen Inline-Skripts (Theme vor dem ersten Rendern) wird beim Build berechnet.
 */
function securityHeaders(): Plugin {
  return {
    name: 'flimmer-security-headers',
    apply: 'build',
    closeBundle() {
      const html = readFileSync('dist/index.html', 'utf8');
      const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
        (m) => `'sha256-${createHash('sha256').update(m[1] ?? '').digest('base64')}'`,
      );
      const csp = [
        "default-src 'self'",
        `script-src 'self' ${hashes.join(' ')}`,
        "style-src 'self' 'unsafe-inline'",
        // Senderlogos nur, wenn der Nutzer sie einschaltet (Wikimedia Commons)
        "img-src 'self' data: blob: https://commons.wikimedia.org https://upload.wikimedia.org",
        "connect-src 'self'",
        "manifest-src 'self'",
        "worker-src 'self'",
        "base-uri 'self'",
        "form-action 'none'",
        "frame-ancestors 'none'",
        "object-src 'none'",
      ].join('; ');
      const headers = `/*
  Content-Security-Policy: ${csp}
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
  Cross-Origin-Opener-Policy: same-origin

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/data/*
  Cache-Control: public, max-age=0, must-revalidate
  X-Robots-Tag: noindex

/sw.js
  Cache-Control: no-cache

/index.html
  Cache-Control: no-cache
`;
      writeFileSync('dist/_headers', headers);
    },
  };
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    target: 'es2022',
    cssMinify: true,
    reportCompressedSize: true,
  },
  plugins: [
    preact(),
    securityHeaders(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Flimmer – TV-Programm',
        short_name: 'Flimmer',
        description: 'Das deutsche TV-Programm: werbefrei, schnell, ohne Tracking.',
        lang: 'de',
        dir: 'ltr',
        start_url: '/#/jetzt',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'any',
        background_color: '#15130f',
        theme_color: '#15130f',
        categories: ['entertainment', 'lifestyle', 'utilities'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: 'Jetzt im TV',
            short_name: 'Jetzt',
            url: '/#/jetzt',
            icons: [{ src: '/icons/shortcut-now.png', sizes: '96x96', type: 'image/png' }],
          },
          {
            name: 'Heute 20:15',
            short_name: '20:15',
            url: '/#/jetzt?zeit=2015',
            icons: [{ src: '/icons/shortcut-prime.png', sizes: '96x96', type: 'image/png' }],
          },
          {
            name: 'Suche',
            short_name: 'Suche',
            url: '/#/suche',
            icons: [{ src: '/icons/shortcut-search.png', sizes: '96x96', type: 'image/png' }],
          },
        ],
        screenshots: [
          { src: '/screens/mobile-now.png', sizes: '780x1688', type: 'image/png', form_factor: 'narrow', label: 'Jetzt im TV' },
          { src: '/screens/desktop-grid.png', sizes: '1440x900', type: 'image/png', form_factor: 'wide', label: 'Programmraster' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        globIgnores: ['**/data/**', 'screens/**'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/data\//, /^\/api\//],
        cleanupOutdatedCaches: true,
        // Erstinstallation: Seite sofort übernehmen, damit schon der erste Besuch offline-fähig wird.
        // Updates warten weiterhin auf den Klick auf "Aktualisieren" (kein skipWaiting).
        clientsClaim: true,
        importScripts: ['/sw-extra.js'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname === '/data/index.json',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'flimmer-index',
              matchOptions: { ignoreVary: true },
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 2 },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/data/days/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'flimmer-days',
              matchOptions: { ignoreVary: true },
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 30, maxAgeSeconds: 16 * 24 * 3600 },
            },
          },
          {
            // Senderlogos (opt-in) für offline vorhalten
            urlPattern: ({ url }) => url.hostname === 'upload.wikimedia.org' || url.hostname === 'commons.wikimedia.org',
            handler: 'CacheFirst',
            options: {
              cacheName: 'flimmer-logos',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 24 * 3600 },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/data/details/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'flimmer-details',
              matchOptions: { ignoreVary: true },
              expiration: { maxEntries: 30, maxAgeSeconds: 16 * 24 * 3600 },
            },
          },
        ],
      },
    }),
  ],
});
