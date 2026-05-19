import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
mkdirSync("test/_shots", { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto("http://localhost:5173/", { waitUntil: "domcontentloaded" });
const t0 = Date.now();
for (const target of [400, 800, 1200, 1800, 2400]) {
  while (Date.now() - t0 < target) await page.waitForTimeout(20);
  await page.screenshot({ path: `test/_shots/splash-${target}ms.png` });
}
await browser.close();
console.log("✓ done");
