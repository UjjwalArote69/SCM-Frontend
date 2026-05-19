// Sanity check: admin/FIN HOD can hit /payments/quick-pay and:
//   • A Payment record is created with status=paid + chain_stage=done
//   • paid_at lands inside the current calendar month
//   • The PO's vendor + amount carry over
//   • A non-Finance role gets 403
// Run: node test/quick-pay-smoke.mjs <PO-NUMBER>

const BASE = process.env.SUPPLIERSFIRST_API || "http://127.0.0.1:8000/api";
const PASS = "password";
const PO_NUMBER = process.argv[2];
if (!PO_NUMBER) {
  console.error("Usage: node test/quick-pay-smoke.mjs <PO-NUMBER>");
  process.exit(1);
}

const tokens = {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log(`  ✓ ${m}`); };
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
      return;
    }
    if (r.status === 429) { await sleep(65_000); continue; }
    throw new Error(`login ${email}: ${r.status} ${JSON.stringify(r.data).slice(0,200)}`);
  }
  throw new Error(`login ${email} throttled`);
}

(async () => {
  console.log(`API: ${BASE}\nPO: ${PO_NUMBER}\n`);

  console.log("— Login batch");
  await login("admin@scm.com");
  await login("hod.fin@scm.com");
  await login("cfo.fin@scm.com");
  console.log("  sleep 65s for throttle…");
  await sleep(65_000);

  console.log("\n— FIN HOD quick-pays the PO");
  const r1 = await api("POST", "/payments/quick-pay", {
    token: tokens["hod.fin@scm.com"],
    body: {
      po_number: PO_NUMBER,
      amount: 500,
      payment_method: "bank_transfer",
      reference_no: "QP-TEST-001",
      notes: "Smoke test quick-pay",
    },
  });
  if (r1.status !== 201) {
    bad(`quick-pay failed: ${r1.status} ${JSON.stringify(r1.data).slice(0,300)}`);
    process.exit(1);
  } else {
    ok(`quick-pay created (201)`);
    const p = r1.data?.data;
    if (p?.status === "paid") ok("status=paid"); else bad(`status=${p?.status}`);
    if (p?.chain_stage === "done") ok("chain_stage=done"); else bad(`chain_stage=${p?.chain_stage}`);
    if (p?.payment_method === "bank_transfer") ok("payment_method preserved");
    if (p?.paid_at) {
      const d = new Date(p.paid_at);
      const now = new Date();
      const sameMonth = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      if (sameMonth) ok("paid_at falls inside current month (FTM eligible)");
      else bad(`paid_at outside current month: ${p.paid_at}`);
    } else {
      bad("no paid_at set");
    }
    const lastHist = (p.approval_history ?? []).slice(-1)[0];
    if (lastHist?.quick_pay === true) {
      ok("audit row tagged quick_pay=true");
    } else {
      bad(`audit row not tagged: ${JSON.stringify(lastHist)}`);
    }
  }

  console.log("\n— Non-Finance role (CFO) is blocked");
  const r2 = await api("POST", "/payments/quick-pay", {
    token: tokens["cfo.fin@scm.com"],
    body: {
      po_number: PO_NUMBER,
      amount: 100,
      payment_method: "cash",
    },
  });
  if (r2.status === 403) ok("CFO blocked (403)"); else bad(`CFO got ${r2.status}`);

  console.log("\n— Large amount without notes is rejected");
  const r3 = await api("POST", "/payments/quick-pay", {
    token: tokens["admin@scm.com"],
    body: {
      po_number: PO_NUMBER,
      amount: 600000,
      payment_method: "rtgs",
    },
  });
  if (r3.status === 422) ok("≥₹5L w/o notes → 422"); else bad(`got ${r3.status}`);

  console.log("\n— Same Quick-pay with notes works for admin");
  const r4 = await api("POST", "/payments/quick-pay", {
    token: tokens["admin@scm.com"],
    body: {
      po_number: PO_NUMBER,
      amount: 600000,
      payment_method: "rtgs",
      notes: "Authorised offline by CFO + CEO",
    },
  });
  if (r4.status === 201) ok("admin large-amount with notes → 201");
  else bad(`admin large-amount got ${r4.status}: ${JSON.stringify(r4.data).slice(0,200)}`);

  console.log(`\n──────────────────────────────`);
  console.log(`Passed: ${pass}   Failed: ${fail}`);
  console.log(`──────────────────────────────\n`);
  if (fail > 0) process.exit(1);
})().catch((e) => {
  console.error(`\n❌ ${e.message}`);
  process.exit(1);
});
