// Pin-point responsive sweep for the simple-mode (employee / site_person)
// layout. Captures the topbar + hero at 5 widths spanning iPhone SE through
// desktop. Reports any element that overflows the viewport so we know where
// the cramping is.
//
//   node test/responsive-simple-mode.mjs

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const SHOTS = "test/_shots/simple";
mkdirSync(SHOTS, { recursive: true });

const APP = "http://localhost:5173";

const WIDTHS = [
  { name: "320",  w: 320,  h: 900 },  // iPhone SE old
  { name: "375",  w: 375,  h: 900 },  // iPhone 12/13 mini
  { name: "414",  w: 414,  h: 900 },  // iPhone Plus
  { name: "640",  w: 640,  h: 900 },  // sm breakpoint
  { name: "768",  w: 768,  h: 900 },  // md breakpoint
  { name: "1024", w: 1024, h: 900 },  // lg
  { name: "1440", w: 1440, h: 900 },  // desktop
];

const USERS = [
  { email: "employee.it@scm.com", label: "employee", landing: "/app/purchase-requests" },
  { email: "site.ops@scm.com",    label: "site",     landing: "/app/grn" },
];

async function login(page, email) {
  await page.goto(`${APP}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', "password");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/app\b/, { timeout: 30000 });
  await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(800);
}

async function audit(page) {
  return page.evaluate(() => {
    const viewW = document.documentElement.clientWidth;
    const scrollW = document.documentElement.scrollWidth;
    const overflowingEls = [];
    if (scrollW > viewW + 1) {
      for (const el of document.querySelectorAll("header, header *, main > section *, .scm-chrome *")) {
        const r = el.getBoundingClientRect();
        if (r.right > viewW + 1 && r.width > 0 && r.width < viewW * 3) {
          overflowingEls.push({
            tag: el.tagName,
            cls: typeof el.className === "string" ? el.className.slice(0, 60) : "",
            right: Math.round(r.right),
            width: Math.round(r.width),
          });
        }
      }
    }
    return { viewW, scrollW, overflow: scrollW > viewW + 1, els: overflowingEls.slice(0, 5) };
  });
}

const browser = await chromium.launch({ headless: true });
const issues = [];

for (const user of USERS) {
  for (const vp of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const page = await ctx.newPage();
    try {
      await login(page, user.email);
      const result = await audit(page);
      const fname = `${user.label}-${vp.name}.png`;
      await page.screenshot({ path: join(SHOTS, fname), fullPage: false });
      if (result.overflow) {
        issues.push({ user: user.label, width: vp.name, viewport: vp.w, scrollW: result.scrollW, els: result.els });
      }
      console.log(
        result.overflow
          ? `✗ ${user.label.padEnd(10)} ${vp.name.padEnd(5)} scrollW=${result.scrollW} > view=${vp.w} (${result.els.length} offender${result.els.length === 1 ? "" : "s"})`
          : `✓ ${user.label.padEnd(10)} ${vp.name.padEnd(5)} clean`,
      );
    } catch (err) {
      console.log(`! ${user.label.padEnd(10)} ${vp.name.padEnd(5)} login fail: ${err.message.slice(0, 60)}`);
    }
    await ctx.close();
    await new Promise((r) => setTimeout(r, 350));
  }
  await new Promise((r) => setTimeout(r, 13_000)); // throttle dodge
}

await browser.close();

if (issues.length) {
  console.log("\n=== DETAILS ===");
  for (const i of issues) {
    console.log(`\n[${i.user} @ ${i.width}] viewport=${i.viewport} scroll=${i.scrollW}`);
    for (const e of i.els) {
      console.log(`  <${e.tag}> right=${e.right} width=${e.width}  cls="${e.cls}"`);
    }
  }
}
console.log(`\nShots: ${SHOTS}/`);
