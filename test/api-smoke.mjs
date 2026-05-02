// End-to-end API smoke test for SCM backend.
// Run: node test/api-smoke.mjs
const BASE = process.env.SCM_API || "http://127.0.0.1:8000/api";
const PASS = "password";

const results = [];
const tokens = {};
let okCount = 0, failCount = 0;

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  if (ok) { okCount++; console.log(`  PASS  ${name}`); }
  else    { failCount++; console.log(`  FAIL  ${name}  -- ${detail}`); }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function api(method, path, { token, body } = {}) {
  const headers = { "Accept": "application/json" };
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}

// Login that auto-sleeps when throttled
async function login(email, { silent = false } = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await api("POST", "/login", { body: { email, password: PASS } });
    if (r.status === 200 && r.data?.token) {
      tokens[email] = r.data.token;
      if (!silent) record(`login ${email}`, true);
      return r.data;
    }
    if (r.status === 429) {
      console.log(`  ...throttled, sleeping 65s then retrying ${email}`);
      await sleep(65_000);
      continue;
    }
    if (!silent) record(`login ${email}`, false, `status=${r.status} body=${JSON.stringify(r.data).slice(0,150)}`);
    return null;
  }
  if (!silent) record(`login ${email}`, false, "throttled too many times");
  return null;
}

// Pull `number` out of various possible response shapes
function pickNumber(data) {
  return data?.data?.number || data?.number || data?.pr?.number || data?.rfq?.number || data?.po?.number || data?.grn?.number;
}

function section(t) { console.log(`\n=== ${t} ===`); }

