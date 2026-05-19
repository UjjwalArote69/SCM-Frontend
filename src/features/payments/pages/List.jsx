import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Banknote, Plus, ShieldCheck, Wallet, Hourglass, CalendarCheck,
  ChevronRight, GitBranch, TrendingUp, Building2, Truck,
} from "lucide-react";
import { usePaymentStore } from "../store.js";
import { useAuthStore } from "../../auth/store.js";
import { useCan } from "../../../hooks/useCan.js";
import Skeleton from "../../../components/feedback/Skeleton.jsx";
import client from "../../../api/client.js";
import { usePOStore } from "../../purchase-orders/store.js";
import { useGRNStore } from "../../grn/store.js";

/**
 * FLOW item 49 — Payments parent is a dashboard. No list view here.
 *
 * Each section answers a different question, so nothing repeats:
 *   - KPI strip   : the four headline numbers (item 44 spec)
 *   - Pipeline    : where work is stuck in the approval chain
 *   - Top vendors : who we owe the most
 *   - Trend       : how monthly velocity has shifted
 *   - Nav cards   : tools — deep-link to the focused ledgers (no numbers)
 */

// Per item 40, payments wait at one of these stages.
const PENDING_APPROVAL_STAGES = new Set([
  "pending_finance_hod",
  "pending_cfo",
  "pending_ceo",
]);

