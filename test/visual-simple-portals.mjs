// One-off visual smoke test for the simple-mode portals.
// Logs in as employee + site_person, captures desktop + mobile shots
// of each landing page, and writes them to test/_shots/*.png.
//
// Run with backend on :8000 and Vite dev on :5173.
//   node test/visual-simple-portals.mjs

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SHOTS = join(dirname(fileURLToPath(import.meta.url)), "_shots");
mkdirSync(SHOTS, { recursive: true });

const APP   = "http://localhost:5173";
const USERS = [
  { email: "employee.it@scm.com", password: "password", label: "employee" },
  { email: "site.ops@scm.com",    password: "password", label: "site"     },
];
const SIZES = [
  { name: "desktop", w: 1440, h: 900 },
  { name: "mobile",  w: 390,  h: 844 },
];

async function login(page, email, password) {
  await page.goto(`${APP}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  // Wait until we land on /app/* (any path). 30s is generous in case the
  // backend's throttle:5,1 forces the login api into a retry path.
  await page.waitForURL(/\/app\b/, { timeout: 30000 });
  // Wait for the network to settle so PR / GRN / eligible-pos fetches
  // complete before the screenshot fires. Capped at 3.5s if the page
  // stays chatty (notifications poll, etc).
  await page.waitForLoadState("networkidle", { timeout: 3500 }).catch(() => {});
  await page.waitForTimeout(800);
}

async function logout(page) {
  await page.evaluate(() => localStorage.removeItem("scm-auth"));
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const u of USERS) {
    for (const size of SIZES) {
      const ctx = await browser.newContext({
        viewport: { width: size.w, height: size.h },
      });
      const page = await ctx.newPage();
      const consoleErrors = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      page.on("pageerror", (err) => consoleErrors.push(`PAGEERR ${err.message}`));

      try {
        await login(page, u.email, u.password);
        const url = page.url();
        const file = join(SHOTS, `${u.label}-${size.name}.png`);
        await page.screenshot({ path: file, fullPage: true });
        results.push({
          user: u.label,
          size: size.name,
          url,
          file,
          errors: consoleErrors,
        });
      } catch (err) {
        results.push({
          user: u.label,
          size: size.name,
          error: err.message,
          consoleErrors,
        });
      }
      await logout(page);
      await ctx.close();
      // Throttle gap — login is rate-limited at 5/min per IP.
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  await browser.close();

  // Compact report
  for (const r of results) {
    if (r.error) {
      console.log(`✗ ${r.user} ${r.size} — ${r.error}`);
    } else {
      console.log(`✓ ${r.user} ${r.size} → ${r.url}`);
      console.log(`  shot: ${r.file}`);
      if (r.errors.length) {
        console.log(`  console errors (${r.errors.length}):`);
        for (const e of r.errors.slice(0, 5)) console.log(`    · ${e}`);
      }
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
