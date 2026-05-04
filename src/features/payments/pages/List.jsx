import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Banknote,
  Search,
  Loader2,
  Plus,
  CheckCircle2,
  Clock,
  ChevronRight,
  ShieldCheck,
  Wallet,
  Hourglass,
  CalendarCheck,
} from "lucide-react";
import { usePaymentStore } from "../store.js";
import { useAuthStore } from "../../auth/store.js";

// FLOW.md item 11 — must mirror PaymentController thresholds.
const TIER_2 = 50_000;
const TIER_3 = 500_000;

function tierFor(amount) {
  const n = Number(amount ?? 0);
  if (n >= TIER_3) return { label: "Tier 3", short: "T3", cls: "bg-warning-soft text-warning border-warning/30" };
  if (n >= TIER_2) return { label: "Tier 2", short: "T2", cls: "bg-info-soft text-info border-info/20" };
  return { label: "Tier 1", short: "T1", cls: "bg-success-soft text-success border-success/30" };
}

const STAGE_SHORT_LABEL = {
  pending_cfo: "Awaiting CFO",
  pending_ceo: "Awaiting CEO",
  cleared_to_pay: "Cleared to pay",
  done: "Done",
};

function fmtINR(n) {
  return `₹${Number(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Compact ₹ formatting for KPI cards: 1234567 → ₹12.3L. */
function fmtCompactINR(n) {
  const v = Number(n ?? 0);
  if (Math.abs(v) >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)}Cr`;
  if (Math.abs(v) >= 100_000) return `₹${(v / 100_000).toFixed(1)}L`;
  if (Math.abs(v) >= 1_000) return `₹${(v / 1_000).toFixed(1)}k`;
  return `₹${v.toFixed(0)}`;
}

function formatDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_TONE = {
  pending: "bg-warning-soft text-warning border-warning/30",
  paid: "bg-success-soft text-success border-success/30",
  rejected: "bg-danger-soft text-danger border-danger/30",
};