function fmtCompactINR(n) {
  const v = Number(n ?? 0);
  if (Math.abs(v) >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)}Cr`;
  if (Math.abs(v) >= 100_000) return `₹${(v / 100_000).toFixed(1)}L`;
  if (Math.abs(v) >= 1_000) return `₹${(v / 1_000).toFixed(1)}k`;
  return `₹${v.toFixed(0)}`;
}


export default function PaymentsListPage() {
  const rows = usePaymentStore((s) => s.items);
  const loading = usePaymentStore((s) => s.loading);
  const fetchAll = usePaymentStore((s) => s.fetchAll);
  const user = useAuthStore((s) => s.user);

  // Outstanding is computed off POs + GRNs (just like the Outstanding page)
  // so the dashboard number matches the page it deep-links into.
  const pos = usePOStore((s) => s.items);
  const fetchPOs = usePOStore((s) => s.fetchAll);
  const grns = useGRNStore((s) => s.items);
  const fetchGRNs = useGRNStore((s) => s.fetchAll);

  // GRNs that have cleared Purchase HOD — precursor work that doesn't yet
  // have a payment record. Pulled off the same endpoint the Awaiting
  // Approval page uses, so the dashboard and the list stay in lockstep.
  const [grnsInFlight, setGrnsInFlight] = useState([]);
  const [grnsLoaded, setGrnsLoaded] = useState(false);
  const reloadGrns = async () => {
    try {
      const r = await client.get("/payments/awaiting-approval");
      setGrnsInFlight(Array.isArray(r.data?.data) ? r.data.data : []);
    } catch {
      setGrnsInFlight([]);
    } finally {
      setGrnsLoaded(true);
    }
  };

  useEffect(() => {
    fetchAll();
    fetchPOs();
    fetchGRNs();
    reloadGrns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Per-PO paid-sum cache (used by both Outstanding and Top-vendors calcs).
  // Same shape as the Outstanding page so numbers match exactly.
  const paidByPo = useMemo(() => {
    const m = new Map();
    for (const p of rows) {
      if (p.status !== "paid") continue;
      m.set(p.po_number, (m.get(p.po_number) ?? 0) + (Number(p.amount) || 0));
    }
    return m;
  }, [rows]);

  // Outstanding rows = one per CEO-approved GRN whose source PO has an
  // open balance. Built identically to /app/payments/outstanding so the
  // dashboard's Outstanding number stays in lockstep with the page it
  // deep-links into.
  const outstandingRows = useMemo(() => {
    const poByNumber = new Map(pos.map((p) => [p.number, p]));
    const out = [];
    for (const g of grns) {
      if (g.chain_stage !== "done" || g.status === "rejected") continue;
      const po = poByNumber.get(g.po_number);
      if (!po) continue;
      const rateMap = new Map();
      for (const it of po.items ?? []) {
        const k = it.code || it.name;
        if (k) rateMap.set(k, Number(it.rate) || 0);
      }
      let grnValue = 0;
      for (const it of g.items ?? []) {
        const k = it.code || it.name;
        const rate = rateMap.get(k) ?? 0;
        const accepted = Math.max(
          0,
          (Number(it.received) || 0) - (Number(it.damaged) || 0),
        );
        grnValue += accepted * rate;
      }
      const poTotal = Number(po.total) || 0;
      const poPaid = paidByPo.get(po.number) ?? 0;
      const poOutstanding = Math.max(0, poTotal - poPaid);
      if (poOutstanding <= 0) continue;
      out.push({ vendor: po.vendor ?? "—", grnValue });
    }
    return out;
  }, [pos, grns, paidByPo]);

  // ─── KPI numbers ──────────────────────────────────────────────────────
  // Outstanding now mirrors the Outstanding page's total — ₹ on
  // CEO-approved GRNs whose source PO isn't fully paid yet. This counts
  // both "no draft yet" and "draft in flight" GRNs as money we owe.
  const stats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let paidFTM = 0, paidCumulative = 0;
    let pendingPayments = 0;
    for (const r of rows) {
      const amt = Number(r.amount) || 0;
      if (r.status === "paid") {
        paidCumulative += amt;
        if (r.paid_at) {
          const d = new Date(r.paid_at);
          if (!Number.isNaN(d.getTime()) && d >= startOfMonth) paidFTM += amt;
        }
      } else if (r.status !== "rejected") {
        if (PENDING_APPROVAL_STAGES.has(r.chain_stage)) pendingPayments++;
      }
    }
    const outstanding = outstandingRows.reduce((s, r) => s + r.grnValue, 0);
    // Awaiting Approval = payments-in-chain + GRNs-in-chain. Both flow
    // through the same Finance HOD → CFO → CEO gates, so a finance lead
    // looking at this dashboard wants the whole queue surfaced.
    const grnsCount = grnsInFlight.length;
    return {
      outstanding,
      outstandingGrns: outstandingRows.length,
      paidFTM,
      paidCumulative,
      awaitingApproval: pendingPayments + grnsCount,
      pendingPayments,
      grnsCount,
    };
  }, [rows, grnsInFlight, outstandingRows]);

  // ─── Approval pipeline — count per stage, payments + GRNs interleaved ─
  // GRNs don't have an amount yet, so they only contribute to the count.
  // Vendor-replacement detour (damaged GRNs) gets its own row so finance
  // can see how many deals are waiting on the vendor side.
  const pipeline = useMemo(() => {
    const buckets = {
      pending_finance_hod:        { label: "Finance HOD",      count: 0, amount: 0, grns: 0 },
      pending_cfo:                { label: "CFO",              count: 0, amount: 0, grns: 0 },
      pending_ceo:                { label: "CEO",              count: 0, amount: 0, grns: 0 },
      pending_vendor_replacement: { label: "Vendor agreement", count: 0, amount: 0, grns: 0 },
      cleared_to_pay:             { label: "Cleared to pay",   count: 0, amount: 0, grns: 0 },
    };
    for (const r of rows) {
      if (r.status === "paid" || r.status === "rejected") continue;
      if (buckets[r.chain_stage]) {
        buckets[r.chain_stage].count++;
        buckets[r.chain_stage].amount += Number(r.amount) || 0;
      }
    }
    for (const g of grnsInFlight) {
      if (buckets[g.chain_stage]) {
        buckets[g.chain_stage].count++;
        buckets[g.chain_stage].grns++;
      }
    }
    return Object.entries(buckets)
      .filter(([, v]) => v.count > 0 || v.label !== "Vendor agreement")
      .map(([k, v]) => ({ key: k, ...v }));
  }, [rows, grnsInFlight]);

  // ─── Top vendors owed ─────────────────────────────────────────────────
  // Aggregates the same outstandingRows used by the Outstanding page so the
  // "who do we owe?" answer here lines up with what shows up there.
  const topVendors = useMemo(() => {
    const byVendor = new Map();
    for (const r of outstandingRows) {
      const v = r.vendor || "—";
      byVendor.set(v, (byVendor.get(v) ?? 0) + r.grnValue);
    }
    return [...byVendor.entries()]
      .map(([vendor, amount]) => ({ vendor, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [outstandingRows]);

  // ─── Monthly trend — paid ₹, last 12 months ───────────────────────────
  // Different from "FTM" + "Cumulative" KPIs (single-period numbers) — this
  // shows the trajectory + month-over-month comparison.
  const monthlyTrend = useMemo(() => {
    const buckets = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleString(undefined, { month: "short" }),
        total: 0,
      });
    }
    const lookup = new Map(buckets.map((b) => [b.key, b]));
    for (const r of rows) {
      if (r.status !== "paid" || !r.paid_at) continue;
      const d = new Date(r.paid_at);
      if (Number.isNaN(d.getTime())) continue;
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (lookup.has(k)) lookup.get(k).total += Number(r.amount) || 0;
    }
    return buckets;
  }, [rows]);

  // Wait for BOTH payments and GRNs to load before flipping out of skeleton,
  // otherwise the Awaiting Approval card flashes 0 → real-count when GRNs
  // arrive a beat after payments do.
  const initialLoading = (loading && rows.length === 0) || !grnsLoaded;
  // Server-authoritative permission — matches the route's <PermissionGate
  // require="payment.create">. Admins manage who has it at /admin/roles.
  const showCreate = useCan("payment.create");

  return (
    <div className="max-w-[1400px] mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-5 sm:mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text tracking-tight flex items-center gap-2">
            <Banknote className="h-7 w-7 text-primary" /> Payments
          </h1>
          <p className="text-text-muted text-sm mt-1 hidden sm:block">
            Snapshot of vendor payments — drill into a sub-page for line-by-line detail.
          </p>
        </div>
        {showCreate && (
          <Link
            to="/app/payments/new"
            className="inline-flex bg-primary hover:brightness-110 text-primary-foreground px-4 py-2 rounded-md font-bold text-sm items-center justify-center gap-2 transition-colors shadow-sm whitespace-nowrap self-start md:self-auto"
          >
            <Plus className="h-4 w-4" /> New Payment
          </Link>
        )}
      </div>

      {/* KPI cards are the navigation — each opens its own page.
          Item 49 + user feedback: no separate nav cards below the diagrams. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {initialLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkKpi key={i} />)
        ) : (
          <>
            <Kpi
              to="/app/payments/awaiting"
              icon={Hourglass}
              tone="info"
              label="Awaiting approval"
              value={stats.awaitingApproval}
              sub={
                stats.grnsCount > 0
                  ? `${stats.pendingPayments} payment${stats.pendingPayments === 1 ? "" : "s"} · ${stats.grnsCount} GRN${stats.grnsCount === 1 ? "" : "s"}`
                  : "Finance HOD / CFO / CEO"
              }
            />
            <Kpi
              to="/app/payments/outstanding"
              icon={Wallet}
              tone="warning"
              label="Outstanding"
              value={fmtCompactINR(stats.outstanding)}
              sub={
                stats.outstandingGrns > 0
                  ? `${stats.outstandingGrns} GRN${stats.outstandingGrns === 1 ? "" : "s"} on open POs`
                  : "All POs settled"
              }
            />
            <Kpi to="/app/payments/ftm"         icon={CalendarCheck} tone="success" label="Payment (FTM)"      value={fmtCompactINR(stats.paidFTM)}                sub="Released this month" />
            <Kpi to="/app/payments/cumulative"  icon={ShieldCheck}   tone="success" label="Cumulative"         value={fmtCompactINR(stats.paidCumulative)}         sub="Lifetime released" />
          </>
        )}
      </div>

      {/* Two charts side-by-side: pipeline + top vendors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard
          icon={GitBranch}
          title="Approval pipeline"
          subtitle="Where work is stuck right now"
          loading={initialLoading}
        >
          <PipelineChart data={pipeline} />
        </ChartCard>

        <ChartCard
          icon={Building2}
          title="Top vendors owed"
          subtitle="The five biggest open balances"
          loading={initialLoading}
        >
          <TopVendorsChart data={topVendors} />
        </ChartCard>
      </div>

      {/* Monthly trend — line, full width */}
      <ChartCard
        icon={TrendingUp}
        title="12-month payment velocity"
        subtitle="₹ released per calendar month"
        loading={initialLoading}
      >
        <TrendLine data={monthlyTrend} />
      </ChartCard>
    </div>
  );
}

// ─── small helpers ─────────────────────────────────────────────────────────

const TONES = {
  warning: { ring: "border-warning/20", iconBg: "bg-warning-soft text-warning", num: "text-warning" },
  success: { ring: "border-success/20", iconBg: "bg-success-soft text-success", num: "text-success" },
  info:    { ring: "border-info/20",    iconBg: "bg-info-soft text-info",       num: "text-info" },
  neutral: { ring: "border-border",     iconBg: "bg-surface-container text-text", num: "text-text" },
};

function Kpi({ icon: Icon, label, value, sub, tone, to }) {
  const t = TONES[tone] ?? TONES.neutral;
  const className = `relative flex flex-col gap-2 p-4 rounded-lg border bg-surface-container-lowest shadow-sm transition-all duration-200 ${t.ring}${
    to ? " group hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/40 cursor-pointer" : ""
  }`;
  const body = (
    <>
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-md flex items-center justify-center ${t.iconBg}`}>
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </div>
        {to && (
          <ChevronRight className="h-4 w-4 text-text-subtle opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-widest font-bold text-text-muted">{label}</div>
        <div className="text-xl sm:text-2xl font-black tracking-tight text-text leading-tight">{value}</div>
        {sub && <div className="text-[11px] text-text-subtle mt-0.5">{sub}</div>}
      </div>
    </>
  );
  if (to) return <Link to={to} className={className}>{body}</Link>;
  return <div className={className}>{body}</div>;
}

