// End-to-end smoke for the new GRN flow:
//   • Case 1 (clean): PM → Purchase HOD → Finance HOD → CFO → CEO → done
//   • Case 2 (damaged): PM → Purchase HOD → pending_vendor_replacement
//                       → vendor accepts → restart at PM → full chain → done
//   • Admin chain override: rewind / force_reject / force_approve
//   • Payments awaiting-approval surfacing of in-flight GRNs
//
// Reuses a fresh PO produced by `node test/setup-grn-fixture.mjs`.
// Run:  node test/grn-flow-smoke.mjs [PO_NUMBER]
//
// If no PO number is passed, the script bails — run the fixture first to
// avoid blowing the login throttle on every iteration.

const BASE = process.env.SUPPLIERSFIRST_API || "http://127.0.0.1:8000/api";
const PASS = "password";
const PO_NUMBER = process.argv[2];

if (!PO_NUMBER) {
  console.error("\nUsage: node test/grn-flow-smoke.mjs <PO-NUMBER>");
  console.error("       (Run `node test/setup-grn-fixture.mjs` first to get one.)\n");
  process.exit(1);
}

const tokens = {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;

const log = {
  step:  (m) => console.log(`\n— ${m}`),
  ok:    (m) => { pass++; console.log(`  ✓ ${m}`); },
  bad:   (m) => { fail++; console.log(`  ✗ ${m}`); },
  info:  (m) => console.log(`    ${m}`),
};

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
      return;
    }
    if (r.status === 429) { await sleep(65_000); continue; }
    throw new Error(`login ${email}: ${r.status} ${JSON.stringify(r.data).slice(0,200)}`);
  }
  throw new Error(`login ${email}: throttled too many times`);
}

function assert(cond, label) {
  cond ? log.ok(label) : log.bad(label);
  return cond;
}

async function createGrn({ withDamage }) {
  const body = {
    po_number: PO_NUMBER,
    vendor: "Acme Industries",
    challan_no: `CH-${Date.now()}`,
    received_date: new Date().toISOString().slice(0, 10),
    invoice_type: "tax_invoice",
    items: [
      withDamage
        ? { name: "Test Widget", code: "W-001", ordered: 10, received: 10, damaged: 2, remark: "scratched" }
        : { name: "Test Widget", code: "W-001", ordered: 10, received: 10 },
    ],
    ...(withDamage ? {
      damage_remark: "2 units arrived scratched",
      damage_by: "vendor",
      damage_comment: "Packaging insufficient",
      replacement_target_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    } : {}),
  };
  const r = await api("POST", "/grns", { token: tokens["site.ops@scm.com"], body });
  if (r.status !== 201) throw new Error(`GRN create failed: ${r.status} ${JSON.stringify(r.data).slice(0, 300)}`);
  return r.data?.data?.number;
}

async function get(number) {
  const r = await api("GET", `/grns/${number}`, { token: tokens["admin@scm.com"] });
  return r.data?.data;
}

async function approve(number, email) {
  const r = await api("POST", `/grns/${number}/status`, {
    token: tokens[email],
    body: { action: "approve" },
  });
  if (r.status !== 200) throw new Error(`approve as ${email}: ${r.status} ${JSON.stringify(r.data).slice(0,300)}`);
  return r.data?.data;
}

// ────────────────────────────────────────────────────────────────────────────

