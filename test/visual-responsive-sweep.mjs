// Full responsive sweep — captures the pages we haven't visually
// verified yet at 390px (mobile) and 1440px (desktop).
//
// Reports any horizontal overflow (a strong signal that something
// punches outside the viewport) and any console errors that fired
// during the capture.
//
// Usage: node test/visual-responsive-sweep.mjs

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SHOTS = join(dirname(fileURLToPath(import.meta.url)), "_shots");
mkdirSync(SHOTS, { recursive: true });

const APP = "http://localhost:5173";

// Login → page combos. Each spec lists the email it should be captured as
// plus the URLs to walk. Paths default to /app prefix unless absolute.
const SPECS = [
  {
    label: "admin",
    email: "admin@scm.com",
    pages: [
      ["/admin",                    "admin-home"],
      ["/admin/roles",              "admin-roles-and-permissions"],
      ["/admin/approvals",          "admin-approval-rules"],
      ["/admin/settings",           "admin-settings"],
      ["/admin/reports",            "admin-reports"],
      ["/admin/users",              "admin-users"],
      ["/admin/items",              "admin-items"],
      ["/admin/vendors",            "admin-vendors"],
      ["/admin/departments",        "admin-departments"],
      ["/admin/categories",         "admin-categories"],
      ["/admin/companies",          "admin-companies"],
      ["/admin/projects",           "admin-projects"],
      ["/admin/inventory",          "admin-inventory"],
      ["/admin/invoices",           "admin-invoices"],
      ["/admin/payments",           "admin-payments"],
      ["/admin/payments/awaiting",  "admin-payments-awaiting"],
      ["/admin/payments/outstanding","admin-payments-outstanding"],
    ],
  },
  {
    label: "admin-create",
    email: "admin@scm.com",
    pages: [
      ["/app/purchase-requests/new", "create-pr"],
      ["/app/quotations/new",        "create-rfq"],
      ["/app/purchase-orders/new",   "create-po"],
      ["/app/grn/new",               "create-grn"],
      ["/app/payments/new",          "create-payment"],
      ["/app/profile",               "user-profile"],
      ["/app/notifications",         "notifications"],
    ],
  },
  {
    label: "vendor",
    email: "vendor@scm.com",
    pages: [
      ["/vendor",                       "vendor-home"],
      ["/vendor/quotation-requests",    "vendor-quotation-requests"],
      ["/vendor/quotations",            "vendor-quotations"],
      ["/vendor/purchase-orders",       "vendor-pos"],
      ["/vendor/invoices",              "vendor-invoices"],
      ["/vendor/invoices/upload",       "vendor-invoice-upload"],
      ["/vendor/grn",                   "vendor-grn"],
      ["/vendor/application-status",    "vendor-application-status"],
      ["/vendor/profile",               "vendor-profile"],
    ],
  },
  {
    label: "public",
    email: null, // no login
    pages: [
      ["/",                 "public-landing"],
      ["/login",            "public-login"],
      ["/forgot-password",  "public-forgot-password"],
      ["/vendor-register",  "public-vendor-register"],
    ],
  },
];

const VIEWPORTS = [
  { name: "mobile",  w: 390,  h: 844 },
  { name: "desktop", w: 1440, h: 900 },
];

async function login(page, email) {
  await page.goto(`${APP}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', "password");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(app|admin|vendor)\b/, { timeout: 30000 });
  await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(400);
}

async function capture(page, path, label) {
  const url = path.startsWith("http") ? path : `${APP}${path}`;
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(600);

  // Detect horizontal overflow — root scrollWidth > viewport width is the
  // clearest signal that something busts the layout on mobile.
  const overflow = await page.evaluate(() => {
    const scrollW = document.documentElement.scrollWidth;
    const viewW   = document.documentElement.clientWidth;
    const wide = [];
    if (scrollW > viewW + 1) {
      // Find the worst offender — child element whose right edge sticks out.
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.right > viewW + 1 && r.width < viewW * 3) {
          wide.push({
            tag: el.tagName,
            cls: (el.className && typeof el.className === "string") ? el.className.slice(0, 80) : "",
            right: Math.round(r.right),
            width: Math.round(r.width),
          });
        }
      }
    }
    return { scrollW, viewW, overflow: scrollW > viewW + 1, offenders: wide.slice(0, 3) };
  });

  return overflow;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const spec of SPECS) {
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
      });
      const page = await ctx.newPage();
      const consoleErrors = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 200));
      });
      page.on("pageerror", (err) => consoleErrors.push(`PAGEERR ${err.message.slice(0, 200)}`));

      try {
        if (spec.email) await login(page, spec.email);

        for (const [path, label] of spec.pages) {
          const before = consoleErrors.length;
          const ov = await capture(page, path, label).catch((e) => ({ error: e.message }));
          const fname = `${label}-${vp.name}.png`;
          await page.screenshot({ path: join(SHOTS, fname), fullPage: true }).catch(() => {});
          const newErrs = consoleErrors.slice(before);
          results.push({
            spec: spec.label, vp: vp.name, path, file: fname,
            overflow: ov?.overflow ?? false,
            offenders: ov?.offenders ?? [],
            errors: newErrs,
            navError: ov?.error,
          });
        }
      } catch (err) {
        results.push({ spec: spec.label, vp: vp.name, error: err.message });
      }
      await ctx.close();
      await new Promise((r) => setTimeout(r, 500));
    }
    // Bigger gap between users so we don't trip throttle:5,1 on login.
    if (spec.email) await new Promise((r) => setTimeout(r, 13_000));
  }

  await browser.close();

  // Compact report
  console.log("\n=== RESPONSIVE SWEEP ===\n");
  const broken = results.filter((r) => r.overflow || (r.errors?.length ?? 0));
  if (broken.length === 0) {
    console.log("✓ All pages clean — no horizontal overflow, no console errors.");
  } else {
    for (const r of broken) {
      if (r.overflow) {
        console.log(`✗ OVERFLOW  ${r.spec.padEnd(15)} ${r.vp.padEnd(7)} ${r.path}`);
        for (const o of r.offenders) {
          console.log(`     → <${o.tag}> width=${o.width} right=${o.right}  cls="${o.cls}"`);
        }
      }
      if (r.errors?.length) {
        console.log(`⚠ ERRORS    ${r.spec.padEnd(15)} ${r.vp.padEnd(7)} ${r.path}`);
        for (const e of r.errors.slice(0, 3)) console.log(`     · ${e}`);
      }
    }
  }
  console.log(`\nTotal pages captured: ${results.length}`);
  console.log(`Shots in: test/_shots/`);
}

run().catch((e) => { console.error(e); process.exit(1); });
