import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  Wallet,
  Package,
  Search,
  ListFilter,
  Layers,
  X as XIcon,
  TrendingUp,
  AlertCircle,
  Receipt,
  CheckCircle2,
  Banknote,
} from "lucide-react";
import { usePOStore } from "../../purchase-orders/store.js";
import { useGRNStore } from "../../grn/store.js";
import { usePaymentStore } from "../store.js";
import RefreshButton from "../../../components/data/RefreshButton.jsx";
import Skeleton from "../../../components/feedback/Skeleton.jsx";
import KpiStatCard from "../../../components/data/KpiStatCard.jsx";
import { useCan } from "../../../hooks/useCan.js";
import { useAuthStore } from "../../auth/store.js";
import QuickPayModal from "../components/QuickPayModal.jsx";

/**
 * FLOW.md items 41 + 42 — Outstanding payments queue.
 *
 * One row per fully-approved GRN that hasn't been settled yet — i.e. the
 * GRN's chain reached `done`, the source PO has been accepted, and the
 * cumulative paid amount on that PO is still less than the PO total.
 *
 * Page shell mirrors the PR/PO/GRN list pattern (eyebrow + bold title,
 * KPI strip, glass-card filter bar with portal popover, card-row list).
 */

function fmtINR(n) {
  return `₹${Number(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function fmtCompactINR(n) {
  const v = Number(n ?? 0);
  if (Math.abs(v) >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)}Cr`;
  if (Math.abs(v) >= 100_000) return `₹${(v / 100_000).toFixed(1)}L`;
  if (Math.abs(v) >= 1_000) return `₹${(v / 1_000).toFixed(1)}k`;
  return `₹${v.toFixed(0)}`;
}

function daysAgo(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const diff = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
  return Math.floor(diff);
}

function safe(v) {
  return v === null || v === undefined || v === "" || v === "null" ? "—" : v;
}

// ─── Filter pill (mobile/desktop chips) ────────────────────────────────────

