import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  Download,
  Plus,
  Search,
  ListFilter,
  Package,
  MoreVertical,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  TrendingUp,
  ChevronRight,
  Layers,
  X as XIcon,
  Calendar,
  ShieldCheck,
} from "lucide-react";
import { useGRNStore } from "../store.js";
import { useToast } from "../../../hooks/useToast.jsx";
import { useAuthStore } from "../../auth/store.js";
import { useCan } from "../../../hooks/useCan.js";
import RefreshButton from "../../../components/data/RefreshButton.jsx";
import Skeleton from "../../../components/feedback/Skeleton.jsx";
import KpiStatCard from "../../../components/data/KpiStatCard.jsx";
import SiteHero from "../components/SiteHero.jsx";

// Roles that should see the approval-chain badges on each row.
const APPROVER_ROLES = new Set([
  "admin",
  "hod",
  "cfo",
  "ceo",
  "project_manager",
]);

function safe(v) {
  return v === null || v === undefined || v === "" || v === "null" ? "—" : v;
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

function ApprovalBadge({ label, state, title }) {
  const styles = {
    approved: "bg-success-soft text-success border-success/30",
    pending: "bg-warning-soft text-warning border-warning/30",
    rejected: "bg-danger-soft text-danger border-danger/30",
    detour: "bg-info-soft text-info border-info/30",
    waiting: "bg-surface-container border-border text-text-subtle",
  };
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[42px] h-6 rounded px-1.5 text-[10px] font-bold border ${styles[state] ?? styles.waiting}`}
      title={title ?? `${label}: ${state}`}
    >
      {label}
    </span>
  );
}

// Fixed GRN chain (FLOW.md item 52) — clean GRNs flow PM → PURCH → FIN → CFO
// → CEO → done. Damaged GRNs detour at pending_vendor_replacement between
// PURCH and FIN, shown as a separate VEN badge.
const GRN_CHAIN = [
  { key: "pending_pm",            label: "PM" },
  { key: "pending_purchase_hod",  label: "PURCH" },
  { key: "pending_finance_hod",   label: "FIN" },
  { key: "pending_cfo",           label: "CFO" },
  { key: "pending_ceo",           label: "CEO" },
];

/**
 * Per-stage state — reads approval_history + chain_stage.
 *
 * Walks the history newest-first. Any "chain-reset" event we hit
 * (`reopen` after a rejection, `chain_restarted` after the vendor +
 * site agree on a replacement plan, or an admin `rewind`) invalidates
 * everything that came before it: PM / Purchase HOD might have signed
 * off in an earlier round, but those approvals don't count toward the
 * round currently running. Only approvals AFTER the most recent reset
 * are counted.
 */
function stageStateFor(stage, idx, row) {
  const history = Array.isArray(row.approval_history) ? row.approval_history : [];
  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i];
    if (!h) continue;
    // Anything that resets the chain wipes older decisions for badge purposes.
    if (
      h.action === "reopen"
      || h.action === "chain_restarted"
      || h.action === "rewind"
    ) {
      break;
    }
    if (h.stage === stage.key) {
      if (h.action === "approve") return "approved";
      if (h.action === "reject" || h.action === "force_reject") return "rejected";
    }
  }
  if (row.status === "rejected" && row.chain_stage === stage.key) return "rejected";
  // Force-approve sets chain_stage='done' AND status != 'rejected' — paint
  // the whole chain green.
  if (row.chain_stage === "done" && row.status !== "rejected") return "approved";

  // Special-case the damage detour stage so the badges still reflect
  // progress accurately even though pending_vendor_replacement isn't in
  // GRN_CHAIN: PM (idx 0) + Purchase HOD (idx 1) have approved to reach it.
  if (row.chain_stage === "pending_vendor_replacement") {
    return idx <= 1 ? "approved" : "waiting";
  }

  const currentIdx = GRN_CHAIN.findIndex((s) => s.key === row.chain_stage);
  if (currentIdx === -1) return "waiting";
  if (idx < currentIdx) return "approved";
  if (idx === currentIdx) return "pending";
  return "waiting";
}

// Receipt-status tone (what we render in the pill).
const STATUS_TONE = {
  full: {
    cls: "bg-success-soft text-success border-success/30",
    icon: CheckCircle2,
    label: "Full",
  },
  partial: {
    cls: "bg-warning-soft text-warning border-warning/30",
    icon: Clock,
    label: "Partial",
  },
  rejected: {
    cls: "bg-danger-soft text-danger border-danger/30",
    icon: XCircle,
    label: "Rejected",
  },
  done: {
    cls: "bg-success-soft text-success border-success/30",
    icon: ShieldCheck,
    label: "Approved",
  },
  damage: {
    cls: "bg-warning-soft text-warning border-warning/30",
    icon: AlertTriangle,
    label: "Damaged",
  },
};

function StatusPill({ status }) {
  const tone = STATUS_TONE[status] ?? STATUS_TONE.partial;
  const Icon = tone.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${tone.cls}`}
    >
      <Icon className="h-3 w-3" strokeWidth={2.5} />
      {tone.label}
    </span>
  );
}

