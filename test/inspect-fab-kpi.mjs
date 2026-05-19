import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 414, height: 900 } });
const page = await ctx.newPage();
await page.goto("http://localhost:5173/login", { waitUntil: "domcontentloaded" });
await page.fill('input[type="email"]', "employee.it@scm.com");
await page.fill('input[type="password"]', "password");
await page.click('button[type="submit"]');
await page.waitForURL(/\/app\b/, { timeout: 30000 });
await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
await page.waitForTimeout(1500);

const data = await page.evaluate(() => {
  const view = { w: document.documentElement.clientWidth, h: document.documentElement.clientHeight };
  // FAB
  const fab = document.querySelector('a[aria-label="New Purchase Request"]');
  const fabR = fab?.getBoundingClientRect();
  const fabStyle = fab ? getComputedStyle(fab) : null;
  // Walk up ancestors looking for transform/filter/contain (anything that
  // makes a containing block for position:fixed)
  const offenders = [];
  let el = fab?.parentElement;
  while (el && el !== document.body) {
    const s = getComputedStyle(el);
    const flags = [];
    if (s.transform !== "none") flags.push(`transform=${s.transform.slice(0,30)}`);
    if (s.filter !== "none") flags.push(`filter=${s.filter}`);
    if (s.backdropFilter !== "none") flags.push("backdropFilter");
    if (s.contain && s.contain !== "none") flags.push(`contain=${s.contain}`);
    if (s.willChange && s.willChange !== "auto") flags.push(`willChange=${s.willChange}`);
    if (s.perspective !== "none") flags.push(`persp=${s.perspective}`);
    if (flags.length) offenders.push({ tag: el.tagName, cls: el.className?.toString().slice(0,60), flags });
    el = el.parentElement;
  }

  // KPI buttons
  const kpiButtons = [...document.querySelectorAll('button[aria-pressed]')].slice(0, 5);
  const kpis = kpiButtons.map((b) => {
    const r = b.getBoundingClientRect();
    return { width: Math.round(r.width), height: Math.round(r.height), pressed: b.getAttribute("aria-pressed") };
  });

  return { view, fab: fabR ? { left: Math.round(fabR.left), right: Math.round(fabR.right), bottom: Math.round(fabR.bottom), position: fabStyle.position } : null, offenders, kpis };
});
console.log(JSON.stringify(data, null, 2));
await browser.close();