function SkKpi() {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-lg border border-border bg-surface-container-lowest shadow-sm">
      <Skeleton className="h-9 w-9 rounded-md" />
      <div className="space-y-1.5">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-2.5 w-28" />
      </div>
    </div>
  );
}

function ChartCard({ icon: Icon, title, subtitle, loading, children }) {
  return (
    <div className="bg-surface-container-lowest border border-border rounded-lg p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-text-muted" />
        <div className="min-w-0">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text">{title}</h2>
          <p className="text-[11px] text-text-subtle">{subtitle}</p>
        </div>
      </div>
      {loading ? <Skeleton className="h-44 w-full" /> : children}
    </div>
  );
}

// ─── Charts — three distinct visualisations ───────────────────────────────

/**
 * Approval pipeline — vertical bars per stage with count + amount label.
 * Tells the story "the queue is 3 deep at CFO, 1 at CEO" — actionable.
 */
function PipelineChart({ data }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) {
    return (
      <div className="h-44 flex flex-col items-center justify-center text-text-subtle text-sm">
        <GitBranch className="h-8 w-8 mb-2" />
        Pipeline is clear — no pending approvals.
      </div>
    );
  }
  const STAGE_COLORS = {
    pending_finance_hod:        "var(--info)",
    pending_cfo:                "var(--warning)",
    pending_ceo:                "var(--danger)",
    pending_vendor_replacement: "var(--warning)",
    cleared_to_pay:             "var(--success)",
  };
  return (
    <div className="space-y-2">
      {data.map((stage) => {
        const widthPct = (stage.count / max) * 100;
        const color = STAGE_COLORS[stage.key] ?? "var(--text-muted)";
        const payments = stage.count - stage.grns;
        return (
          <div key={stage.key} className="space-y-1">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-semibold text-text">{stage.label}</span>
              <span className="text-text-muted inline-flex items-center gap-1.5">
                <span className="font-bold text-text tabular-nums">{stage.count}</span>
                {stage.grns > 0 && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-info-soft text-info text-[9px] font-bold uppercase tracking-wider">
                    <Truck className="h-2.5 w-2.5" strokeWidth={2.5} /> {stage.grns}
                  </span>
                )}
                {stage.amount > 0 && (
                  <>
                    <span className="text-text-subtle">·</span>
                    <span className="text-text-subtle">{fmtCompactINR(stage.amount)}</span>
                  </>
                )}
              </span>
            </div>
            <div className="h-3 bg-surface-container rounded-sm overflow-hidden flex">
              {payments > 0 && (
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${(payments / max) * 100}%`,
                    background: color,
                  }}
                  title={`${payments} payment${payments === 1 ? "" : "s"}`}
                />
              )}
              {stage.grns > 0 && (
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${(stage.grns / max) * 100}%`,
                    background: color,
                    opacity: 0.45,
                    backgroundImage:
                      "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.18) 4px, rgba(255,255,255,0.18) 8px)",
                  }}
                  title={`${stage.grns} GRN${stage.grns === 1 ? "" : "s"} (no payment drafted yet)`}
                />
              )}
              {stage.count === 0 && (
                <div
                  className="h-full"
                  style={{ width: `${widthPct}%`, background: color, opacity: 0.15 }}
                />
              )}
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-3 pt-1 text-[10px] text-text-subtle">
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-2 rounded-sm bg-info" /> Payments
        </span>
        <span className="inline-flex items-center gap-1">
          <span
            className="w-3 h-2 rounded-sm bg-info/45"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.18) 3px, rgba(255,255,255,0.18) 6px)",
            }}
          />
          GRNs in flight
        </span>
      </div>
    </div>
  );
}