function StatusPill({ status }) {
  const Icon = status === "paid" ? CheckCircle2 : Clock;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${
        STATUS_TONE[status] ?? STATUS_TONE.pending
      }`}
    >
      <Icon className="h-3 w-3" strokeWidth={2.5} />
      {status}
    </span>
  );
}

/** Roles that can create a payment from this page. Mirrors PaymentController. */
function canCreatePayment(user) {
  if (!user) return false;
  if (user.role === "admin" || user.role === "accountant") return true;
  if (user.role === "hod" && user.department?.code === "FIN") return true;
  return false;
}

function KpiCard({ label, value, sub, icon: Icon, tone = "neutral", active, onClick }) {
  const tones = {
    neutral: { ring: "border-border", iconBg: "bg-surface-container-high text-text" },
    warning: { ring: "border-warning/20", iconBg: "bg-warning-soft text-warning" },
    success: { ring: "border-success/20", iconBg: "bg-success-soft text-success" },
    info: { ring: "border-info/20", iconBg: "bg-info-soft text-info" },
  };
  const t = tones[tone] ?? tones.neutral;
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`shrink-0 snap-start min-w-[180px] sm:min-w-0 text-left flex flex-col gap-2 p-4 rounded-lg border bg-surface-container-lowest transition-all duration-200 shadow-sm ${
        t.ring
      } ${
        onClick
          ? `hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/40 ${
              active ? "ring-2 ring-primary ring-offset-2 ring-offset-bg" : ""
            }`
          : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-md flex items-center justify-center ${t.iconBg}`}>
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-widest font-bold text-text-muted">
          {label}
        </div>
        <div className="text-xl sm:text-2xl font-black tracking-tight text-text leading-tight">
          {value}
        </div>
        {sub && <div className="text-[11px] text-text-subtle mt-0.5">{sub}</div>}
      </div>
    </Comp>
  );
}

export default function PaymentsListPage() {
  const rows = usePaymentStore((s) => s.items);
  const loading = usePaymentStore((s) => s.loading);
  const fetchAll = usePaymentStore((s) => s.fetchAll);
  const user = useAuthStore((s) => s.user);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Money-focused stats — far more useful than raw counts when the page
  // owner's job is "what do I owe and what's stuck."
  const stats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let outstanding = 0;
    let paidThisMonth = 0;
    let awaitingApproval = 0;
    let clearedReady = 0;
    for (const r of rows) {
      const amt = Number(r.amount) || 0;
      if (r.status === "pending") {
        outstanding += amt;
        if (r.chain_stage === "cleared_to_pay") clearedReady++;
        else if (
          r.chain_stage === "pending_cfo" ||
          r.chain_stage === "pending_ceo"
        ) {
          awaitingApproval++;
        }
      } else if (r.status === "paid" && r.paid_at) {
        const d = new Date(r.paid_at);
        if (!Number.isNaN(d.getTime()) && d >= startOfMonth) paidThisMonth += amt;
      }
    }
    return { outstanding, paidThisMonth, awaitingApproval, clearedReady };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const matchQuery =
        !q ||
        r.number.toLowerCase().includes(q) ||
        r.po_number.toLowerCase().includes(q) ||
        (r.vendor ?? "").toLowerCase().includes(q);
      let matchStatus = true;
      if (status === "pending") matchStatus = r.status === "pending";
      else if (status === "paid") matchStatus = r.status === "paid";
      else if (status === "awaiting") {
        matchStatus =
          r.status === "pending" &&
          (r.chain_stage === "pending_cfo" || r.chain_stage === "pending_ceo");
      } else if (status === "cleared") {
        matchStatus =
          r.status === "pending" && r.chain_stage === "cleared_to_pay";
      } else if (status === "rejected") matchStatus = r.status === "rejected";
      return matchQuery && matchStatus;
    });
  }, [rows, query, status]);

  const showCreate = canCreatePayment(user);

  const filterChips = [
    { key: "all", label: "All", count: rows.length },
    { key: "awaiting", label: "Awaiting approval", count: stats.awaitingApproval },
    { key: "cleared", label: "Cleared to pay", count: stats.clearedReady },
    {
      key: "pending",
      label: "Pending",
      count: rows.filter((r) => r.status === "pending").length,
    },
    {
      key: "paid",
      label: "Paid",
      count: rows.filter((r) => r.status === "paid").length,
    },
  ];

  return (
    <div className="max-w-[1400px] mx-auto pb-20 sm:pb-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-5 sm:mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text tracking-tight flex items-center gap-2">
            <Banknote className="h-7 w-7 text-primary" /> Payments
          </h1>
          <p className="text-text-muted text-sm mt-1 hidden sm:block">
            Vendor payments — issued by Finance against accepted POs.
          </p>
        </div>
        {showCreate && (
          <Link
            to="/app/payments/new"
            className="hidden sm:inline-flex bg-primary hover:brightness-110 text-primary-foreground px-4 py-2 rounded-md font-bold text-sm items-center gap-2 transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus className="h-4 w-4" /> New Payment
          </Link>
        )}
      </div>

      {/* Money-focused KPI strip — horizontal scroll on mobile */}
      <div className="-mx-4 sm:mx-0 mb-5">
        <div className="flex sm:grid sm:grid-cols-4 gap-2 sm:gap-3 px-4 sm:px-0 overflow-x-auto sm:overflow-visible snap-x snap-mandatory pb-1 sm:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <KpiCard
            label="Outstanding"
            value={fmtCompactINR(stats.outstanding)}
            sub={`${rows.filter((r) => r.status === "pending").length} pending`}
            icon={Wallet}
            tone="warning"
          />
          <KpiCard
            label="Paid this month"
            value={fmtCompactINR(stats.paidThisMonth)}
            sub="Funds released"
            icon={CalendarCheck}
            tone="success"
          />
          <KpiCard
            label="Awaiting approval"
            value={stats.awaitingApproval}
            sub="CFO / CEO sign-off"
            icon={Hourglass}
            tone="info"
            onClick={() => setStatus("awaiting")}
            active={status === "awaiting"}
          />
          <KpiCard
            label="Cleared to pay"
            value={stats.clearedReady}
            sub="Finance HOD action"
            icon={ShieldCheck}
            tone="success"
            onClick={() => setStatus("cleared")}
            active={status === "cleared"}
          />
        </div>
      </div>

      {/* Filter chips + search */}
      <div className="glass-card rounded-2xl p-3 mb-4 flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by PAY number, PO, or vendor…"
            className="w-full bg-transparent border border-border rounded-md focus:border-primary focus:ring-0 pl-10 pr-3 py-2 text-sm text-text outline-none"
          />
        </div>
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto -mx-1 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {filterChips.map((f) => {
            const active = status === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatus(f.key)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-surface-container-low text-text-muted border-border hover:bg-surface-container-high"
                }`}
              >
                {f.label}
                <span
                  className={`text-[10px] font-bold rounded px-1 ${
                    active
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "text-text-subtle"
                  }`}
                >
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loading && rows.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-text-muted">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface-container-low rounded-2xl p-12 sm:p-16 flex flex-col items-center text-center border border-dashed border-border">
          <Banknote className="h-9 w-9 text-text-subtle mb-4" strokeWidth={1.5} />
          <h2 className="text-xl font-bold text-text mb-1 tracking-tight">
            {rows.length === 0 ? "No payments yet" : "No matching payments"}
          </h2>
          <p className="text-text-muted text-sm max-w-md">
            {rows.length === 0 && showCreate
              ? "Once a PO is accepted by the vendor, you can issue a payment from here."
              : rows.length === 0
                ? "Vendor payments will appear here once Finance creates them."
                : "Try a different filter or search term."}
          </p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-lg overflow-hidden border border-border shadow-sm">
          {/* Desktop header */}
          <div className="hidden md:flex items-center bg-surface-container-low border-b border-border px-4 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
            <div className="w-32">Number</div>
            <div className="w-32">PO</div>
            <div className="flex-1 min-w-[140px]">Vendor</div>
            <div className="w-32 text-right">Amount</div>
            <div className="w-16 text-center">Tier</div>
            <div className="w-40">Stage</div>
            <div className="w-28">Status</div>
          </div>
          <div className="divide-y divide-border">
            {filtered.map((row) => {
              const tier = tierFor(row.amount);
              const isPending = row.status === "pending";
              const stageLabel =
                isPending && STAGE_SHORT_LABEL[row.chain_stage]
                  ? STAGE_SHORT_LABEL[row.chain_stage]
                  : null;
              return (
                <Link
                  key={row.id ?? row.number}
                  to={`/app/payments/${row.number}`}
                  className="block hover:bg-surface-container-low transition-colors active:bg-surface-container"
                >
                  {/* Mobile card */}
                  <div className="md:hidden flex items-center gap-3 px-4 py-3.5">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-primary font-mono text-[13px]">
                          {row.number}
                        </span>
                        <StatusPill status={row.status} />
                      </div>
                      <div className="text-xs text-text-muted truncate">
                        <span className="font-medium text-text">{row.vendor}</span>
                        {" · "}
                        <span className="font-mono">{row.po_number}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-text font-mono">
                          {fmtINR(row.amount)}
                        </span>
                        <span
                          className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${tier.cls}`}
                        >
                          {tier.short}
                        </span>
                        {stageLabel && (
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-text-muted">
                            · {stageLabel}
                          </span>
                        )}
                        {row.paid_at && (
                          <span className="text-[10px] text-text-subtle">
                            · paid {formatDate(row.paid_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-text-subtle shrink-0" />
                  </div>
                  {/* Desktop row */}
                  <div className="hidden md:flex items-center px-4 py-3 text-sm">
                    <div className="w-32 font-bold text-primary font-mono text-[13px]">
                      {row.number}
                    </div>
                    <div className="w-32 font-mono text-xs text-text-muted">
                      {row.po_number}
                    </div>
                    <div className="flex-1 min-w-[140px] font-semibold text-text truncate pr-2">
                      {row.vendor}
                    </div>
                    <div className="w-32 text-right font-mono font-semibold tabular-nums">
                      {fmtINR(row.amount)}
                    </div>
                    <div className="w-16 text-center">
                      <span
                        className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${tier.cls}`}
                      >
                        {tier.short}
                      </span>
                    </div>
                    <div className="w-40 text-xs text-text-muted">
                      {row.status === "paid" && row.paid_at
                        ? `Paid ${formatDate(row.paid_at)}`
                        : stageLabel ?? "—"}
                    </div>
                    <div className="w-28">
                      <StatusPill status={row.status} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="flex items-center justify-between mt-4 text-xs text-text-muted">
          <span>
            Showing <strong className="text-text">{filtered.length}</strong>
            {filtered.length !== rows.length && (
              <> of <strong className="text-text">{rows.length}</strong></>
            )}{" "}
            payment{filtered.length === 1 ? "" : "s"}
          </span>
        </div>
      )}

      {/* Mobile FAB */}
      {showCreate && (
        <Link
          to="/app/payments/new"
          className="sm:hidden fixed bottom-5 right-4 z-30 bg-primary hover:brightness-110 text-primary-foreground rounded-full shadow-lg w-14 h-14 flex items-center justify-center active:scale-95 transition-transform"
          aria-label="New Payment"
        >
          <Plus className="h-6 w-6" strokeWidth={2.5} />
        </Link>
      )}
    </div>
  );
}
