/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Production builds get a strict Content-Security-Policy as a <meta> tag, because DoNext is
 * served as static files (no server of ours to send security headers). Dev is left alone
 * so hot reloading keeps working.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const cspMeta = (): Plugin => ({
  name: 'donext-csp',
  apply: 'build',
  transformIndexHtml: (html) => html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_BASE_PATH || '/';

  return {
    base,
    plugins: [
      react(),
      cspMeta(),
      VitePWA({
        // Registered manually in main.tsx so it can be skipped inside Capacitor native shells.
        injectRegister: null,
        registerType: 'autoUpdate',
        includeAssets: ['icons/favicon-48.png', 'icons/apple-touch-icon.png'],
        manifest: {
          name: 'DoNext',
          short_name: 'DoNext',
          description: 'The to-do list you can talk to. Everything stays on your device.',
          theme_color: '#012360',
          background_color: '#012360',
          display: 'standalone',
          orientation: 'any',
          start_url: base,
          scope: base,
          categories: ['productivity'],
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
          navigateFallback: `${base}index.html`,
        },
      }),
    ],
    server: { port: 5173 },
    test: {
      environment: 'jsdom',
      setupFiles: ['src/test/setup.ts'],
      css: false,
    },
  };
});