/**
 * Compact mobile-first filter chip — same pattern as PR/PO so the three
 * pages feel identical on phones.
 */
function StatusFilterPill({ label, count, active, onClick, tone = "neutral" }) {
  const toneCls = {
    neutral: active
      ? "bg-text text-bg border-text shadow-sm"
      : "border-border bg-surface-container-low/60 text-text-muted hover:text-text",
    warning: active
      ? "bg-warning text-white border-warning shadow-[0_2px_8px_-2px_color-mix(in_srgb,var(--color-warning)_55%,transparent)]"
      : "border-warning/25 bg-warning-soft/40 text-warning hover:bg-warning-soft/60",
    success: active
      ? "bg-success text-white border-success shadow-[0_2px_8px_-2px_color-mix(in_srgb,var(--color-success)_55%,transparent)]"
      : "border-success/25 bg-success-soft/40 text-success hover:bg-success-soft/60",
    danger: active
      ? "bg-danger text-white border-danger shadow-[0_2px_8px_-2px_color-mix(in_srgb,var(--color-danger)_55%,transparent)]"
      : "border-danger/25 bg-danger-soft/40 text-danger hover:bg-danger-soft/60",
    info: active
      ? "bg-info text-white border-info shadow-[0_2px_8px_-2px_color-mix(in_srgb,var(--color-info)_55%,transparent)]"
      : "border-info/25 bg-info-soft/40 text-info hover:bg-info-soft/60",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-3 py-1.5 text-[12px] font-semibold rounded-full border inline-flex items-center gap-1.5 whitespace-nowrap transition-all active:scale-95 ${toneCls[tone]}`}
    >
      <span>{label}</span>
      <span className={`tabular-nums text-[11px] font-bold ${active ? "" : "opacity-70"}`}>
        {count}
      </span>
    </button>
  );
}

const StatCard = KpiStatCard;

function FilterBar({
  query,
  setQuery,
  dateRange,
  setDateRange,
  vendors,
  poNumbers,
  vendorFilter,
  setVendorFilter,
  poFilter,
  setPoFilter,
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
    (poFilter && poFilter !== "all" ? 1 : 0);
  const activeMobileCount = activeMoreCount + (dateRange !== "Last 30 Days" ? 1 : 0);

  return (
    <div className="glass-card rounded-2xl p-2 sm:p-3 flex items-center gap-2 sm:flex-wrap sm:gap-3">
      <label className="relative flex-1 min-w-0 sm:min-w-[260px] flex items-center gap-2 bg-surface-container-low/60 border border-border rounded-full pl-3.5 pr-2 py-2 cursor-text hover:border-primary/40 focus-within:border-primary/60 transition-colors">
        <Search className="h-3.5 w-3.5 text-text-muted shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GRN, PO, vendor…"
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

      <div className="hidden sm:block relative">
        <Calendar
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
          style={{ color: "var(--text)" }}
          strokeWidth={2.5}
        />
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="bg-surface-container-low/60 border border-border rounded-full focus:border-primary py-2 pl-10 pr-8 text-[12px] font-semibold text-text-muted hover:text-text outline-none transition-colors cursor-pointer"
        >
          <option>Last 30 Days</option>
          <option>Last 7 Days</option>
          <option>This Quarter</option>
          <option>All Time</option>
        </select>
      </div>

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setMoreOpen((o) => !o)}
        className={`shrink-0 h-9 sm:h-auto sm:px-4 sm:py-2 px-3 text-[12px] font-semibold rounded-full border inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${
          moreOpen || activeMobileCount > 0
            ? "border-primary/40 bg-primary-soft text-primary"
            : "border-border bg-surface-container-low/60 text-text-muted hover:text-text hover:border-white/20"
        }`}
        aria-label="Filters"
      >
        <ListFilter className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">More filters</span>
        {activeMobileCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold tabular-nums">
            {activeMobileCount}
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
              {(activeMoreCount > 0 || dateRange !== "Last 30 Days") && (
                <button
                  type="button"
                  onClick={() => {
                    setVendorFilter("all");
                    setPoFilter("all");
                    setDateRange("Last 30 Days");
                  }}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="sm:hidden">
              <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted mb-1.5 inline-flex items-center gap-1.5">
                <Calendar
                  className="h-3.5 w-3.5"
                  style={{ color: "var(--text)" }}
                  strokeWidth={2.5}
                />
                Time range
              </label>
              <div className="relative">
                <Calendar
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                  style={{ color: "var(--text)" }}
                  strokeWidth={2.5}
                />
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full bg-surface-container-low/60 border border-border rounded-xl py-2.5 pl-10 pr-3 text-sm text-text outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-colors"
                >
                  <option>Last 30 Days</option>
                  <option>Last 7 Days</option>
                  <option>This Quarter</option>
                  <option>All Time</option>
                </select>
              </div>
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
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted mb-1.5">
                Source PO
              </label>
              <select
                value={poFilter}
                onChange={(e) => setPoFilter(e.target.value)}
                className="w-full bg-surface-container-low/60 border border-border rounded-xl py-2 px-3 text-sm text-text outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-colors"
              >
                <option value="all">All POs</option>
                {poNumbers.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
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

/* ─── Loading skeletons ─── */

function SkStatCard() {
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
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-16 rounded-full sm:hidden" />
        </div>
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

function EmptyState({ canCreate = false }) {
  return (
    <div className="glass-card w-full rounded-2xl px-6 py-12 sm:p-16 flex flex-col items-center text-center">
      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary-soft text-primary rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
        <Package className="h-7 w-7 sm:h-9 sm:w-9" strokeWidth={1.5} />
      </div>
      <h2 className="text-lg sm:text-xl font-bold text-text mb-2 tracking-tight">
        No goods receipts yet
      </h2>
      <p className="text-text-muted text-sm max-w-md mb-5 sm:mb-6 leading-relaxed">
        {canCreate
          ? "Log a GRN against an accepted PO once goods arrive at site. Damage and partial receipts are supported."
          : "Goods receipts logged by site staff will appear here once recorded."}
      </p>
      {canCreate && (
        <Link
          to="/app/grn/new"
          className="bg-primary hover:brightness-110 text-primary-foreground px-5 sm:px-6 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 transition-all shadow-sm active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Log GRN
        </Link>
      )}
    </div>
  );
}

export default function GRNListPage() {
  const rows = useGRNStore((s) => s.items);
  const loading = useGRNStore((s) => s.loading);
  const fetchAll = useGRNStore((s) => s.fetchAll);
  const user = useAuthStore((s) => s.user);
  const isApproverRole = APPROVER_ROLES.has(user?.role);
  const canCreate = useCan("grn.create");
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [dateRange, setDateRange] = useState("Last 30 Days");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [poFilter, setPoFilter] = useState("all");

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // KPI counts from the full unfiltered list. We pull buckets from chain
  // progress + damage flags (NOT only status), since GRN.status is "full"
  // vs "partial" — the chain stage is what tells you whether it's approved.
  const counts = useMemo(() => {
    const c = { total: rows.length, pending: 0, approved: 0, damaged: 0, rejected: 0 };
    let damagedUnits = 0;
    for (const r of rows) {
      const isRejected = r.status === "rejected";
      const isDone = r.chain_stage === "done";
      const hasDamage =
        !!r.replacement_status
        || (Array.isArray(r.items)
          && r.items.some((it) => (Number(it.damaged) || 0) > 0));
      if (isRejected) c.rejected += 1;
      else if (isDone) c.approved += 1;
      else c.pending += 1;
      if (hasDamage && !isRejected) {
        c.damaged += 1;
        for (const it of r.items ?? []) damagedUnits += Number(it.damaged) || 0;
      }
    }
    return { ...c, damagedUnits };
  }, [rows]);

  const [nowMs] = useState(() => Date.now());
  const sinceMs = useMemo(() => {
    if (dateRange === "Last 7 Days") return nowMs - 7 * 86400000;
    if (dateRange === "Last 30 Days") return nowMs - 30 * 86400000;
    if (dateRange === "This Quarter") {
      const d = new Date(nowMs);
      const qMonth = Math.floor(d.getMonth() / 3) * 3;
      return new Date(d.getFullYear(), qMonth, 1, 0, 0, 0).getTime();
    }
    return null;
  }, [dateRange, nowMs]);

  const vendors = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => r.vendor && set.add(r.vendor));
    return [...set].sort();
  }, [rows]);
  const poNumbers = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => r.po_number && set.add(r.po_number));
    return [...set].sort();
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const q = query.toLowerCase();
      const matchQuery =
        !q ||
        r.number.toLowerCase().includes(q) ||
        (r.po_number ?? "").toLowerCase().includes(q) ||
        (r.vendor ?? "").toLowerCase().includes(q);

      const hasDamage =
        !!r.replacement_status
        || (Array.isArray(r.items)
          && r.items.some((it) => (Number(it.damaged) || 0) > 0));
      const isRejected = r.status === "rejected";
      const isDone = r.chain_stage === "done";

      let matchStatus = true;
      if (status === "pending") matchStatus = !isDone && !isRejected;
      else if (status === "approved") matchStatus = isDone && !isRejected;
      else if (status === "damaged") matchStatus = hasDamage && !isRejected;
      else if (status === "rejected") matchStatus = isRejected;

      let matchDate = true;
      const recordDate = r.received_date ?? r.created_at;
      if (sinceMs && recordDate) {
        matchDate = new Date(recordDate).getTime() >= sinceMs;
      }
      const matchVendor = vendorFilter === "all" || r.vendor === vendorFilter;
      const matchPo = poFilter === "all" || r.po_number === poFilter;
      return matchQuery && matchStatus && matchDate && matchVendor && matchPo;
    });
  }, [rows, query, status, sinceMs, vendorFilter, poFilter]);

  const initialLoading = loading && rows.length === 0;
  const toggleStatus = (s) => setStatus((prev) => (prev === s ? "all" : s));

  const STATUS_PILLS = [
    { label: "All",       filter: "all",       count: counts.total,    tone: "neutral" },
    { label: "Pending",   filter: "pending",   count: counts.pending,  tone: "warning" },
    { label: "Approved",  filter: "approved",  count: counts.approved, tone: "success" },
    { label: "Damaged",   filter: "damaged",   count: counts.damaged,  tone: "info"    },
    { label: "Rejected",  filter: "rejected",  count: counts.rejected, tone: "danger"  },
  ];

  // Site-person specific empty/landing screen — kept for the "no GRNs yet"
  // case so they get a curated CTA + eligible-POs strip.
  const isSitePerson = user?.role === "site_person";
  if (isSitePerson && rows.length === 0) {
    return (
      <div className="max-w-[1400px] mx-auto space-y-4 sm:space-y-6">
        <SiteHero user={user} rows={rows} loading={initialLoading} />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto pb-24 sm:pb-0 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-text-muted">
            <Layers className="h-3 w-3" strokeWidth={2} />
            <span className="text-[10px] font-semibold tracking-[0.22em] uppercase">
              Procurement
            </span>
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-bold text-text leading-tight tracking-tight mt-1">
            Goods Receipt Notes
          </h1>
          <p className="hidden sm:block text-text-muted text-sm mt-1.5">
            Log incoming shipments against purchase orders and track damage
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <RefreshButton onRefresh={fetchAll} loading={loading} />
          <button
            type="button"
            onClick={() =>
              toast.success(`Exported ${filtered.length} records to CSV`)
            }
            className="p-2 sm:px-4 sm:py-2 text-[12px] font-semibold text-text-muted rounded-full border border-border bg-surface-container-low/60 hover:text-text hover:border-white/20 flex items-center gap-1.5 whitespace-nowrap transition-colors"
            aria-label="Export to CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
          {canCreate && (
            <Link
              to="/app/grn/new"
              className="hidden sm:inline-flex bg-primary hover:brightness-110 text-primary-foreground px-4 py-2 rounded-full font-bold text-[12px] items-center gap-1.5 transition-all shadow-sm whitespace-nowrap active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              Log GRN
            </Link>
          )}
        </div>
      </div>

      {/* Mobile status chips */}
      <div className="sm:hidden">
        {initialLoading ? (
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-full" />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {STATUS_PILLS.map((p) => (
              <StatusFilterPill
                key={p.filter}
                label={p.label}
                count={p.count}
                tone={p.tone}
                active={status === p.filter}
                onClick={() =>
                  p.filter === "all" ? setStatus("all") : toggleStatus(p.filter)
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Desktop KPI cards */}
      <div className="hidden sm:grid sm:grid-cols-5 gap-4">
        {initialLoading ? (
          Array.from({ length: 5 }).map((_, i) => <SkStatCard key={i} />)
        ) : (
          <>
            <StatCard
              label="Total"
              value={counts.total}
              icon={TrendingUp}
              tone="neutral"
              active={status === "all"}
              onClick={() => setStatus("all")}
            />
            <StatCard
              label="Pending"
              value={counts.pending}
              icon={Clock}
              tone="warning"
              active={status === "pending"}
              onClick={() => toggleStatus("pending")}
            />
            <StatCard
              label="Approved"
              value={counts.approved}
              icon={ShieldCheck}
              tone="success"
              active={status === "approved"}
              onClick={() => toggleStatus("approved")}
            />
            <StatCard
              label="Damaged"
              value={counts.damaged}
              icon={AlertTriangle}
              tone="info"
              active={status === "damaged"}
              onClick={() => toggleStatus("damaged")}
            />
            <StatCard
              label="Rejected"
              value={counts.rejected}
              icon={XCircle}
              tone="danger"
              active={status === "rejected"}
              onClick={() => toggleStatus("rejected")}
            />
          </>
        )}
      </div>

      {/* Damage-units banner — same treatment as PO's "active spend" */}
      {counts.damagedUnits > 0 && !initialLoading && (
        <div className="glass-card rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 rounded-lg bg-warning-soft text-warning flex items-center justify-center shrink-0">
              <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.5} />
            </span>
            <span className="text-[11px] sm:text-xs text-text-muted truncate">
              <span className="hidden sm:inline">Damaged units across all GRNs </span>
              <span className="sm:hidden">Damaged units </span>
              <span className="text-text-subtle">(needs vendor agreement)</span>
            </span>
          </div>
          <span className="text-base sm:text-lg font-black text-warning font-mono tabular-nums">
            {counts.damagedUnits}
          </span>
        </div>
      )}

      <FilterBar
        query={query}
        setQuery={setQuery}
        dateRange={dateRange}
        setDateRange={setDateRange}
        vendors={vendors}
        poNumbers={poNumbers}
        vendorFilter={vendorFilter}
        setVendorFilter={setVendorFilter}
        poFilter={poFilter}
        setPoFilter={setPoFilter}
      />

      {/* Active filter chips */}
      {(status !== "all" ||
        dateRange !== "Last 30 Days" ||
        query ||
        vendorFilter !== "all" ||
        poFilter !== "all") && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
          <span className="hidden sm:inline">Filtering by:</span>
          {status !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-soft text-primary font-bold uppercase tracking-wider text-[10px]">
              {status}
              <button type="button" onClick={() => setStatus("all")} className="hover:brightness-110 -mr-0.5" aria-label="Clear status filter">
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          )}
          {dateRange !== "Last 30 Days" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-info-soft text-info font-bold uppercase tracking-wider text-[10px]">
              {dateRange}
              <button type="button" onClick={() => setDateRange("Last 30 Days")} className="hover:brightness-110 -mr-0.5" aria-label="Reset date range">
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          )}
          {vendorFilter !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-info-soft text-info font-semibold text-[10px]">
              Vendor: {vendorFilter}
              <button type="button" onClick={() => setVendorFilter("all")} className="hover:brightness-110 -mr-0.5" aria-label="Clear vendor filter">
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          )}
          {poFilter !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-info-soft text-info font-semibold text-[10px]">
              PO: {poFilter}
              <button type="button" onClick={() => setPoFilter("all")} className="hover:brightness-110 -mr-0.5" aria-label="Clear PO filter">
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          )}
          {query && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container border border-border text-text font-semibold text-[10px] max-w-[160px]">
              <span className="truncate">&ldquo;{query}&rdquo;</span>
              <button type="button" onClick={() => setQuery("")} className="text-text-muted hover:text-text -mr-0.5" aria-label="Clear search">
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setStatus("all");
              setDateRange("Last 30 Days");
              setQuery("");
              setVendorFilter("all");
              setPoFilter("all");
            }}
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
        <EmptyState canCreate={canCreate} />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((row) => {
            const items = Array.isArray(row.items) ? row.items : [];
            const totalDamaged = items.reduce((s, it) => s + (Number(it.damaged) || 0), 0);
            const totalReceived = items.reduce((s, it) => s + (Number(it.received) || 0), 0);
            const totalOrdered = items.reduce((s, it) => s + (Number(it.ordered) || 0), 0);
            const isRejected = row.status === "rejected";
            const isDone = row.chain_stage === "done";
            const hasDamage = totalDamaged > 0 || !!row.replacement_status;
            const inVendorDetour = row.chain_stage === "pending_vendor_replacement";

            // Pill key drives icon + label + tone
            const pillKey = isRejected ? "rejected"
              : isDone ? "done"
              : hasDamage && inVendorDetour ? "damage"
              : row.status === "full" ? "full"
              : "partial";
            const tone = STATUS_TONE[pillKey];
            const StatusIcon = tone.icon;

            const iconBg = isRejected
              ? "bg-danger-soft text-danger"
              : isDone
                ? "bg-success-soft text-success"
                : hasDamage
                  ? "bg-warning-soft text-warning"
                  : "bg-info-soft text-info";
            const stripColor = isRejected
              ? "var(--color-danger)"
              : isDone
                ? "var(--color-success)"
                : hasDamage
                  ? "var(--color-warning)"
                  : "var(--color-info)";

            // Sub-text — describes what's happening / who's next
            const stages = GRN_CHAIN;
            const currentStage = stages.find((s) => s.key === row.chain_stage);
            const sub = isRejected
              ? "Rejected"
              : isDone
                ? hasDamage && row.replacement_status === "accepted"
                  ? "Replacement scheduled"
                  : "Approved · ready for payment"
                : inVendorDetour
                  ? "Awaiting vendor agreement"
                  : currentStage
                    ? `Awaiting ${currentStage.label}`
                    : "In approval";

            return (
              <Link
                key={row.id ?? row.number}
                to={`/app/grn/${row.number}`}
                className="group relative flex items-start sm:items-center gap-3 sm:gap-4 pl-4 pr-3 sm:pl-5 sm:pr-4 py-3 sm:py-4 rounded-2xl sm:rounded-xl border border-border bg-surface shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden active:scale-[0.99]"
              >
                <span
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{ background: stripColor }}
                  aria-hidden
                />

                {/* Status icon avatar */}
                <div
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}
                >
                  <StatusIcon className="h-[18px] w-[18px]" strokeWidth={2} />
                </div>

                <div className="flex-1 min-w-0">
                  {/* Top row */}
                  <div className="flex items-center justify-between sm:justify-start gap-2 mb-0.5">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                      <span className="font-mono text-[11.5px] sm:text-[13px] font-bold text-primary truncate tracking-wide">
                        {row.number}
                      </span>
                      <span className="hidden sm:inline text-text-subtle">·</span>
                      <span className="hidden sm:inline text-[11px] text-text-muted tabular-nums shrink-0">
                        {formatDate(row.received_date ?? row.created_at)}
                      </span>
                      {row.po_number && (
                        <>
                          <span className="hidden md:inline text-text-subtle">·</span>
                          <span className="hidden md:inline text-[11px] font-mono text-text-muted">
                            from {row.po_number}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="sm:hidden shrink-0 flex items-center gap-1">
                      {totalDamaged > 0 && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-warning-soft text-warning text-[9px] font-bold border border-warning/30">
                          <AlertTriangle className="h-2.5 w-2.5" strokeWidth={2.5} />
                          {totalDamaged}
                        </span>
                      )}
                      <StatusPill status={pillKey} />
                    </div>
                  </div>

                  {/* Vendor (title) */}
                  <div className="text-[14px] font-semibold text-text truncate leading-snug">
                    {safe(row.vendor)}
                  </div>

                  {/* Meta */}
                  <div className="text-[11px] text-text-muted truncate mt-0.5">
                    <span className="font-mono tabular-nums text-text">
                      {totalReceived} of {totalOrdered} units
                    </span>
                    {totalDamaged > 0 && (
                      <>
                        {" · "}
                        <span className="text-warning font-semibold">
                          {totalDamaged} damaged
                        </span>
                      </>
                    )}
                    <span className="sm:hidden text-text-subtle">
                      {" · "}
                      {formatDate(row.received_date ?? row.created_at)}
                    </span>
                    {row.po_number && (
                      <span className="md:hidden text-text-subtle">
                        {" · "}from {row.po_number}
                      </span>
                    )}
                  </div>
                </div>

                {/* Approval chain — lg+ approvers */}
                {isApproverRole && (
                  <div className="hidden lg:flex gap-1.5 shrink-0">
                    {stages.map((s, i) => (
                      <ApprovalBadge
                        key={s.key}
                        label={s.label}
                        state={stageStateFor(s, i, row)}
                        title={`${s.label}: ${stageStateFor(s, i, row)}`}
                      />
                    ))}
                    {inVendorDetour && (
                      <ApprovalBadge
                        label="VEN"
                        state="detour"
                        title="Awaiting vendor agreement on replacement"
                      />
                    )}
                  </div>
                )}

                {/* Right column — desktop only */}
                <div className="hidden sm:flex flex-col items-end gap-1 shrink-0 text-right sm:min-w-[140px]">
                  <div className="flex items-center gap-1.5">
                    {totalDamaged > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning-soft text-warning text-[10px] font-bold border border-warning/30">
                        <AlertTriangle className="h-3 w-3" strokeWidth={2.5} />
                        {totalDamaged}
                      </span>
                    )}
                    <StatusPill status={pillKey} />
                  </div>
                  {sub && (
                    <span
                      className={`text-[10px] font-medium ${
                        isRejected
                          ? "text-danger"
                          : inVendorDetour
                            ? "text-warning"
                            : isDone
                              ? "text-success"
                              : "text-text-subtle"
                      }`}
                    >
                      {sub}
                    </span>
                  )}
                </div>

                {/* Actions cluster */}
                <div className="hidden sm:flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toast.info("Quick actions coming soon");
                    }}
                    className="text-text-muted hover:text-text p-1.5 rounded-full hover:bg-white/[0.06] opacity-0 group-hover:opacity-100 transition-all"
                    aria-label="More actions"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  <ChevronRight className="h-4 w-4 text-text-subtle group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Footer counter */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-center sm:justify-between text-xs text-text-muted px-1 pt-1">
          <span className="text-center sm:text-left">
            Showing <strong className="text-text">{filtered.length}</strong>
            {filtered.length !== counts.total && (
              <>
                {" "}of <strong className="text-text">{counts.total}</strong>
              </>
            )}{" "}
            goods receipt{filtered.length === 1 ? "" : "s"}
          </span>
        </div>
      )}

      {/* Mobile FAB */}
      {canCreate && (
        <Link
          to="/app/grn/new"
          className="sm:hidden fixed bottom-6 right-4 z-30 group"
          aria-label="Log GRN"
        >
          <span
            className="absolute inset-0 rounded-full blur-xl opacity-40 group-hover:opacity-60 group-active:opacity-70 transition-opacity"
            style={{ background: "var(--color-primary)" }}
            aria-hidden
          />
          <span className="relative bg-primary text-primary-foreground rounded-full w-14 h-14 flex items-center justify-center transition-all active:scale-90 hover:brightness-110 shadow-[0_8px_24px_-4px_color-mix(in_srgb,var(--color-primary)_60%,transparent)]">
            <Plus className="h-6 w-6" strokeWidth={2.5} />
          </span>
        </Link>
      )}
    </div>
  );
}