function FilterPill({ label, count, active, onClick, tone = "neutral", Icon }) {
  const toneCls = {
    neutral: active
      ? "bg-text text-bg border-text shadow-sm"
      : "border-border bg-surface-container-low/60 text-text-muted hover:text-text",
    primary: active
      ? "bg-primary text-primary-foreground border-primary shadow-[0_2px_8px_-2px_color-mix(in_srgb,var(--color-primary)_55%,transparent)]"
      : "border-primary/25 bg-primary-soft/40 text-primary hover:bg-primary-soft/60",
    warning: active
      ? "bg-warning text-white border-warning shadow-[0_2px_8px_-2px_color-mix(in_srgb,var(--color-warning)_55%,transparent)]"
      : "border-warning/25 bg-warning-soft/40 text-warning hover:bg-warning-soft/60",
    info: active
      ? "bg-info text-white border-info shadow-[0_2px_8px_-2px_color-mix(in_srgb,var(--color-info)_55%,transparent)]"
      : "border-info/25 bg-info-soft/40 text-info hover:bg-info-soft/60",
    success: active
      ? "bg-success text-white border-success shadow-[0_2px_8px_-2px_color-mix(in_srgb,var(--color-success)_55%,transparent)]"
      : "border-success/25 bg-success-soft/40 text-success hover:bg-success-soft/60",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-3 py-1.5 text-[12px] font-semibold rounded-full border inline-flex items-center gap-1.5 whitespace-nowrap transition-all active:scale-95 ${toneCls[tone]}`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />}
      <span>{label}</span>
      {count !== undefined && count !== null && (
        <span
          className={`tabular-nums text-[11px] font-bold ${active ? "" : "opacity-70"}`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Filter bar (search + vendor + payment-status popover) ─────────────────

function FilterBar({
  query,
  setQuery,
  vendors,
  vendorFilter,
  setVendorFilter,
  paymentFilter,
  setPaymentFilter,
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [popPos, setPopPos] = useState(null);
  const triggerRef = useRef(null);
  const popRef = useRef(null);

  useEffect(() => {
    if (!moreOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPopPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
  }, [moreOpen]);

  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e) => {
      if (
        triggerRef.current?.contains(e.target) ||
        popRef.current?.contains(e.target)
      )
        return;
      setMoreOpen(false);
    };
    const onScroll = () => setMoreOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [moreOpen]);

  const activeMoreCount =
    (vendorFilter && vendorFilter !== "all" ? 1 : 0) +
    (paymentFilter && paymentFilter !== "all" ? 1 : 0);

  return (
    <div className="glass-card rounded-2xl p-2 sm:p-3 flex items-center gap-2 sm:flex-wrap sm:gap-3">
      <label className="relative flex-1 min-w-0 sm:min-w-[260px] flex items-center gap-2 bg-surface-container-low/60 border border-border rounded-full pl-3.5 pr-2 py-2 cursor-text hover:border-primary/40 focus-within:border-primary/60 transition-colors">
        <Search className="h-3.5 w-3.5 text-text-muted shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GRN, PO, PR, vendor…"
          className="w-full bg-transparent text-sm text-text placeholder:text-text-subtle outline-none min-w-0"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="text-text-muted hover:text-text shrink-0 p-0.5 rounded-full hover:bg-surface-container"
            aria-label="Clear search"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </label>

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setMoreOpen((o) => !o)}
        className={`shrink-0 h-9 sm:h-auto sm:px-4 sm:py-2 px-3 text-[12px] font-semibold rounded-full border inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${
          moreOpen || activeMoreCount > 0
            ? "border-primary/40 bg-primary-soft text-primary"
            : "border-border bg-surface-container-low/60 text-text-muted hover:text-text hover:border-white/20"
        }`}
        aria-label="Filters"
      >
        <ListFilter className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">More filters</span>
        {activeMoreCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold tabular-nums">
            {activeMoreCount}
          </span>
        )}
      </button>

      {moreOpen &&
        popPos &&
        createPortal(
          <div
            ref={popRef}
            className="rounded-2xl border border-border p-4 space-y-3 w-[calc(100vw-2rem)] max-w-[300px]"
            style={{
              position: "fixed",
              top: popPos.top,
              right: Math.max(popPos.right, 16),
              zIndex: 1000,
              backgroundColor: "var(--color-surface)",
              backdropFilter: "blur(14px) saturate(1.1)",
              WebkitBackdropFilter: "blur(14px) saturate(1.1)",
              boxShadow:
                "0 1px 2px rgba(0,0,0,0.06), 0 4px 16px -4px rgba(0,0,0,0.10), 0 24px 48px -16px rgba(0,0,0,0.18)",
            }}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-muted">
                Filters
              </h4>
              {activeMoreCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setVendorFilter("all");
                    setPaymentFilter("all");
                  }}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  Reset
                </button>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted mb-1.5">
                Vendor
              </label>
              <select
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
                className="w-full bg-surface-container-low/60 border border-border rounded-xl py-2 px-3 text-sm text-text outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-colors"
              >
                <option value="all">All vendors</option>
                {vendors.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted mb-1.5">
                Payment status
              </label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="w-full bg-surface-container-low/60 border border-border rounded-xl py-2 px-3 text-sm text-text outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-colors"
              >
                <option value="all">All</option>
                <option value="undrafted">No payment drafted yet</option>
                <option value="in_progress">Payment in approval chain</option>
                <option value="partial">Partially paid</option>
              </select>
            </div>

            <div className="pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="w-full text-[12px] font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-full py-2 transition-all shadow-sm"
              >
                Apply
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

// ─── Skeletons + empty ────────────────────────────────────────────────────

function SkStat() {
  return (
    <div className="glass-card flex items-center gap-3 p-3 sm:p-4 rounded-2xl shrink-0 snap-start min-w-[125px] sm:min-w-0">
      <Skeleton className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl shrink-0" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-2.5 w-14" />
        <Skeleton className="h-6 w-12" />
      </div>
    </div>
  );
}

function SkRow() {
  return (
    <div className="relative flex items-start sm:items-center gap-3 sm:gap-4 pl-4 pr-3 sm:pl-5 sm:pr-4 py-3 sm:py-4 rounded-xl border border-border bg-surface overflow-hidden">
      <span className="absolute left-0 top-0 bottom-0 w-1 bg-surface-container" aria-hidden />
      <Skeleton className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0 min-w-[120px]">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

function EmptyState({ title, body, IconC = Wallet }) {
  return (
    <div className="glass-card w-full rounded-2xl px-6 py-10 sm:py-14 flex flex-col items-center text-center">
      <div className="w-14 h-14 sm:w-16 sm:h-16 bg-success-soft text-success rounded-2xl flex items-center justify-center mb-3 sm:mb-4">
        <IconC className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.75} />
      </div>
      <h2 className="text-base sm:text-lg font-bold text-text mb-1 tracking-tight">
        {title}
      </h2>
      <p className="text-text-muted text-sm max-w-md leading-relaxed">{body}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

const PENDING_PAYMENT_STAGES = new Set([
  "pending_finance_hod",
  "pending_cfo",
  "pending_ceo",
  "cleared_to_pay",
]);

export default function OutstandingPaymentsPage() {
  const pos = usePOStore((s) => s.items);
  const posLoading = usePOStore((s) => s.loading);
  const fetchPOs = usePOStore((s) => s.fetchAll);

  const grns = useGRNStore((s) => s.items);
  const grnsLoading = useGRNStore((s) => s.loading);
  const fetchGRNs = useGRNStore((s) => s.fetchAll);

  const payments = usePaymentStore((s) => s.items);
  const paymentsLoading = usePaymentStore((s) => s.loading);
  const fetchPayments = usePaymentStore((s) => s.fetchAll);

  const canDraftPayment = useCan("payment.create");
  const user = useAuthStore((s) => s.user);
  // Quick-pay (one-shot create + mark paid) is admin / FIN HOD only —
  // mirrors PaymentController::canMarkPaid on the backend.
  const canQuickPay =
    user?.role === "admin"
    || (user?.role === "hod" && user?.department?.code === "FIN");

  const [query, setQuery] = useState("");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [staleOnly, setStaleOnly] = useState(false);
  const [payModalRow, setPayModalRow] = useState(null);

  useEffect(() => {
    fetchPOs();
    fetchGRNs();
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshAll = () => {
    fetchPOs(true);
    fetchGRNs(true);
    fetchPayments(true);
  };

  // ── Derive Outstanding rows ───────────────────────────────────────────
  // One row per CEO-approved GRN whose source PO still has unpaid balance.
  // Each row carries:
  //   • The GRN itself (for click-through + display)
  //   • The matching PO (rate lookup + vendor + balance)
  //   • grnValue        = Σ accepted units × PO rate
  //   • poOutstanding   = PO total − paid sum (across all payments)
  //   • paymentInDraft  = a Payment record exists against this PO and isn't
  //                       yet paid/rejected (so somebody started drafting)
  //   • cleared_to_pay  = payment is cleared by chain but not yet "paid"
  const rows = useMemo(() => {
    const poByNumber = new Map(pos.map((p) => [p.number, p]));

    // Per-PO sum of fully paid payments + tally of in-flight ones.
    const paidByPo = new Map();
    const inflightByPo = new Map();
    const clearedByPo = new Map();
    for (const p of payments) {
      const amt = Number(p.amount) || 0;
      if (p.status === "paid") {
        paidByPo.set(p.po_number, (paidByPo.get(p.po_number) ?? 0) + amt);
      } else if (p.status !== "rejected") {
        if (p.chain_stage === "cleared_to_pay") {
          clearedByPo.set(p.po_number, (clearedByPo.get(p.po_number) ?? 0) + 1);
        } else if (PENDING_PAYMENT_STAGES.has(p.chain_stage)) {
          inflightByPo.set(p.po_number, (inflightByPo.get(p.po_number) ?? 0) + 1);
        }
      }
    }

    return grns
      .filter((g) => g.chain_stage === "done" && g.status !== "rejected")
      .map((g) => {
        const po = poByNumber.get(g.po_number);
        if (!po) return null;
        const rateMap = new Map();
        for (const it of (po.items ?? [])) {
          const k = it.code || it.name;
          if (k) rateMap.set(k, Number(it.rate) || 0);
        }
        let grnValue = 0;
        const rates = [];
        let acceptedUnits = 0;
        for (const it of (g.items ?? [])) {
          const k = it.code || it.name;
          const rate = rateMap.get(k) ?? 0;
          const accepted = Math.max(
            0,
            (Number(it.received) || 0) - (Number(it.damaged) || 0),
          );
          acceptedUnits += accepted;
          grnValue += accepted * rate;
          if (rate > 0) rates.push(rate);
        }
        const poTotal = Number(po.total) || 0;
        const poPaid = paidByPo.get(po.number) ?? 0;
        const poOutstanding = Math.max(0, poTotal - poPaid);
        return {
          grn: g,
          po,
          grnValue,
          poOutstanding,
          poPaid,
          poTotal,
          rateMin: rates.length ? Math.min(...rates) : 0,
          rateMax: rates.length ? Math.max(...rates) : 0,
          acceptedUnits,
          inflightCount: inflightByPo.get(po.number) ?? 0,
          clearedCount: clearedByPo.get(po.number) ?? 0,
          partiallyPaid: poPaid > 0 && poOutstanding > 0,
          approvedAt: g.pm_approved_at ?? g.updated_at ?? g.received_date,
        };
      })
      .filter((r) => r && r.poOutstanding > 0)
      .sort((a, b) => {
        // Largest open balance first, then oldest approval.
        const diff = b.grnValue - a.grnValue;
        if (Math.abs(diff) > 0.0001) return diff;
        return new Date(a.approvedAt ?? 0) - new Date(b.approvedAt ?? 0);
      });
  }, [pos, payments, grns]);

  // ── KPI counts from unfiltered rows ───────────────────────────────────
  const counts = useMemo(() => {
    let totalGrns = rows.length;
    let totalAmount = 0;
    let largest = 0;
    let oldestAge = 0;
    let stale = 0;
    let undrafted = 0;
    let inProgress = 0;
    let partial = 0;
    let cleared = 0;
    for (const r of rows) {
      totalAmount += r.grnValue;
      if (r.grnValue > largest) largest = r.grnValue;
      const age = daysAgo(r.approvedAt);
      if (age !== null) {
        if (age > oldestAge) oldestAge = age;
        if (age >= 7) stale += 1;
      }
      if (r.inflightCount === 0 && r.clearedCount === 0 && r.poPaid === 0) undrafted++;
      if (r.inflightCount > 0) inProgress++;
      if (r.partiallyPaid) partial++;
      if (r.clearedCount > 0) cleared++;
    }
    const avg = totalGrns > 0 ? totalAmount / totalGrns : 0;
    return { totalGrns, totalAmount, largest, oldestAge, stale, undrafted, inProgress, partial, cleared, avg };
  }, [rows]);

  // ── Build option lists ───────────────────────────────────────────────
  const vendors = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => r.po?.vendor && set.add(r.po.vendor));
    return [...set].sort();
  }, [rows]);

  // ── Filter pipeline ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const matchQuery = !q
        || r.grn.number.toLowerCase().includes(q)
        || r.po.number.toLowerCase().includes(q)
        || (r.po.pr_number ?? "").toLowerCase().includes(q)
        || (r.po.vendor ?? "").toLowerCase().includes(q);
      const matchVendor = vendorFilter === "all" || r.po.vendor === vendorFilter;
      let matchPayment = true;
      if (paymentFilter === "undrafted") {
        matchPayment =
          r.inflightCount === 0 && r.clearedCount === 0 && r.poPaid === 0;
      } else if (paymentFilter === "in_progress") {
        matchPayment = r.inflightCount > 0 || r.clearedCount > 0;
      } else if (paymentFilter === "partial") {
        matchPayment = r.partiallyPaid;
      }
      const age = daysAgo(r.approvedAt);
      const matchStale = !staleOnly || (age !== null && age >= 7);
      return matchQuery && matchVendor && matchPayment && matchStale;
    });
  }, [rows, query, vendorFilter, paymentFilter, staleOnly]);

  const initialLoading =
    (posLoading || grnsLoading || paymentsLoading)
    && pos.length === 0;

  const hasActiveFilter =
    query
    || vendorFilter !== "all"
    || paymentFilter !== "all"
    || staleOnly;

  const clearAll = () => {
    setQuery("");
    setVendorFilter("all");
    setPaymentFilter("all");
    setStaleOnly(false);
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-8 space-y-4 sm:space-y-6">
      {/* Breadcrumb */}
      <nav className="text-[11px] sm:text-[12px] font-medium text-text-muted flex items-center gap-1.5">
        <Link to="/app/payments" className="hover:text-primary transition-colors">
          Payments
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-text-subtle" />
        <span className="text-text">Outstanding</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-text-muted">
            <Layers className="h-3 w-3" strokeWidth={2} />
            <span className="text-[10px] font-semibold tracking-[0.22em] uppercase">
              Finance · Open Balances
            </span>
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-bold text-text leading-tight tracking-tight mt-1 flex items-center gap-2">
            <Wallet className="h-6 w-6 sm:h-7 sm:w-7 text-warning" strokeWidth={2.25} />
            Outstanding
          </h1>
          <p className="hidden sm:block text-text-muted text-sm mt-1.5">
            CEO-approved GRNs whose source PO hasn't been fully paid yet. Once a GRN's PO is paid in full it drops off.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <RefreshButton onRefresh={refreshAll} loading={posLoading || paymentsLoading || grnsLoading} />
        </div>
      </div>

      {/* KPI strip */}
      <div className="hidden sm:grid sm:grid-cols-5 gap-4">
        {initialLoading ? (
          Array.from({ length: 5 }).map((_, i) => <SkStat key={i} />)
        ) : (
          <>
            <KpiStatCard
              label="Total Outstanding"
              value={fmtCompactINR(counts.totalAmount)}
              icon={Wallet}
              tone="warning"
              active={false}
              onClick={undefined}
            />
            <KpiStatCard
              label="GRNs to settle"
              value={counts.totalGrns}
              icon={Package}
              tone="info"
              active={!hasActiveFilter}
              onClick={clearAll}
            />
            <KpiStatCard
              label="Largest single"
              value={fmtCompactINR(counts.largest)}
              icon={TrendingUp}
              tone="primary"
            />
            <KpiStatCard
              label="No draft yet"
              value={counts.undrafted}
              icon={Receipt}
              tone="warning"
              active={paymentFilter === "undrafted"}
              onClick={() =>
                setPaymentFilter((p) => p === "undrafted" ? "all" : "undrafted")
              }
            />
            <KpiStatCard
              label="Stale ≥7d"
              value={counts.stale}
              icon={AlertCircle}
              tone={counts.stale > 0 ? "danger" : "neutral"}
              active={staleOnly}
              onClick={() => setStaleOnly((s) => !s)}
            />
          </>
        )}
      </div>

      {/* Mobile filter pills */}
      <div className="sm:hidden flex flex-wrap gap-1.5">
        {initialLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))
        ) : (
          <>
            <FilterPill
              label="All"
              count={counts.totalGrns}
              tone="neutral"
              active={!hasActiveFilter}
              onClick={clearAll}
            />
            <FilterPill
              label="No draft"
              count={counts.undrafted}
              tone="warning"
              active={paymentFilter === "undrafted"}
              onClick={() =>
                setPaymentFilter((p) => p === "undrafted" ? "all" : "undrafted")
              }
            />
            <FilterPill
              label="In progress"
              count={counts.inProgress}
              tone="info"
              active={paymentFilter === "in_progress"}
              onClick={() =>
                setPaymentFilter((p) => p === "in_progress" ? "all" : "in_progress")
              }
            />
            <FilterPill
              label="Stale"
              count={counts.stale}
              tone="danger"
              Icon={AlertCircle}
              active={staleOnly}
              onClick={() => setStaleOnly((s) => !s)}
            />
          </>
        )}
      </div>

      {/* Filter bar */}
      <FilterBar
        query={query}
        setQuery={setQuery}
        vendors={vendors}
        vendorFilter={vendorFilter}
        setVendorFilter={setVendorFilter}
        paymentFilter={paymentFilter}
        setPaymentFilter={setPaymentFilter}
      />

      {/* Active filter strip */}
      {hasActiveFilter && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
          <span className="hidden sm:inline">Filtering by:</span>
          {vendorFilter !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-info-soft text-info font-semibold text-[10px]">
              Vendor: {vendorFilter}
              <button
                type="button"
                onClick={() => setVendorFilter("all")}
                className="hover:brightness-110 -mr-0.5"
                aria-label="Clear vendor filter"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          )}
          {paymentFilter !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-soft text-primary font-bold uppercase tracking-wider text-[10px]">
              {paymentFilter.replace("_", " ")}
              <button
                type="button"
                onClick={() => setPaymentFilter("all")}
                className="hover:brightness-110 -mr-0.5"
                aria-label="Clear payment status filter"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          )}
          {staleOnly && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-danger-soft text-danger font-bold uppercase tracking-wider text-[10px]">
              Stale ≥7d
              <button
                type="button"
                onClick={() => setStaleOnly(false)}
                className="hover:brightness-110 -mr-0.5"
                aria-label="Clear stale filter"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          )}
          {query && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container border border-border text-text font-semibold text-[10px] max-w-[160px]">
              <span className="truncate">&ldquo;{query}&rdquo;</span>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-text-muted hover:text-text -mr-0.5"
                aria-label="Clear search"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={clearAll}
            className="text-[11px] text-text-muted hover:text-primary font-semibold underline-offset-2 hover:underline sm:ml-auto"
          >
            Clear all
          </button>
        </div>
      )}

      {/* List */}
      {initialLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => <SkRow key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        hasActiveFilter ? (
          <EmptyState
            title="No matches"
            body="Nothing matches the filters above. Try clearing one to broaden the search."
            IconC={Search}
          />
        ) : (
          <EmptyState
            title="Nothing outstanding"
            body="Every approved GRN has been fully settled. Good place to be."
            IconC={CheckCircle2}
          />
        )
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((r) => (
            <OutstandingRow
              key={r.grn.number}
              row={r}
              canDraftPayment={canDraftPayment}
              canQuickPay={canQuickPay}
              onQuickPay={() => setPayModalRow(r)}
            />
          ))}
        </div>
      )}

      {payModalRow && (
        <QuickPayModal
          row={payModalRow}
          onClose={() => setPayModalRow(null)}
          onPaid={() => {
            setPayModalRow(null);
            // Force-refresh all three so FTM/Cumulative pick up the new
            // paid Payment instantly and Outstanding drops this GRN.
            refreshAll();
          }}
        />
      )}

      {/* Footer */}
      {filtered.length > 0 && !initialLoading && (
        <div className="flex items-center justify-center sm:justify-between text-xs text-text-muted px-1 pt-1">
          <span className="text-center sm:text-left">
            Showing <strong className="text-text">{filtered.length}</strong>
            {filtered.length !== counts.totalGrns && (
              <>
                {" "}of <strong className="text-text">{counts.totalGrns}</strong>
              </>
            )}{" "}
            GRN{filtered.length === 1 ? "" : "s"} ·{" "}
            <strong className="text-text">{fmtCompactINR(filtered.reduce((s, r) => s + r.grnValue, 0))}</strong> filtered
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────

/**
 * Postmark-style two-part chip used to surface PR/PO/GRN references.
 * Label sleeve is tone-tinted (the role this ref plays in the chain),
 * value sits in mono with tabular-nums + tight letter-spacing so a column
 * of these reads like a stack of file stamps.
 */
function RefChip({ label, value, tone = "muted" }) {
  const styles = {
    primary: {
      sleeve: "bg-primary-soft text-primary",
      sep:    "bg-primary/20",
      value:  "text-primary",
      border: "border-primary/20",
    },
    info: {
      sleeve: "bg-info-soft text-info",
      sep:    "bg-info/20",
      value:  "text-info",
      border: "border-info/20",
    },
    muted: {
      sleeve: "bg-surface-container-low text-text-muted",
      sep:    "bg-border",
      value:  "text-text-muted",
      border: "border-border/60",
    },
  }[tone] ?? {
    sleeve: "bg-surface-container-low text-text-muted",
    sep:    "bg-border",
    value:  "text-text-muted",
    border: "border-border/60",
  };
  return (
    <span
      className={`inline-flex items-stretch rounded-md border bg-surface-container-lowest/60 backdrop-blur-sm overflow-hidden shrink-0 transition-colors hover:bg-surface-container-low/60 ${styles.border}`}
    >
      <span
        className={`px-1.5 py-1 text-[8.5px] font-black uppercase tracking-[0.2em] flex items-center leading-none ${styles.sleeve}`}
      >
        {label}
      </span>
      <span className={`w-px ${styles.sep}`} aria-hidden />
      <span
        className={`px-2 py-1 font-mono font-semibold text-[11px] tabular-nums tracking-tight flex items-center leading-none ${styles.value}`}
        style={{ fontFeatureSettings: '"tnum" 1, "ss01" 1' }}
      >
        {value}
      </span>
    </span>
  );
}

function OutstandingRow({ row, canDraftPayment, canQuickPay, onQuickPay }) {
  const r = row;
  const age = daysAgo(r.approvedAt);
  const stale = age !== null && age >= 7;
  const veryStale = age !== null && age >= 14;

  // Status copy + tone — drives the dot, text colour, and label.
  const status = (() => {
    if (r.partiallyPaid)     return { text: "Partially paid",  dot: "bg-info",    cls: "text-info" };
    if (r.clearedCount > 0)  return { text: "Cleared to pay",  dot: "bg-success", cls: "text-success" };
    if (r.inflightCount > 0) return { text: "Draft in chain",  dot: "bg-info",    cls: "text-info" };
    return                          { text: "No draft yet",    dot: "bg-warning", cls: "text-warning" };
  })();

  // Stale escalation drives the amount eyebrow + amount colour + left
  // accent bar + corner glow — a row that's been sitting for 14+ days
  // should command the eye instantly.
  const escalation = veryStale
    ? {
        eyebrowText: "Overdue ≥14d",
        eyebrowCls:  "text-danger",
        amountCls:   "text-danger",
        barCls:      "bg-gradient-to-b from-danger via-danger to-danger/70",
        borderCls:   "border-danger/30",
        bgCls:       "bg-danger-soft/[0.06]",
        hoverBg:     "hover:bg-danger-soft/[0.12]",
        hoverShadow: "hover:shadow-[0_8px_32px_-12px_color-mix(in_srgb,var(--color-danger)_55%,transparent)]",
        glowCls:     "bg-danger/25",
      }
    : stale
      ? {
          eyebrowText: "Stale ≥7d",
          eyebrowCls:  "text-warning",
          amountCls:   "text-warning",
          barCls:      "bg-gradient-to-b from-warning via-warning to-warning/70",
          borderCls:   "border-warning/30",
          bgCls:       "bg-warning-soft/[0.06]",
          hoverBg:     "hover:bg-warning-soft/[0.12]",
          hoverShadow: "hover:shadow-[0_8px_28px_-12px_color-mix(in_srgb,var(--color-warning)_50%,transparent)]",
          glowCls:     "bg-warning/20",
        }
      : {
          eyebrowText: "Outstanding",
          eyebrowCls:  "text-warning/70",
          amountCls:   "text-warning",
          barCls:      "bg-warning/60",
          borderCls:   "border-border",
          bgCls:       "bg-surface-container-lowest/40",
          hoverBg:     "hover:bg-surface-container-low/40",
          hoverShadow: "hover:shadow-[0_6px_20px_-12px_color-mix(in_srgb,var(--color-warning)_40%,transparent)]",
          glowCls:     "bg-warning/15",
        };

  const ageCls = veryStale
    ? "text-danger"
    : stale
      ? "text-warning"
      : "text-text-muted";

  return (
    <Link
      to={`/app/grn/${r.grn.number}`}
      className={`group relative block rounded-xl border overflow-hidden backdrop-blur-sm transition-all duration-200 hover:-translate-y-px hover:border-primary/40 ${escalation.borderCls} ${escalation.bgCls} ${escalation.hoverBg} ${escalation.hoverShadow}`}
    >
      {/* Left accent bar — colour-codes urgency, full height */}
      <span
        className={`absolute left-0 top-0 bottom-0 w-[3px] ${escalation.barCls}`}
        aria-hidden
      />

      {/* Soft corner watermark — editorial atmosphere, low-opacity */}
      <span
        className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-50 group-hover:opacity-80 transition-opacity duration-500 ${escalation.glowCls}`}
        aria-hidden
      />

      <div className="relative pl-5 sm:pl-6 pr-3 sm:pr-4 py-3.5 sm:py-4">
        {/* ── Hero row: Vendor (left) + Amount with eyebrow (right) ── */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-text-subtle mb-1 leading-none">
              Vendor
            </div>
            <h3
              className="text-[15px] sm:text-[16.5px] font-semibold text-text truncate leading-tight tracking-tight"
              style={{ fontFeatureSettings: '"ss01" 1' }}
            >
              {safe(r.po.vendor)}
            </h3>
          </div>
          <div className="text-right shrink-0">
            <div
              className={`text-[9px] font-black uppercase tracking-[0.22em] mb-1 leading-none ${escalation.eyebrowCls}`}
            >
              {escalation.eyebrowText}
            </div>
            <div
              className={`font-mono font-black tabular-nums text-[20px] sm:text-[24px] leading-none tracking-tight whitespace-nowrap ${escalation.amountCls}`}
              style={{ fontFeatureSettings: '"tnum" 1, "ss01" 1' }}
            >
              {fmtINR(r.grnValue)}
            </div>
          </div>
        </div>

        {/* Hairline divider with gradient fade — editorial framing */}
        <div
          className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-3"
          aria-hidden
        />

        {/* ── Meta row: ref stamps + status + age + action ─────────── */}
        <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
          {/* Ref stamps */}
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <RefChip label="GRN" value={r.grn.number} tone="primary" />
            {r.po?.number && <RefChip label="PO" value={r.po.number} tone="info" />}
            {r.po?.pr_number && <RefChip label="PR" value={r.po.pr_number} tone="muted" />}
          </div>

          {/* Status + age + action — right cluster */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Age — uppercase tabular, escalates with staleness */}
            {age !== null && (
              <span
                className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] font-bold whitespace-nowrap ${ageCls}`}
              >
                {(stale || veryStale) && (
                  <AlertCircle className="h-3 w-3 shrink-0" strokeWidth={2.5} />
                )}
                <span className="tabular-nums" style={{ fontFeatureSettings: '"tnum" 1' }}>
                  {age}d
                </span>
              </span>
            )}

            {/* Vertical separator */}
            <span className="hidden sm:inline-block h-3.5 w-px bg-border" aria-hidden />

            {/* Status — small uppercase pill, dot + text */}
            <span
              className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] font-bold whitespace-nowrap ${status.cls}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden />
              <span className="hidden sm:inline">{status.text}</span>
              <span className="sm:hidden">
                {/* shorter labels on mobile */}
                {status.text === "No draft yet" ? "No draft"
                  : status.text === "Draft in chain" ? "In chain"
                  : status.text === "Cleared to pay" ? "Cleared"
                  : "Partial"}
              </span>
            </span>

            {/* Vertical separator */}
            <span className="hidden sm:inline-block h-3.5 w-px bg-border" aria-hidden />

            <RowPayActions
              row={r}
              canDraftPayment={canDraftPayment}
              canQuickPay={canQuickPay}
              onQuickPay={onQuickPay}
              compact
            />
            <ChevronRight
              className="h-4 w-4 text-text-subtle group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0"
              aria-hidden
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

/**
 * Renders the per-row action cluster: a prominent "Pay" / "Mark as paid"
 * button for users who can settle, or a "View draft" link for others when
 * a payment is already in flight. The whole row is wrapped in a <Link>
 * so the buttons stopPropagation + preventDefault to avoid hijacking it.
 */
function RowPayActions({ row, canDraftPayment, canQuickPay, onQuickPay, compact = false }) {
  const r = row;
  const hasInFlight = r.inflightCount > 0 || r.clearedCount > 0;

  // Quick-pay (admin/FIN HOD): bypasses the chain. Shown when no payment
  // is in flight yet — once a draft exists we route to it instead.
  if (canQuickPay && !hasInFlight) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onQuickPay?.();
        }}
        className={`inline-flex items-center gap-1 font-bold rounded-full bg-success text-white hover:brightness-110 transition-all shadow-sm active:scale-95 ${
          compact
            ? "px-2.5 py-1 text-[11px]"
            : "px-3 py-1.5 text-[12px]"
        }`}
      >
        <Banknote className="h-3.5 w-3.5" strokeWidth={2.5} />
        Pay
      </button>
    );
  }

  // In-flight: take user to the existing payment record so they can act on it.
  if (hasInFlight) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // Deep-link to Awaiting Approval page; the row will be there.
          window.location.href = `/app/payments/awaiting?q=${encodeURIComponent(r.po.number)}`;
        }}
        className={`inline-flex items-center gap-1 font-bold rounded-full border border-info/30 bg-info-soft text-info hover:bg-info-soft/80 transition-all ${
          compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-[12px]"
        }`}
      >
        View draft <ChevronRight className="h-3 w-3" />
      </button>
    );
  }

  // No in-flight draft, but the user can create a Payment via the normal
  // chain (accountant / Finance HOD without quick-pay).
  if (canDraftPayment) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          window.location.href = `/app/payments/new?po=${r.po.number}&grn=${r.grn.number}`;
        }}
        className={`inline-flex items-center gap-1 font-bold rounded-full bg-primary text-primary-foreground hover:brightness-110 transition-all shadow-sm active:scale-95 ${
          compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-[12px]"
        }`}
      >
        Draft
      </button>
    );
  }
  return null;
}