/**
 * Top vendors owed — horizontal bars, label inside or beside the bar.
 * Distinct from the donut shape used elsewhere in the app.
 */
function TopVendorsChart({ data }) {
  if (data.length === 0) {
    return (
      <div className="h-44 flex flex-col items-center justify-center text-text-subtle text-sm">
        <Building2 className="h-8 w-8 mb-2" />
        No outstanding vendor balances.
      </div>
    );
  }
  const max = Math.max(1, ...data.map((d) => d.amount));
  return (
    <ul className="space-y-2.5">
      {data.map((v) => {
        const widthPct = (v.amount / max) * 100;
        return (
          <li key={v.vendor} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="font-semibold text-text truncate" title={v.vendor}>{v.vendor}</span>
              <span className="font-bold text-warning tabular-nums shrink-0">{fmtCompactINR(v.amount)}</span>
            </div>
            <div className="h-2.5 bg-surface-container rounded-sm overflow-hidden">
              <div
                className="h-full bg-warning rounded-sm transition-all duration-300"
                style={{ width: `${widthPct}%`, opacity: 0.85 }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Monthly trend — line chart with markers + area fill underneath. Distinct
 * style from the vertical bars used in PipelineChart so the two charts
 * don't visually compete.
 */
function TrendLine({ data }) {
  const max = Math.max(1, ...data.map((d) => d.total));
  const W = 1000, H = 180, padL = 40, padB = 28, padT = 12;
  const innerW = W - padL - 20;
  const innerH = H - padT - padB;
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;
  const xy = (d, i) => ({
    x: padL + i * stepX,
    y: padT + innerH - (d.total / max) * innerH,
  });
  const path = data.map((d, i) => {
    const { x, y } = xy(d, i);
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");
  const area = data.length > 0
    ? `${path} L ${padL + (data.length - 1) * stepX} ${padT + innerH} L ${padL} ${padT + innerH} Z`
    : "";
  // Three y-axis tick lines: 0, max/2, max
  const ticks = [0, 0.5, 1].map((f) => ({
    value: max * f,
    y: padT + innerH - f * innerH,
  }));
  const totalPaid = data.reduce((s, d) => s + d.total, 0);
  if (totalPaid === 0) {
    return (
      <div className="h-44 flex flex-col items-center justify-center text-text-subtle text-sm">
        <TrendingUp className="h-8 w-8 mb-2" />
        No payments released in the last 12 months yet.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="xMidYMid meet">
        {/* y-axis gridlines + labels */}
        {ticks.map((t) => (
          <g key={t.y}>
            <line x1={padL} y1={t.y} x2={W - 20} y2={t.y} stroke="var(--border)" strokeWidth="0.5" />
            <text x={padL - 6} y={t.y + 3} textAnchor="end" className="fill-text-subtle" fontSize="9">
              {fmtCompactINR(t.value)}
            </text>
          </g>
        ))}
        {/* Area fill under line */}
        {area && <path d={area} fill="var(--success)" opacity="0.12" />}
        {/* Trend line */}
        <path d={path} fill="none" stroke="var(--success)" strokeWidth="2" strokeLinejoin="round" />
        {/* Markers + month labels */}
        {data.map((d, i) => {
          const { x, y } = xy(d, i);
          return (
            <g key={d.key}>
              {d.total > 0 && (
                <circle cx={x} cy={y} r="3" fill="var(--success)" stroke="var(--bg)" strokeWidth="1.5" />
              )}
              <text x={x} y={H - 10} textAnchor="middle" className="fill-text-subtle" fontSize="9">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
