/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type HtmlTagDescriptor, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_BASE_PATH || '/';

  // Link previews (LinkedIn, X, Slack…) need absolute URLs, so the tags are only added
  // when the site's public address is known, e.g. VITE_SITE_URL=https://example.com/donext
  const siteUrl = env.VITE_SITE_URL?.replace(/\/+$/, '');
  const title = 'DoNext: the to-do list you can talk to';
  const description =
    'Free, open-source task app: voice input, smart suggestions, reminders, shared lists and offline sync. Try the live demo, no sign-up.';
  const meta = (attr: 'property' | 'name', key: string, content: string): HtmlTagDescriptor => ({
    tag: 'meta',
    attrs: { [attr]: key, content },
    injectTo: 'head',
  });
  const image = `${siteUrl}/og-image.png`;
  const socialTags: Plugin = {
    name: 'social-preview-tags',
    transformIndexHtml: () =>
      siteUrl
        ? [
            meta('property', 'og:type', 'website'),
            meta('property', 'og:site_name', 'DoNext'),
            meta('property', 'og:title', title),
            meta('property', 'og:description', description),
            meta('property', 'og:url', `${siteUrl}/`),
            meta('property', 'og:image', image),
            meta('property', 'og:image:width', '1200'),
            meta('property', 'og:image:height', '630'),
            meta('property', 'og:image:alt', 'DoNext on a phone and a computer'),
            meta('name', 'twitter:card', 'summary_large_image'),
            meta('name', 'twitter:title', title),
            meta('name', 'twitter:description', description),
            meta('name', 'twitter:image', image),
          ]
        : [],
  };

  return {
    base,
    plugins: [
      react(),
      socialTags,
      VitePWA({
        // Registered manually in main.tsx so it can be skipped inside Capacitor native shells.
        injectRegister: null,
        registerType: 'autoUpdate',
        includeAssets: ['icons/favicon-48.png', 'icons/apple-touch-icon.png'],
        manifest: {
          name: 'DoNext',
          short_name: 'DoNext',
          description: 'Plan, capture and finish your tasks — online or offline.',
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
          navigateFallbackDenylist: [/^\/api\//],
          // API data is cached in IndexedDB by the app itself, never by the service worker.
          runtimeCaching: [{ urlPattern: /\/api\//, handler: 'NetworkOnly' }],
        },
      }),
    ],
    server: {
      port: 5173,
      proxy: { '/api': { target: env.VITE_DEV_API_PROXY || 'http://localhost:4000', changeOrigin: true } },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['src/test/setup.ts'],
      css: false,
    },
  };
});