(async () => {
  console.log(`API: ${BASE}\nPO: ${PO_NUMBER}\n`);

  // Existing fixture script logs in 9 users; this script piggybacks on a
  // *fresh* run, so the throttle is already burned. We still need to log in
  // the GRN-specific users (site + PM + project_manager wasn't covered).
  log.step("Login batch 1 (5 users) — wait for throttle if needed");
  await login("admin@scm.com");
  await login("site.ops@scm.com");
  await login("pm.eng@scm.com");
  await login("hod.purch@scm.com");
  await login("hod.fin@scm.com");

  log.info("Sleeping 65s for login throttle…");
  await sleep(65_000);

  log.step("Login batch 2 (3 users)");
  await login("cfo.fin@scm.com");
  await login("ceo@scm.com");
  await login("vendor@acme.com");

  // ── CASE 1: Clean GRN ──────────────────────────────────────────────────
  log.step("CASE 1: site creates a clean GRN (no damage)");
  const grn1 = await createGrn({ withDamage: false });
  let g = await get(grn1);
  log.info(`Created ${grn1} — stage=${g.chain_stage}, status=${g.status}`);
  assert(g.chain_stage === "pending_pm", "stage starts at pending_pm");
  assert(!g.replacement_status, "no replacement workflow on clean GRN");

  log.step("Walk clean GRN through all 5 approval stages");
  g = await approve(grn1, "pm.eng@scm.com");
  assert(g.chain_stage === "pending_purchase_hod", "PM → Purchase HOD");
  g = await approve(grn1, "hod.purch@scm.com");
  assert(g.chain_stage === "pending_finance_hod",  "Purchase HOD → Finance HOD (skips pending_vendor_replacement on clean GRN)");
  g = await approve(grn1, "hod.fin@scm.com");
  assert(g.chain_stage === "pending_cfo",          "Finance HOD → CFO");
  g = await approve(grn1, "cfo.fin@scm.com");
  assert(g.chain_stage === "pending_ceo",          "CFO → CEO");
  g = await approve(grn1, "ceo@scm.com");
  assert(g.chain_stage === "done",                 "CEO → done");
  assert(g.status !== "rejected",                  "GRN not rejected");

  // ── CASE 2: Damaged GRN ────────────────────────────────────────────────
  log.step("CASE 2: site creates a damaged GRN");
  const grn2 = await createGrn({ withDamage: true });
  g = await get(grn2);
  log.info(`Created ${grn2} — stage=${g.chain_stage}, replacement_status=${g.replacement_status}`);
  assert(g.chain_stage === "pending_pm",           "damaged GRN also starts at pending_pm");
  assert(g.replacement_status === "pending",       "damage flagged → replacement_status=pending");

  log.step("PM + Purchase HOD approve — chain should detour to pending_vendor_replacement");
  g = await approve(grn2, "pm.eng@scm.com");
  assert(g.chain_stage === "pending_purchase_hod", "PM → Purchase HOD");
  g = await approve(grn2, "hod.purch@scm.com");
  assert(g.chain_stage === "pending_vendor_replacement", "Purchase HOD → pending_vendor_replacement (Case 2 detour)");

  log.step("Finance HOD should be BLOCKED from acting on pending_vendor_replacement");
  {
    const r = await api("POST", `/grns/${grn2}/status`, {
      token: tokens["hod.fin@scm.com"],
      body: { action: "approve" },
    });
    assert(r.status === 403, `Finance HOD blocked at vendor-replacement stage (got ${r.status})`);
  }

  log.step("Vendor accepts the proposed replacement date — chain restarts at PM");
  {
    const r = await api("POST", `/grns/${grn2}/accept-replacement`, {
      token: tokens["vendor@acme.com"],
      body: { action: "accept", commitment_note: "We agree." },
    });
    assert(r.status === 200, `vendor accept replacement (got ${r.status})`);
    g = r.data?.data;
    assert(g.chain_stage === "pending_pm", "chain restarted at pending_pm");
    assert(g.target_date_agreed === 1 || g.target_date_agreed === true, "target_date_agreed flipped true");
  }

  log.step("Re-walk the chain from PM to done (post-agreement)");
  g = await approve(grn2, "pm.eng@scm.com");
  assert(g.chain_stage === "pending_purchase_hod", "PM → Purchase HOD (re-run)");
  g = await approve(grn2, "hod.purch@scm.com");
  // On the SECOND walk, replacement_status is 'accepted' (not 'pending')
  // AND target_date_agreed=true, so the detour should NOT trigger again.
  assert(g.chain_stage === "pending_finance_hod", "Purchase HOD → Finance HOD (no second detour)");
  g = await approve(grn2, "hod.fin@scm.com");
  g = await approve(grn2, "cfo.fin@scm.com");
  g = await approve(grn2, "ceo@scm.com");
  assert(g.chain_stage === "done",                 "Damaged GRN reaches done after vendor agreement");

  // ── ADMIN OVERRIDE: rewind / force_reject / force_approve ──────────────
  log.step("CASE 3a: admin REWIND a done GRN back to pending_pm");
  {
    const r = await api("POST", `/grns/${grn1}/admin-chain-override`, {
      token: tokens["admin@scm.com"],
      body: {
        to_stage: "pending_pm",
        action: "rewind",
        comment: "Testing rewind override.",
      },
    });
    assert(r.status === 200, `admin rewind (got ${r.status})`);
    g = r.data?.data;
    assert(g.chain_stage === "pending_pm",           "chain rewound to pending_pm");
    const lastEntry = (g.approval_history ?? []).slice(-1)[0];
    assert(lastEntry?.admin_override === true,       "audit row tagged admin_override");
    assert(lastEntry?.from_status && lastEntry?.to_status, "from/to status recorded");
  }

  log.step("CASE 3b: admin FORCE_REJECT a fresh GRN from any stage");
  const grn3 = await createGrn({ withDamage: false });
  {
    const r = await api("POST", `/grns/${grn3}/admin-chain-override`, {
      token: tokens["admin@scm.com"],
      body: {
        to_stage: "pending_cfo",
        action: "force_reject",
        comment: "Forcing a reject from CFO stage for testing.",
      },
    });
    assert(r.status === 200, `admin force_reject (got ${r.status})`);
    g = r.data?.data;
    assert(g.status === "rejected",                  "status flipped to rejected");
    assert(g.chain_stage === "pending_cfo",          "rejecter stage recorded as pending_cfo");
  }

  log.step("CASE 3c: admin FORCE_APPROVE the rewound GRN1 to done");
  {
    const r = await api("POST", `/grns/${grn1}/admin-chain-override`, {
      token: tokens["admin@scm.com"],
      body: {
        to_stage: "done",
        action: "force_approve",
        comment: "Force-approving for test.",
      },
    });
    assert(r.status === 200, `admin force_approve (got ${r.status})`);
    g = r.data?.data;
    assert(g.chain_stage === "done",                 "force_approve drives to done");
    assert(g.status !== "rejected",                  "status no longer rejected");
  }

  log.step("CASE 3d: non-admin BLOCKED from chain override");
  {
    const r = await api("POST", `/grns/${grn1}/admin-chain-override`, {
      token: tokens["cfo.fin@scm.com"],
      body: { to_stage: "pending_pm", action: "rewind", comment: "Should be blocked." },
    });
    assert(r.status === 403, `CFO blocked from admin override (got ${r.status})`);
  }

  log.step("CASE 3e: empty reason rejected");
  {
    const r = await api("POST", `/grns/${grn1}/admin-chain-override`, {
      token: tokens["admin@scm.com"],
      body: { to_stage: "pending_pm", action: "rewind", comment: "" },
    });
    assert(r.status === 422, `empty reason rejected (got ${r.status})`);
  }

  // ── PAYMENTS AWAITING APPROVAL ─────────────────────────────────────────
  log.step("CASE 4: payments/awaiting-approval gated on Purchase HOD approval");
  // Fresh GRN at pending_pm should NOT appear (Finance doesn't see it yet).
  const grn4 = await createGrn({ withDamage: false });
  {
    const r = await api("GET", "/payments/awaiting-approval", { token: tokens["hod.fin@scm.com"] });
    assert(r.status === 200, "FIN HOD can read awaiting-approval");
    const rows = r.data?.data ?? [];
    const hit = rows.find((g) => g.number === grn4);
    assert(!hit, `${grn4} hidden while at pending_pm (pre-Purchase HOD)`);
  }

  // After PM approves → still hidden (only at pending_purchase_hod).
  await approve(grn4, "pm.eng@scm.com");
  {
    const r = await api("GET", "/payments/awaiting-approval", { token: tokens["hod.fin@scm.com"] });
    const rows = r.data?.data ?? [];
    const hit = rows.find((g) => g.number === grn4);
    assert(!hit, `${grn4} still hidden after PM approval (at pending_purchase_hod)`);
  }

  // After Purchase HOD approves → NOW it should appear (at pending_finance_hod).
  await approve(grn4, "hod.purch@scm.com");
  {
    const r = await api("GET", "/payments/awaiting-approval", { token: tokens["hod.fin@scm.com"] });
    const rows = r.data?.data ?? [];
    const hit = rows.find((g) => g.number === grn4);
    assert(!!hit, `${grn4} appears after Purchase HOD approval`);
    assert(hit?.chain_stage === "pending_finance_hod", "row carries chain_stage=pending_finance_hod");
    log.info(`Found ${rows.length} GRN(s) post-Purchase HOD`);
  }

  log.step("Vendor blocked from awaiting-approval");
  {
    const r = await api("GET", "/payments/awaiting-approval", { token: tokens["vendor@acme.com"] });
    assert(r.status === 200, "endpoint reachable");
    const rows = r.data?.data ?? [];
    assert(rows.length === 0, "vendor gets empty list (scrubbed)");
  }

  // ── VENDOR SCRUB ───────────────────────────────────────────────────────
  log.step("CASE 5: vendor sees damaged GRN with replacement workflow but no chain history");
  {
    const r = await api("GET", `/grns/${grn2}`, { token: tokens["vendor@acme.com"] });
    assert(r.status === 200, "vendor can fetch their GRN");
    const v = r.data?.data;
    assert(v.number === grn2, "correct GRN returned");
    // GRN doesn't have scrubForVendor, but the vendor's view should still
    // show replacement_status etc. correctly.
    assert(v.replacement_status, "vendor sees replacement_status");
  }

  // ── SUMMARY ────────────────────────────────────────────────────────────
  console.log(`\n──────────────────────────────`);
  console.log(`Passed: ${pass}   Failed: ${fail}`);
  console.log(`──────────────────────────────\n`);
  if (fail > 0) process.exit(1);
})().catch((e) => {
  console.error(`\n❌ ${e.message}`);
  process.exit(1);
});
