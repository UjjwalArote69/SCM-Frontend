// Sanity check: CFO can hit GRN approval endpoint when chain_stage=pending_cfo.
// Run: node test/cfo-grn-approve.mjs <PO-NUMBER>
//
// Drives a fresh clean GRN through PM → Purchase HOD → Finance HOD,
// then verifies the CFO account can both READ /me's permissions
// (includes grn.approve) and POST an approve at pending_cfo.

const BASE = process.env.SUPPLIERSFIRST_API || "http://127.0.0.1:8000/api";
const PASS = "password";
const PO_NUMBER = process.argv[2];

if (!PO_NUMBER) {
  console.error("Usage: node test/cfo-grn-approve.mjs <PO-NUMBER>");
  process.exit(1);
}

const tokens = {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok  = (m) => { pass++; console.log(`  ✓ ${m}`); };
const bad = (m) => { fail++; console.log(`  ✗ ${m}`); };

async function api(method, path, { token, body } = {}) {
  const headers = { Accept: "application/json" };
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}

async function login(email) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await api("POST", "/login", { body: { email, password: PASS } });
    if (r.status === 200 && r.data?.token) {
      tokens[email] = r.data.token;
      return r.data;
    }
    if (r.status === 429) { await sleep(65_000); continue; }
    throw new Error(`login ${email}: ${r.status} ${JSON.stringify(r.data).slice(0,200)}`);
  }
  throw new Error(`login ${email}: throttled too many times`);
}

(async () => {
  console.log(`API: ${BASE}\nPO: ${PO_NUMBER}\n`);

  console.log("— Login batch (5 users — wait for throttle if needed)");
  await login("site.ops@scm.com");
  await login("pm.eng@scm.com");
  await login("hod.purch@scm.com");
  await login("hod.fin@scm.com");
  await login("cfo.fin@scm.com");
  console.log("  sleep 65s for throttle…");
  await sleep(65_000);

  console.log("\n— Verify cfo.fin permissions include grn.approve");
  const me = await api("GET", "/me", { token: tokens["cfo.fin@scm.com"] });
  if (me.status !== 200) throw new Error(`/me failed: ${me.status}`);
  const perms = me.data?.permissions ?? [];
  if (perms.includes("grn.approve") || perms.includes("*")) {
    ok(`/me.permissions contains 'grn.approve' (got ${perms.length} perms total)`);
  } else {
    bad(`/me.permissions MISSING 'grn.approve' — got: ${perms.join(", ")}`);
  }

  console.log("\n— Create a fresh GRN and drive PM → Purchase HOD → Finance HOD");
  const grnCreate = await api("POST", "/grns", {
    token: tokens["site.ops@scm.com"],
    body: {
      po_number: PO_NUMBER,
      vendor: "Acme Industries",
      challan_no: `CFO-${Date.now()}`,
      received_date: new Date().toISOString().slice(0, 10),
      invoice_type: "tax_invoice",
      items: [
        { name: "Test Widget", code: "W-001", ordered: 10, received: 10 },
      ],
    },
  });
  if (grnCreate.status !== 201) {
    throw new Error(`GRN create failed: ${grnCreate.status} ${JSON.stringify(grnCreate.data).slice(0,300)}`);
  }
  const number = grnCreate.data?.data?.number;
  console.log(`  Created ${number}`);

  let g = grnCreate.data?.data;
  for (const [email, label] of [
    ["pm.eng@scm.com", "PM"],
    ["hod.purch@scm.com", "Purchase HOD"],
    ["hod.fin@scm.com", "Finance HOD"],
  ]) {
    const r = await api("POST", `/grns/${number}/status`, {
      token: tokens[email], body: { action: "approve" },
    });
    if (r.status !== 200) throw new Error(`${label} approve failed: ${r.status} ${JSON.stringify(r.data).slice(0,300)}`);
    g = r.data?.data;
    console.log(`  ${label} approved → chain_stage=${g.chain_stage}`);
  }
  if (g.chain_stage !== "pending_cfo") {
    bad(`Expected chain_stage=pending_cfo after Finance HOD, got ${g.chain_stage}`);
  } else {
    ok("Chain is at pending_cfo");
  }

  console.log("\n— CFO approves the GRN");
  const cfoApprove = await api("POST", `/grns/${number}/status`, {
    token: tokens["cfo.fin@scm.com"],
    body: { action: "approve", comments: "CFO smoke-test approval" },
  });
  if (cfoApprove.status !== 200) {
    bad(`CFO approve failed: ${cfoApprove.status} ${JSON.stringify(cfoApprove.data).slice(0,300)}`);
  } else {
    ok(`CFO approve succeeded (200)`);
    g = cfoApprove.data?.data;
    if (g.chain_stage === "pending_ceo") {
      ok("Chain advanced to pending_ceo");
    } else {
      bad(`Chain didn't advance — still at ${g.chain_stage}`);
    }
    const lastEntry = (g.approval_history ?? []).slice(-1)[0];
    if (lastEntry?.by_role === "cfo" && lastEntry?.action === "approve") {
      ok("Audit row tagged by_role=cfo, action=approve");
    } else {
      bad(`Audit row unexpected: ${JSON.stringify(lastEntry)}`);
    }
  }

  console.log(`\n──────────────────────────────`);
  console.log(`Passed: ${pass}   Failed: ${fail}`);
  console.log(`──────────────────────────────\n`);
  if (fail > 0) process.exit(1);
})().catch((e) => {
  console.error(`\n❌ ${e.message}`);
  process.exit(1);
});
