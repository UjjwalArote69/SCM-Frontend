// Drives PR → RFQ → PO end-to-end so a fresh PO is sitting at "accepted",
// ready for site_person to log a GRN against. Run: node test/setup-grn-fixture.mjs
const BASE = process.env.SUPPLIERSFIRST_API || "http://127.0.0.1:8000/api";
const PASS = "password";

const tokens = {};
const sleep = ms => new Promise(r => setTimeout(r, ms));

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
      console.log(`  login ${email}`);
      return r.data;
    }
    if (r.status === 429) {
      console.log(`  ...throttled, sleeping 65s and retrying ${email}`);
      await sleep(65_000);
      continue;
    }
    throw new Error(`login ${email} failed: ${r.status} ${JSON.stringify(r.data).slice(0,200)}`);
  }
  throw new Error(`login ${email}: throttled too many times`);
}

function num(d) {
  return d?.data?.number || d?.number;
}

function step(label) { console.log(`\n— ${label}`); }

(async () => {
  console.log(`API: ${BASE}\n`);

  step("Login batch 1 (5 users)");
  await login("admin@scm.com");
  await login("employee.it@scm.com");
  await login("hod.it@scm.com");
  await login("cfo.fin@scm.com");
  await login("ceo@scm.com");

  console.log("  ...sleeping 65s for login throttle...");
  await sleep(65_000);

  step("Login batch 2 (4 users)");
  await login("purchase.purch@scm.com");
  await login("hod.purch@scm.com");
  await login("hod.fin@scm.com");
  await login("vendor@acme.com");

  // ── PR ─────────────────────────────────────────────────────────────────
  step("Create PR as employee.it");
  const prCreate = await api("POST", "/prs", {
    token: tokens["employee.it@scm.com"],
    body: {
      title: "GRN fixture PR " + Date.now(),
      priority: "medium",
      business_unit: "BU-1",
      items: [
        { name: "Test Widget", code: "W-001", hsn_code: "8471", uom: "Nos", qty: 10 },
      ],
      justification: "Fixture for GRN flow testing",
    },
  });
  const prNumber = num(prCreate.data);
  if (!prNumber) throw new Error(`PR create failed: ${prCreate.status} ${JSON.stringify(prCreate.data).slice(0,300)}`);
  console.log(`  PR ${prNumber} created`);

  step("Approve PR through HOD → CFO → CEO");
  for (const [email, label] of [
    ["hod.it@scm.com", "HOD"],
    ["cfo.fin@scm.com", "CFO"],
    ["ceo@scm.com", "CEO"],
  ]) {
    const r = await api("POST", `/prs/${prNumber}/status`, {
      token: tokens[email], body: { action: "approve" },
    });
    if (r.status !== 200) throw new Error(`${label} approve PR failed: ${r.status} ${JSON.stringify(r.data).slice(0,300)}`);
    console.log(`  ${label} approved → stage=${r.data?.data?.chain_stage} status=${r.data?.data?.status}`);
  }

  // ── Find Acme vendor name ──────────────────────────────────────────────
  const vlist = await api("GET", "/vendors", { token: tokens["admin@scm.com"] });
  const vendors = vlist.data?.data || vlist.data || [];
  const acme = vendors
    .filter(v => !v.status || v.status === "approved")
    .map(v => v.vendor_name || v.name)
    .find(n => /Acme/i.test(n || ""));
  if (!acme) throw new Error("Could not find Acme vendor");
  console.log(`\n  Vendor: ${acme}`);

  // ── RFQ ────────────────────────────────────────────────────────────────
  step("Create RFQ as purchase.purch (auto-selects vendors)");
  const rfqCreate = await api("POST", "/rfqs", {
    token: tokens["purchase.purch@scm.com"],
    body: {
      title: "GRN fixture RFQ " + Date.now(),
      pr_number: prNumber,
      items: [{ name: "Test Widget", code: "W-001", hsn_code: "8471", uom: "Nos", qty: 10 }],
      vendors: [acme],
      due_date: new Date(Date.now()+7*86400000).toISOString().slice(0,10),
    },
  });
  const rfqNumber = num(rfqCreate.data);
  if (!rfqNumber) throw new Error(`RFQ create failed: ${rfqCreate.status} ${JSON.stringify(rfqCreate.data).slice(0,300)}`);
  console.log(`  RFQ ${rfqNumber} created`);

  step("Acme submits quote");
  {
    const r = await api("POST", `/rfqs/${rfqNumber}/submit`, {
      token: tokens["vendor@acme.com"],
      body: { prices: [95], gst: [18], comment: "GRN fixture quote" },
    });
    if (r.status !== 200) throw new Error(`vendor submit failed: ${r.status} ${JSON.stringify(r.data).slice(0,300)}`);
    console.log(`  Quote submitted, RFQ stage=${r.data?.data?.chain_stage}`);
  }

  step("Consensus: HODs agree on Acme (stop once chain advances past consensus)");
  for (const [email, label] of [
    ["hod.purch@scm.com", "Purchase HOD"],
    ["hod.fin@scm.com", "Finance HOD"],
    ["hod.it@scm.com", "IT HOD (respective)"],
  ]) {
    // Peek at current stage; if already past consensus, stop.
    const peek = await api("GET", `/rfqs/${rfqNumber}`, { token: tokens["admin@scm.com"] });
    const curStage = peek.data?.data?.chain_stage;
    if (curStage && curStage !== "open" && curStage !== "consensus" && curStage !== "compared") {
      console.log(`  (skipping ${label} — RFQ already at stage=${curStage})`);
      continue;
    }
    const r = await api("POST", `/rfqs/${rfqNumber}/agree`, {
      token: tokens[email], body: { vendor: acme },
    });
    if (r.status !== 200) {
      // 409 "already past consensus" is fine; treat as no-op
      if (r.status === 409) {
        console.log(`  ${label}: ${r.data?.message || ""} — skipping`);
        continue;
      }
      throw new Error(`${label} agree failed: ${r.status} ${JSON.stringify(r.data).slice(0,300)}`);
    }
    console.log(`  ${label} agreed → stage=${r.data?.data?.chain_stage} agreed_vendor=${r.data?.data?.consents?.agreed_vendor || ""}`);
  }

  step("CFO + CEO approve RFQ chain");
  for (const [email, label] of [
    ["cfo.fin@scm.com", "CFO"],
    ["ceo@scm.com", "CEO"],
  ]) {
    const r = await api("POST", `/rfqs/${rfqNumber}/status`, {
      token: tokens[email], body: { action: "approve" },
    });
    if (r.status !== 200) throw new Error(`${label} approve RFQ failed: ${r.status} ${JSON.stringify(r.data).slice(0,300)}`);
    console.log(`  ${label} approved → stage=${r.data?.data?.chain_stage}`);
  }

  step("Purchase HOD awards RFQ to Acme");
  {
    const r = await api("POST", `/rfqs/${rfqNumber}/award`, {
      token: tokens["hod.purch@scm.com"], body: { vendor: acme },
    });
    if (r.status !== 200) throw new Error(`award failed: ${r.status} ${JSON.stringify(r.data).slice(0,300)}`);
    console.log(`  Awarded → status=${r.data?.data?.status}`);
  }

  // ── PO ─────────────────────────────────────────────────────────────────
  step("Create PO as purchase.purch");
  const poCreate = await api("POST", "/pos", {
    token: tokens["purchase.purch@scm.com"],
    body: {
      vendor: acme,
      rfq_number: rfqNumber,
      business_unit: "BU-1",
      items: [{ name: "Test Widget", code: "W-001", hsn_code: "8471", uom: "Nos", qty: 10, rate: 95, gst: 18 }],
      expected_delivery: new Date(Date.now()+14*86400000).toISOString().slice(0,10),
    },
  });
  const poNumber = num(poCreate.data);
  if (!poNumber) throw new Error(`PO create failed: ${poCreate.status} ${JSON.stringify(poCreate.data).slice(0,300)}`);
  console.log(`  PO ${poNumber} created → stage=${poCreate.data?.data?.chain_stage}`);

  step("Drive PO chain to done (admin override)");
  {
    let stage = poCreate.data?.data?.chain_stage;
    let advances = 0;
    while (stage && stage !== "done") {
      const r = await api("POST", `/pos/${poNumber}/status`, {
        token: tokens["admin@scm.com"], body: { action: "approve" },
      });
      if (r.status !== 200) throw new Error(`PO approve at ${stage} failed: ${r.status} ${JSON.stringify(r.data).slice(0,300)}`);
      stage = r.data?.data?.chain_stage;
      advances++;
      console.log(`  advance #${advances} → stage=${stage}`);
      if (advances > 10) throw new Error("PO chain advance loop exceeded 10");
    }
  }

  step("Vendor (Acme) accepts PO");
  {
    const r = await api("POST", `/pos/${poNumber}/accept`, { token: tokens["vendor@acme.com"] });
    if (r.status !== 200) throw new Error(`vendor accept failed: ${r.status} ${JSON.stringify(r.data).slice(0,300)}`);
    console.log(`  PO accepted → status=${r.data?.data?.status}`);
  }

  console.log(`\n✅ Fixture ready.\n   PR : ${prNumber}\n   RFQ: ${rfqNumber}\n   PO : ${poNumber}  (status=accepted, ready for GRN)\n`);
  console.log(`Now login as site.ops@scm.com → /app/grn/new → pick PO ${poNumber} → log GRN.`);
})().catch(e => {
  console.error(`\n❌ ${e.message}`);
  process.exit(1);
});
