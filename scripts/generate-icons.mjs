#!/usr/bin/env node
/**
 * Generates DewanTech To-Do app icons as PNGs with no image dependencies.
 *   client/public/icons/*      → PWA + favicon + apple-touch-icon
 *   client/assets/*            → source images for `npx @capacitor/assets generate` (iOS/Android icons & splash)
 * Replace these with your designer's artwork any time; keep the same file names and sizes.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BRAND = [0x4f, 0x46, 0xe5];
const DARK_BG = [0x0f, 0x17, 0x2a];
const WHITE = [0xff, 0xff, 0xff];

// ---------- PNG encoding ----------
const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
function encodePNG(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- drawing (4x4 supersampled) ----------
const distToSegment = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};
const inRoundedRect = (x, y, x0, y0, w, h, r) => {
  if (x < x0 || y < y0 || x > x0 + w || y > y0 + h) return false;
  const cx = Math.max(x0 + r, Math.min(x, x0 + w - r));
  const cy = Math.max(y0 + r, Math.min(y, y0 + h - r));
  return Math.hypot(x - cx, y - cy) <= r;
};

/**
 * @param size     output pixels
 * @param opts.bg  page background (null = transparent)
 * @param opts.tile fraction of the canvas covered by the brand tile (1 = full bleed)
 * @param opts.radius tile corner radius as a fraction of the tile
 */
function render(size, { bg = null, tile = 1, radius = 0.22, tileColor = BRAND } = {}) {
  const S = 4;
  const out = Buffer.alloc(size * size * 4);
  const t = tile * size;
  const t0 = (size - t) / 2;
  // check mark in tile coordinates (matches the SVG logo: M9 16.5 l4.5 4.5 L23 11.5 on a 32 grid)
  const pts = [
    [9 / 32, 16.5 / 32],
    [13.5 / 32, 21 / 32],
    [23 / 32, 11.5 / 32],
  ].map(([x, y]) => [t0 + x * t, t0 + y * t]);
  const stroke = (3.2 / 32) * t * 0.5;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const px = x + (sx + 0.5) / S;
          const py = y + (sy + 0.5) / S;
          let c = bg;
          if (inRoundedRect(px, py, t0, t0, t, t, radius * t)) {
            c = tileColor;
            const d = Math.min(distToSegment(px, py, ...pts[0], ...pts[1]), distToSegment(px, py, ...pts[1], ...pts[2]));
            if (d <= stroke) c = WHITE;
          }
          if (c) {
            r += c[0];
            g += c[1];
            b += c[2];
            a += 255;
          }
        }
      }
      const n = S * S;
      const i = (y * size + x) * 4;
      // un-premultiply so antialiased edges keep the right colour
      out[i] = a ? Math.round((r * 255) / a) : 0;
      out[i + 1] = a ? Math.round((g * 255) / a) : 0;
      out[i + 2] = a ? Math.round((b * 255) / a) : 0;
      out[i + 3] = Math.round(a / n);
    }
  }
  return encodePNG(size, out);
}

function write(rel, data) {
  const file = join(root, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, data);
  console.log('wrote', rel);
}

// PWA / web
write('client/public/icons/icon-192.png', render(192));
write('client/public/icons/icon-512.png', render(512));
// Maskable: full-bleed background, logo within the 80% safe zone
write('client/public/icons/maskable-512.png', render(512, { bg: BRAND, tile: 0.8, radius: 0 }));
// iOS home screen: opaque, square (iOS applies its own mask)
write('client/public/icons/apple-touch-icon.png', render(180, { bg: BRAND, tile: 1, radius: 0 }));
write(
  'client/public/icons/favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#4f46e5"/><path d="M9 16.5l4.5 4.5L23 11.5" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>\n`,
);

// Capacitor asset sources (consumed by `npx @capacitor/assets generate`)
write('client/assets/icon-only.png', render(1024, { bg: BRAND, tile: 1, radius: 0 }));
write('client/assets/icon-foreground.png', render(1024, { tile: 0.62, radius: 0.22 }));
write('client/assets/icon-background.png', render(1024, { bg: BRAND, tile: 0 }));
write('client/assets/splash.png', render(2732, { bg: WHITE, tile: 0.18 }));
write('client/assets/splash-dark.png', render(2732, { bg: DARK_BG, tile: 0.18 }));
