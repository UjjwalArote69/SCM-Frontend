// Rasterize the brand SVGs into the PNG sizes required by the PWA spec
// + iOS apple-touch-icon. One-shot tooling — re-run only when the brand
// changes.
//
//   node test/generate-pwa-icons.mjs
//
// Drops PNGs into public/.

import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pub = join(root, "public");

const TARGETS = [
  { svg: "brand-icon.svg",          out: "pwa-192.png",          size: 192 },
  { svg: "brand-icon.svg",          out: "pwa-512.png",          size: 512 },
  { svg: "brand-icon-maskable.svg", out: "pwa-maskable-192.png", size: 192 },
  { svg: "brand-icon-maskable.svg", out: "pwa-maskable-512.png", size: 512 },
  { svg: "brand-icon.svg",          out: "apple-touch-icon.png", size: 180 },
  { svg: "brand-icon.svg",          out: "favicon-32.png",       size: 32  },
];

const browser = await chromium.launch();

for (const { svg, out, size } of TARGETS) {
  const svgText = readFileSync(join(pub, svg), "utf-8");
  const html = `<!DOCTYPE html><html><head><style>
    html, body { margin: 0; padding: 0; background: transparent; }
    body { width: ${size}px; height: ${size}px; }
    svg { width: 100%; height: 100%; display: block; }
  </style></head><body>${svgText}</body></html>`;

  const ctx = await browser.newContext({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.setContent(html, { waitUntil: "domcontentloaded" });
  const buf = await page.screenshot({
    type: "png",
    clip: { x: 0, y: 0, width: size, height: size },
    omitBackground: true,
  });
  writeFileSync(join(pub, out), buf);
  await ctx.close();
  console.log(`✓ ${out} (${size}×${size})`);
}

await browser.close();
console.log("\nDone. PNGs written to public/.");
