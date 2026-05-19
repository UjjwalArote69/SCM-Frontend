// Vendor-focused smoke test. Run: node test/vendor-smoke.mjs
const BASE = process.env.Suppliers First_API || "http://127.0.0.1:8000/api";
const PASS = "password";

const tokens = {};
const results = [];
let okCount = 0, failCount = 0;

const sleep = ms => new Promise(r => setTimeout(r, ms));

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  if (ok) { okCount++; console.log(`  PASS  ${name}`); }
  else    { failCount++; console.log(`  FAIL  ${name}  -- ${detail}`); }
}

async function api(method, path, { token, body } = {}) {
  const headers = { Accept: "application/json" };
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}

async function login(email) {
  for (let i = 0; i < 3; i++) {
    const r = await api("POST", "/login", { body: { email, password: PASS } });
    if (r.status === 200 && r.data?.token) { tokens[email] = r.data.token; return r.data; }
    if (r.status === 429) { console.log(`  ...throttled, sleeping 65s for ${email}`); await sleep(65_000); continue; }
    console.log(`  login ${email} failed status=${r.status} body=${JSON.stringify(r.data).slice(0,120)}`);
    return null;
  }
  return null;
}

const pickNumber = d => d?.data?.number || d?.number;

function section(t) { console.log(`\n=== ${t} ===`); }