(async () => {
  section("AUTH (logins)");

  // Get all 9 tokens. Throttle is 5/min so we batch with sleeps.
  const emails = [
    "admin@scm.com", "manager.eng@scm.com", "hod.it@scm.com", "cfo.fin@scm.com", // batch 1
    "ceo@scm.com", "employee.it@scm.com", "vendor@acme.com", "vendor@scm.com", "purchase.purch@scm.com", // batch 2
  ];
  for (let i = 0; i < emails.length; i++) {
    if (i === 4) { console.log("  ...sleeping 65s to clear login throttle..."); await sleep(65_000); }
    await login(emails[i]);
  }

  section("AUTH (other checks)");

  // /me with token
  if (tokens["admin@scm.com"]) {
    const me = await api("GET", "/me", { token: tokens["admin@scm.com"] });
    record("GET /me with token", me.status === 200 && me.data?.email === "admin@scm.com", `status=${me.status}`);
  }
  // /me without token
  const noTok = await api("GET", "/me");
  record("GET /me without token → 401", noTok.status === 401, `status=${noTok.status}`);

  // Self-update name
  if (tokens["employee.it@scm.com"]) {
    const upd = await api("PUT", "/me", {
      token: tokens["employee.it@scm.com"],
      body: { name: "Employee QA " + Date.now() },
    });
    record("PUT /me self-update name", upd.status === 200, `status=${upd.status}`);
  }

  // ---- Bad password + throttle ----
  console.log("  ...sleeping 65s before bad-password / throttle tests...");
  await sleep(65_000);

  const bad = await api("POST", "/login", { body: { email: "admin@scm.com", password: "wrong" } });
  record("login rejects bad password", bad.status === 401 || bad.status === 422, `status=${bad.status}`);

  // Hammer login with bad password to verify 429
  let got429 = false;
  for (let i = 0; i < 8; i++) {
    const r = await api("POST", "/login", { body: { email: "nobody@scm.com", password: "x" } });
    if (r.status === 429) { got429 = true; break; }
  }
  record("login throttle returns 429 after 5 attempts", got429);

  console.log("  ...sleeping 65s to clear login throttle...");
  await sleep(65_000);

  section("PURCHASE REQUESTS");

  const empTok = tokens["employee.it@scm.com"];
  const adminTok = tokens["admin@scm.com"];
  let prNumber = null;

  if (empTok) {
    const create = await api("POST", "/prs", {
      token: empTok,
      body: {
        title: "QA Test PR " + Date.now(),
        priority: "medium",
        business_unit: "BU-1",
        items: [
          { name: "Test Widget", code: "W-001", hsn_code: "8471", uom: "Nos", qty: 10 },
        ],
        justification: "smoke test",
      },
    });
    prNumber = pickNumber(create.data);
    record("create PR as employee", !!prNumber, `status=${create.status} number=${prNumber}`);
  }

  // Employee list scoped to own
  if (empTok && prNumber) {
    const list = await api("GET", "/prs", { token: empTok });
    const items = list.data?.data || list.data || [];
    const found = Array.isArray(items) && items.some(p => p.number === prNumber);
    record("employee list PRs scoped (own visible)", found, `count=${Array.isArray(items)?items.length:'?'}`);
  }

  // Wrong-role: CFO at HOD stage
  if (prNumber && tokens["cfo.fin@scm.com"]) {
    const wrong = await api("POST", `/prs/${prNumber}/status`, {
      token: tokens["cfo.fin@scm.com"],
      body: { action: "approve" },
    });
    record("CFO cannot approve at HOD stage → 403", wrong.status === 403, `status=${wrong.status}`);
  }

  // HOD → CFO → CEO chain
  if (prNumber && tokens["hod.it@scm.com"]) {
    const r = await api("POST", `/prs/${prNumber}/status`, {
      token: tokens["hod.it@scm.com"], body: { action: "approve" },
    });
    record("HOD approves PR", r.status === 200, `status=${r.status} stage=${r.data?.data?.chain_stage}`);
  }
  if (prNumber && tokens["cfo.fin@scm.com"]) {
    const r = await api("POST", `/prs/${prNumber}/status`, {
      token: tokens["cfo.fin@scm.com"], body: { action: "approve" },
    });
    record("CFO approves PR", r.status === 200, `status=${r.status} stage=${r.data?.data?.chain_stage}`);
  }
  if (prNumber && tokens["ceo@scm.com"]) {
    const r = await api("POST", `/prs/${prNumber}/status`, {
      token: tokens["ceo@scm.com"], body: { action: "approve" },
    });
    record("CEO approves PR (final)", r.status === 200, `status=${r.status} stage=${r.data?.data?.chain_stage} prStatus=${r.data?.data?.status}`);
  }

  // Terminal-state guard
  if (prNumber && tokens["ceo@scm.com"]) {
    const r = await api("POST", `/prs/${prNumber}/status`, {
      token: tokens["ceo@scm.com"], body: { action: "approve" },
    });
    record("re-approve approved PR → 409", r.status === 409, `status=${r.status}`);
  }

  // Detail
  if (prNumber && adminTok) {
    const det = await api("GET", `/prs/${prNumber}`, { token: adminTok });
    record("admin can fetch PR detail", det.status === 200, `status=${det.status} prStatus=${det.data?.data?.status}`);
  }

  // Negative: employee cannot approve someone else's PR (creator can only cancel their own)
  if (prNumber && empTok) {
    const r = await api("POST", `/prs/${prNumber}/status`, {
      token: empTok, body: { action: "approve" },
    });
    record("employee cannot approve any PR → 403/409", r.status === 403 || r.status === 409, `status=${r.status}`);
  }

  section("RFQs / QUOTATIONS");

  let rfqNumber = null, lonelyRfq = null;
  let acme = null, global = null;

  if (adminTok) {
    const vlist = await api("GET", "/vendors", { token: adminTok });
    const vendors = vlist.data?.data || vlist.data || [];
    const names = Array.isArray(vendors)
      ? vendors.filter(v => !v.status || v.status === "approved").map(v => v.vendor_name || v.name).filter(Boolean)
      : [];
    acme = names.find(n => /Acme/i.test(n));
    global = names.find(n => /Global/i.test(n));
    record("admin list vendors (Acme + Global present)", !!acme && !!global, `acme=${acme} global=${global} total=${names.length}`);
  }

  // Employee cannot create RFQ
  if (empTok && acme) {
    const r = await api("POST", "/rfqs", {
      token: empTok,
      body: { title: "EmpRfq", items: [{ name: "x", qty: 1 }], vendors: [acme] },
    });
    record("employee cannot create RFQ → 403", r.status === 403, `status=${r.status}`);
  }

  // Need a fresh approved PR to seed RFQ creation? Not required by validator (pr_number is just a string)
  if (adminTok && acme && global) {
    const r = await api("POST", "/rfqs", {
      token: adminTok,
      body: {
        title: "QA RFQ " + Date.now(),
        pr_number: prNumber || "PR-MANUAL",
        items: [{ name: "Test Widget", code: "W-001", hsn_code: "8471", uom: "Nos", qty: 10 }],
        vendors: [acme, global],
        due_date: new Date(Date.now()+7*86400000).toISOString().slice(0,10),
      },
    });
    rfqNumber = pickNumber(r.data);
    record("admin creates RFQ", !!rfqNumber, `status=${r.status} number=${rfqNumber}`);
  }

  // Lonely RFQ (only Acme invited) for negative test
  if (adminTok && acme) {
    const r = await api("POST", "/rfqs", {
      token: adminTok,
      body: {
        title: "QA Lonely RFQ " + Date.now(),
        items: [{ name: "Solo item", qty: 1 }],
        vendors: [acme],
        due_date: new Date(Date.now()+7*86400000).toISOString().slice(0,10),
      },
    });
    lonelyRfq = pickNumber(r.data);
  }

  // Acme submits quote (prices is a parallel numeric array)
  if (rfqNumber && tokens["vendor@acme.com"]) {
    const r = await api("POST", `/rfqs/${rfqNumber}/submit`, {
      token: tokens["vendor@acme.com"],
      body: {
        prices: [95],
        gst: [18],
        comment: "Best price from Acme",
      },
    });
    record("Acme vendor submits quote", r.status === 200, `status=${r.status}`);
  }

  // Global also submits
  if (rfqNumber && tokens["vendor@scm.com"]) {
    const r = await api("POST", `/rfqs/${rfqNumber}/submit`, {
      token: tokens["vendor@scm.com"],
      body: { prices: [110], gst: [18], comment: "Global SCM bid" },
    });
    record("Global vendor submits quote", r.status === 200, `status=${r.status}`);
  }

  // Uninvited vendor (Global) submits to lonelyRfq → 403
  if (lonelyRfq && tokens["vendor@scm.com"]) {
    const r = await api("POST", `/rfqs/${lonelyRfq}/submit`, {
      token: tokens["vendor@scm.com"],
      body: { prices: [50], gst: [18] },
    });
    record("uninvited vendor cannot submit → 403", r.status === 403, `status=${r.status}`);
  }

  // Vendor cannot create RFQ
  if (tokens["vendor@acme.com"] && acme) {
    const r = await api("POST", "/rfqs", {
      token: tokens["vendor@acme.com"],
      body: { title: "vendor-rfq", items: [{ name: "x", qty: 1 }], vendors: [acme] },
    });
    record("vendor cannot create RFQ → 403", r.status === 403, `status=${r.status}`);
  }

  // Award to Acme
  if (rfqNumber && adminTok && acme) {
    const r = await api("POST", `/rfqs/${rfqNumber}/award`, {
      token: adminTok, body: { vendor: acme },
    });
    record("admin awards RFQ to Acme", r.status === 200, `status=${r.status} rfqStatus=${r.data?.data?.status}`);
  }

  // Re-award → terminal-state guard
  if (rfqNumber && adminTok && acme) {
    const r = await api("POST", `/rfqs/${rfqNumber}/award`, {
      token: adminTok, body: { vendor: acme },
    });
    record("re-award awarded RFQ → 409", r.status === 409, `status=${r.status}`);
  }

  section("PURCHASE ORDERS");

  let poNumber = null;

  if (adminTok && acme) {
    const r = await api("POST", "/pos", {
      token: adminTok,
      body: {
        vendor: acme,
        rfq_number: rfqNumber,
        business_unit: "BU-1",
        items: [{ name: "Test Widget", code: "W-001", hsn_code: "8471", uom: "Nos", qty: 10, rate: 95, gst: 18 }],
        expected_delivery: new Date(Date.now()+14*86400000).toISOString().slice(0,10),
      },
    });
    poNumber = pickNumber(r.data);
    record("admin creates PO", !!poNumber, `status=${r.status} number=${poNumber} total=${r.data?.data?.total}`);
  }

  // Employee cannot create PO
  if (empTok && acme) {
    const r = await api("POST", "/pos", {
      token: empTok,
      body: { vendor: acme, items: [{ name: "x", qty: 1, rate: 1 }] },
    });
    record("employee cannot create PO → 403", r.status === 403, `status=${r.status}`);
  }

  // Wrong vendor accepts → 403
  if (poNumber && tokens["vendor@scm.com"]) {
    const r = await api("POST", `/pos/${poNumber}/accept`, { token: tokens["vendor@scm.com"] });
    record("non-assigned vendor cannot accept PO → 403", r.status === 403, `status=${r.status}`);
  }

  // Right vendor accepts
  if (poNumber && tokens["vendor@acme.com"]) {
    const r = await api("POST", `/pos/${poNumber}/accept`, { token: tokens["vendor@acme.com"] });
    record("assigned vendor accepts PO", r.status === 200, `status=${r.status} poStatus=${r.data?.data?.status}`);
  }

  // Terminal guard on PO
  if (poNumber && tokens["vendor@acme.com"]) {
    const r = await api("POST", `/pos/${poNumber}/accept`, { token: tokens["vendor@acme.com"] });
    record("re-accept accepted PO → 409", r.status === 409, `status=${r.status}`);
  }

  section("GRN");

  if (poNumber && adminTok && acme) {
    // Partial 5/10
    const r1 = await api("POST", "/grns", {
      token: adminTok,
      body: {
        po_number: poNumber,
        vendor: acme,
        items: [{ name: "Test Widget", code: "W-001", ordered: 10, received: 5 }],
      },
    });
    record("admin creates partial GRN (5/10)", r1.status === 201 || r1.status === 200, `status=${r1.status} grn=${pickNumber(r1.data)} body=${JSON.stringify(r1.data).slice(0,150)}`);

    const poAfter1 = await api("GET", `/pos/${poNumber}`, { token: adminTok });
    record("PO still 'accepted' after partial", poAfter1.data?.data?.status === "accepted",
      `po.status=${poAfter1.data?.data?.status}`);

    // Final 5
    const r2 = await api("POST", "/grns", {
      token: adminTok,
      body: {
        po_number: poNumber,
        vendor: acme,
        items: [{ name: "Test Widget", code: "W-001", ordered: 10, received: 5 }],
      },
    });
    record("admin creates final GRN (5 more)", r2.status === 201 || r2.status === 200, `status=${r2.status}`);

    const poAfter2 = await api("GET", `/pos/${poNumber}`, { token: adminTok });
    record("PO auto-fulfilled after full receive", poAfter2.data?.data?.status === "fulfilled",
      `po.status=${poAfter2.data?.data?.status}`);
  }

  // GRN against bogus PO
  if (adminTok && acme) {
    const r = await api("POST", "/grns", {
      token: adminTok,
      body: { po_number: "PO-9999-9999", vendor: acme, items: [{ name: "x", ordered: 1, received: 1 }] },
    });
    record("GRN against non-existent PO rejected", [404, 422, 409].includes(r.status), `status=${r.status}`);
  }

  // GRN by employee → 403 (not in WAREHOUSE_ROLES — employee is, actually; let me skip strict role test)

  section("CLEANUP");
  if (adminTok) {
    if (lonelyRfq) await api("DELETE", `/rfqs/${lonelyRfq}`, { token: adminTok });
    if (rfqNumber) await api("DELETE", `/rfqs/${rfqNumber}`, { token: adminTok });
    if (poNumber)  await api("DELETE", `/pos/${poNumber}`, { token: adminTok });
    if (prNumber)  await api("DELETE", `/prs/${prNumber}`, { token: adminTok });
    record("cleanup deletes (best-effort)", true);
  }

  if (adminTok) {
    const r = await api("POST", "/logout", { token: adminTok });
    record("admin logout", r.status === 200, `status=${r.status}`);
  }

  console.log(`\n========================================`);
  console.log(`  RESULTS: ${okCount} passed, ${failCount} failed`);
  console.log(`========================================`);
  if (failCount > 0) {
    console.log("\nFAILED:");
    for (const r of results) if (!r.ok) console.log(`  - ${r.name}: ${r.detail}`);
  }
  process.exit(failCount === 0 ? 0 : 1);
})().catch(e => { console.error("FATAL:", e); process.exit(2); });