(async () => {
  section("SETUP — login users (paced for throttle)");
  const users = ["admin@scm.com","manager.eng@scm.com","hod.it@scm.com","cfo.fin@scm.com",
                 "ceo@scm.com","employee.it@scm.com","vendor@acme.com","vendor@scm.com"];
  for (let i = 0; i < users.length; i++) {
    if (i === 4) { console.log("  ...sleep 65s..."); await sleep(65_000); }
    const r = await login(users[i]);
    record(`login ${users[i]}`, !!r);
  }

  const A = tokens["admin@scm.com"];
  const E = tokens["employee.it@scm.com"];
  const HOD = tokens["hod.it@scm.com"];
  const CFO = tokens["cfo.fin@scm.com"];
  const CEO = tokens["ceo@scm.com"];
  const VA = tokens["vendor@acme.com"];   // Acme Industries
  const VG = tokens["vendor@scm.com"];    // Global Suppliers First Vendor
  if (!A || !VA || !VG) { console.log("Critical tokens missing — abort"); process.exit(1); }

  section("VENDOR IDENTITY — /vendors data scoping (potential leak)");
  // From admin: full list (expected)
  const vListAdmin = await api("GET", "/vendors", { token: A });
  const adminVendors = vListAdmin.data?.data ?? [];
  record("admin can list /vendors", vListAdmin.status === 200 && Array.isArray(adminVendors), `count=${adminVendors.length}`);

  // From a vendor: how much do they see?
  const vListVendor = await api("GET", "/vendors", { token: VA });
  const vendorSeen = vListVendor.data?.data ?? [];
  record(
    "vendor cannot see other vendors via /vendors (DATA LEAK if FAIL)",
    vListVendor.status === 200
      && Array.isArray(vendorSeen)
      && vendorSeen.length === 1
      && vendorSeen[0].email_address_1 === "vendor@acme.com",
    `vendor saw ${vendorSeen.length} vendor records (status=${vListVendor.status})`,
  );

  // Employee (not back-office): /vendors should be denied — only back-office
  // roles can pick vendors for RFQs, and employees can't create RFQs anyway.
  const vListEmp = await api("GET", "/vendors", { token: E });
  record(
    "employee blocked from /vendors → 403 (no business need)",
    vListEmp.status === 403,
    `status=${vListEmp.status}`,
  );

  section("SETUP — create PR → RFQ → award → PO so vendor has data");

  // Create PR + approve
  const prCreate = await api("POST", "/prs", {
    token: E,
    body: {
      title: "Vendor smoke PR " + Date.now(),
      requester_name: "QA Bot",
      department: "Procurement",
      business_unit: "BU-1",
      priority: "medium",
      items: [{ name: "Smoke Item", code: "SMK-1", hsn_code: "8471", uom: "Nos", qty: 6 }],
    },
  });
  const prNum = pickNumber(prCreate.data);
  await api("POST", `/prs/${prNum}/status`, { token: HOD, body: { action: "approve" } });
  await api("POST", `/prs/${prNum}/status`, { token: CFO, body: { action: "approve" } });
  await api("POST", `/prs/${prNum}/status`, { token: CEO, body: { action: "approve" } });

  // Find Acme & Global vendor names from admin's list
  const acme = adminVendors.find(v => /Acme/i.test(v.vendor_name))?.vendor_name;
  const global = adminVendors.find(v => /Global/i.test(v.vendor_name))?.vendor_name;

  // Create RFQ inviting both
  const rfqCreate = await api("POST", "/rfqs", {
    token: A,
    body: {
      title: "Vendor smoke RFQ " + Date.now(),
      pr_number: prNum,
      vendors: [acme, global],
      items: [{ name: "Smoke Item", code: "SMK-1", hsn_code: "8471", uom: "Nos", qty: 6 }],
      due_date: new Date(Date.now()+5*86400000).toISOString().slice(0,10),
    },
  });
  const rfqNum = pickNumber(rfqCreate.data);
  record("setup: RFQ created with both vendors invited", !!rfqNum, `rfq=${rfqNum}`);

  // Create a "lonely" RFQ inviting only Global
  const lonelyCreate = await api("POST", "/rfqs", {
    token: A,
    body: {
      title: "Lonely RFQ " + Date.now(),
      vendors: [global],
      items: [{ name: "Solo", qty: 1 }],
      due_date: new Date(Date.now()+5*86400000).toISOString().slice(0,10),
    },
  });
  const lonelyNum = pickNumber(lonelyCreate.data);

  section("VENDOR — /rfqs scoping");
  const rfqsForAcme = await api("GET", "/rfqs", { token: VA });
  const acmeRfqs = rfqsForAcme.data?.data ?? [];
  record(
    "Acme sees only RFQs they're invited to",
    Array.isArray(acmeRfqs)
      && acmeRfqs.every(r => Array.isArray(r.vendors) && r.vendors.includes(acme))
      && acmeRfqs.some(r => r.number === rfqNum)
      && !acmeRfqs.some(r => r.number === lonelyNum),
    `Acme sees ${acmeRfqs.length} RFQs; lonely visible? ${acmeRfqs.some(r => r.number === lonelyNum)}`,
  );

  section("VENDOR — quote submission");
  // Acme submits a valid quote
  const submitOk = await api("POST", `/rfqs/${rfqNum}/submit`, {
    token: VA,
    body: { prices: [95.5], gst: [18], comment: "Acme smoke quote", eta: new Date(Date.now()+10*86400000).toISOString().slice(0,10) },
  });
  record("Acme submits quote", submitOk.status === 200, `status=${submitOk.status}`);

  // Wrong-shape quote: prices length != items length
  const wrongShape = await api("POST", `/rfqs/${rfqNum}/submit`, {
    token: VA,
    body: { prices: [10, 20, 30], gst: [18, 18, 18] },
  });
  record("size-mismatched prices rejected → 422", wrongShape.status === 422, `status=${wrongShape.status}`);

  // Vendor tries to submit on behalf of another vendor (admin override field): backend should ignore for vendor role
  const spoof = await api("POST", `/rfqs/${rfqNum}/submit`, {
    token: VA,
    body: { vendor: global, prices: [99], gst: [18] },
  });
  record(
    "spoofing 'vendor' field is ignored — submission still attributed to Acme",
    spoof.status === 200,
    `status=${spoof.status}`,
  );
  // Verify the response actually attributed it to Acme
  const rfqAfterSpoof = await api("GET", `/rfqs/${rfqNum}`, { token: A });
  const spoofedAsGlobal = (rfqAfterSpoof.data?.data?.responses ?? []).some(r => r.vendor === global);
  record("after spoof attempt no Global response was created", !spoofedAsGlobal,
    spoofedAsGlobal ? "DATA INTEGRITY BUG — Global response appeared from Acme submit" : "ok");

  // Acme tries to submit to lonely RFQ they aren't invited to
  const uninvited = await api("POST", `/rfqs/${lonelyNum}/submit`, {
    token: VA, body: { prices: [10], gst: [18] },
  });
  record("Acme blocked from RFQs they weren't invited to → 403", uninvited.status === 403, `status=${uninvited.status}`);

  // Global submits, then admin awards to Acme
  await api("POST", `/rfqs/${rfqNum}/submit`, {
    token: VG,
    body: { prices: [120], gst: [18], comment: "Global quote", eta: new Date(Date.now()+12*86400000).toISOString().slice(0,10) },
  });
  await api("POST", `/rfqs/${rfqNum}/award`, { token: A, body: { vendor: acme } });

  section("VENDOR — RFQ awarded to someone else (sanity)");
  // Global tries to submit to an awarded RFQ
  const lateSubmit = await api("POST", `/rfqs/${rfqNum}/submit`, {
    token: VG, body: { prices: [50], gst: [18] },
  });
  record("submit to awarded RFQ → 409", lateSubmit.status === 409, `status=${lateSubmit.status}`);

  section("VENDOR — PO scoping & access");
  // Create PO for Acme
  const poCreate = await api("POST", "/pos", {
    token: A,
    body: {
      vendor: acme,
      pr_number: prNum,
      rfq_number: rfqNum,
      items: [{ name: "Smoke Item", code: "SMK-1", uom: "Nos", qty: 6, rate: 95.5, gst: 18 }],
    },
  });
  const poNum = pickNumber(poCreate.data);

  // Create another PO for Global
  const poGlobalCreate = await api("POST", "/pos", {
    token: A,
    body: {
      vendor: global,
      items: [{ name: "Filler", qty: 2, rate: 50, gst: 18 }],
    },
  });
  const poGlobalNum = pickNumber(poGlobalCreate.data);

  // Acme list — should see only Acme's PO
  const posForAcme = await api("GET", "/pos", { token: VA });
  const acmePos = posForAcme.data?.data ?? [];
  record(
    "Acme's /pos returns only Acme's POs",
    acmePos.every(p => p.vendor === acme) && acmePos.some(p => p.number === poNum),
    `Acme sees ${acmePos.length} POs (expected vendor=${acme})`,
  );

  // Acme reads Global's PO directly
  const otherPoRead = await api("GET", `/pos/${poGlobalNum}`, { token: VA });
  record(
    "Acme cannot fetch Global's PO directly → 404",
    otherPoRead.status === 404,
    `status=${otherPoRead.status}`,
  );

  // Acme accepts their own PO
  const acceptOk = await api("POST", `/pos/${poNum}/accept`, { token: VA });
  record("Acme accepts own PO", acceptOk.status === 200, `status=${acceptOk.status}`);

  // Acme tries to accept Global's PO
  const wrongAccept = await api("POST", `/pos/${poGlobalNum}/accept`, { token: VA });
  record("Acme cannot accept Global's PO → 403/404", wrongAccept.status === 403 || wrongAccept.status === 404, `status=${wrongAccept.status}`);

  // Acme tries reject after accepted (terminal)
  const rejectAfter = await api("POST", `/pos/${poNum}/reject`, { token: VA });
  record("Acme reject after accept → 409", rejectAfter.status === 409, `status=${rejectAfter.status}`);

  section("VENDOR — self update / name sync");
  // Vendor renames themselves; backend should sync vendor_name on app_vendors
  const newName = "Acme Industries Pvt Ltd";
  const upd = await api("PUT", "/me", { token: VA, body: { name: newName } });
  record("vendor PUT /me name", upd.status === 200, `status=${upd.status}`);

  // Refresh /vendors and confirm vendor_name was synced
  const vListVendor2 = await api("GET", "/vendors", { token: VA });
  const myRowAfter = (vListVendor2.data?.data ?? []).find(v => v.email_address_1 === "vendor@acme.com");
  record(
    "vendor_name on AppVendor synced after user rename",
    myRowAfter?.vendor_name === newName,
    `vendor_name=${myRowAfter?.vendor_name}`,
  );

  // BUT: previously created RFQ/PO still reference the OLD vendor_name.
  // Verify whether new name now disconnects vendor from existing data.
  const rfqAfterRename = await api("GET", `/rfqs/${rfqNum}`, { token: VA });
  record(
    "rename does NOT orphan vendor from existing RFQ (backend still scopes by user_id)",
    rfqAfterRename.status === 200,
    `rfq fetch status after rename=${rfqAfterRename.status}`,
  );

  // Restore name
  await api("PUT", "/me", { token: VA, body: { name: acme } });

  section("VENDOR — bad-password self-update");
  const badPwUpd = await api("PUT", "/me", { token: VA, body: { current_password: "wrong", password: "newpass99" } });
  record("PUT /me password change with wrong current → 422", badPwUpd.status === 422, `status=${badPwUpd.status}`);

  section("VENDOR — write attempts that should be blocked");
  // Vendor tries to create RFQ
  const vCreateRfq = await api("POST", "/rfqs", {
    token: VA, body: { title: "x", vendors: [acme], items: [{ name: "x", qty: 1 }] },
  });
  record("vendor cannot create RFQ → 403", vCreateRfq.status === 403, `status=${vCreateRfq.status}`);

  // Vendor tries to create PO
  const vCreatePo = await api("POST", "/pos", {
    token: VA, body: { vendor: acme, items: [{ name: "x", qty: 1, rate: 1 }] },
  });
  record("vendor cannot create PO → 403", vCreatePo.status === 403, `status=${vCreatePo.status}`);

  // Vendor tries to create PR
  const vCreatePr = await api("POST", "/prs", {
    token: VA, body: { items: [{ name: "x", qty: 1 }] },
  });
  record(
    "vendor cannot raise PR (or backend permits — check) ",
    vCreatePr.status === 403 || vCreatePr.status === 201,
    `status=${vCreatePr.status} (informational)`,
  );

  // Vendor tries to create another vendor master record
  const vCreateVendor = await api("POST", "/vendors", {
    token: VA, body: { vendor_name: "Pwn Co" },
  });
  record(
    "vendor cannot create vendor master records (DATA INTEGRITY if FAIL)",
    vCreateVendor.status === 403 || vCreateVendor.status === 422,
    `status=${vCreateVendor.status}`,
  );

  // Vendor tries to update another vendor
  const otherCode = adminVendors.find(v => v.vendor_name === global)?.code;
  if (otherCode) {
    const vEditOther = await api("PUT", `/vendors/${otherCode}`, {
      token: VA, body: { approval_status: "suspended" },
    });
    record(
      "vendor cannot mutate another vendor (DATA INTEGRITY if FAIL)",
      vEditOther.status === 403 || vEditOther.status === 401,
      `status=${vEditOther.status}`,
    );
  }

  section("CLEANUP");
  if (poGlobalNum) await api("DELETE", `/pos/${poGlobalNum}`, { token: A });
  if (poNum)       await api("DELETE", `/pos/${poNum}`, { token: A });
  if (lonelyNum)   await api("DELETE", `/rfqs/${lonelyNum}`, { token: A });
  if (rfqNum)      await api("DELETE", `/rfqs/${rfqNum}`, { token: A });
  if (prNum)       await api("DELETE", `/prs/${prNum}`, { token: A });
  record("cleanup done", true);

  console.log(`\n========================================`);
  console.log(`  RESULTS: ${okCount} passed, ${failCount} failed`);
  console.log(`========================================`);
  if (failCount > 0) {
    console.log("\nFAILED:");
    for (const r of results) if (!r.ok) console.log(`  - ${r.name}: ${r.detail}`);
  }
  process.exit(failCount === 0 ? 0 : 1);
})().catch(e => { console.error("FATAL:", e); process.exit(2); });
