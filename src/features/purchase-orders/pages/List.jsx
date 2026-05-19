import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  Download,
  Plus,
  Search,
  ListFilter,
  ShoppingBag,
  MoreVertical,
  CheckCircle2,
  Clock,
  XCircle,
  Truck,
  TrendingUp,
  ChevronRight,
  Layers,
  X as XIcon,
  Calendar,
} from "lucide-react";
import { usePOStore } from "../store.js";
import { useToast } from "../../../hooks/useToast.jsx";
import { useAuthStore } from "../../auth/store.js";
import { useCan } from "../../../hooks/useCan.js";
import RefreshButton from "../../../components/data/RefreshButton.jsx";
import Skeleton from "../../../components/feedback/Skeleton.jsx";
import KpiStatCard from "../../../components/data/KpiStatCard.jsx";

const APPROVER_ROLES = new Set(["admin", "hod", "cfo", "ceo"]);

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

function fmtINR(n) {
  return `₹${Number(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function ApprovalBadge({ label, state, title }) {
  const styles = {
    approved: "bg-success-soft text-success border-success/30",
    pending: "bg-warning-soft text-warning border-warning/30",
    rejected: "bg-danger-soft text-danger border-danger/30",
    hold: "bg-warning-soft text-warning border-warning/30",
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

/** Short, list-friendly label for a PO chain stage chip. */
function shortStageLabel(stage) {
  if (!stage) return "";
  if (stage.role === "hod") {
    if (!stage.department_code) return "HOD";
    if (stage.department_code === ":requester_dept") return "REQ";
    return stage.department_code;
  }
  return stage.role.toUpperCase();
}

/**
 * Per-stage state for the row badges:
 *   approved | rejected | hold | pending | waiting
 * Reads approval_history first; falls back to position vs current chain_stage.
 * Matches PR List's logic exactly so the two pages render identical badges.
 */
function stageStateFor(stage, idx, row) {
  const history = Array.isArray(row.approval_history) ? row.approval_history : [];
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i]?.stage === stage.key) {
      const action = history[i].action;
      if (action === "approve") return "approved";
      if (action === "reject") return "rejected";
      if (action === "hold") {
        return row.chain_stage === stage.key ? "hold" : "approved";
      }
      // `reopen` invalidates older decisions — stop scan, fall through.
      if (action === "reopen") break;
    }
  }
  if (row.status === "accepted" || row.status === "fulfilled") return "approved";
  if (row.status === "rejected") return "rejected";
  const stages = Array.isArray(row.chain_stages) ? row.chain_stages : [];
  const currentIdx = stages.findIndex((s) => s.key === row.chain_stage);
  if (currentIdx === -1) return idx === 0 ? "pending" : "waiting";
  if (idx === currentIdx) return "pending";
  return idx < currentIdx ? "approved" : "waiting";
}

const STATUS_TONE = {
  pending: {
    cls: "bg-warning-soft text-warning border-warning/30",
    icon: Clock,
  },
  accepted: {
    cls: "bg-info-soft text-info border-info/30",
    icon: CheckCircle2,
  },
  fulfilled: {
    cls: "bg-success-soft text-success border-success/30",
    icon: Truck,
  },
  rejected: {
    cls: "bg-danger-soft text-danger border-danger/30",
    icon: XCircle,
  },
};

function StatusPill({ status }) {
  const tone = STATUS_TONE[status] ?? STATUS_TONE.pending;
  const Icon = tone.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${tone.cls}`}
    >
      <Icon className="h-3 w-3" strokeWidth={2.5} />
      {status}
    </span>
  );
}

/**
 * Compact, mobile-first status filter pill — replaces the full KPI card on
 * narrow screens. Tinted soft background when idle, solid fill when active.
 * Same component as PR List so the two pages feel identical on mobile.
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

// StatCard alias for desktop KPI grid
const StatCard = KpiStatCard;

function FilterBar({
  query,
  setQuery,
  dateRange,
  setDateRange,
  vendors,
  companies,
  vendorFilter,
  setVendorFilter,
  companyFilter,
  setCompanyFilter,
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [popPos, setPopPos] = useState(null);
  const triggerRef = useRef(null);
  const popRef = useRef(null);

  useEffect(() => {
    if (!moreOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPopPos({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
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
    (companyFilter && companyFilter !== "all" ? 1 : 0);

  // Mobile also counts date range as a filter (it's hidden from the toolbar)
  const activeMobileCount = activeMoreCount + (dateRange !== "Last 30 Days" ? 1 : 0);

  return (
    <div className="glass-card rounded-2xl p-2 sm:p-3 flex items-center gap-2 sm:flex-wrap sm:gap-3">
      {/* Search — primary action, takes available space */}
      <label className="relative flex-1 min-w-0 sm:min-w-[260px] flex items-center gap-2 bg-surface-container-low/60 border border-border rounded-full pl-3.5 pr-2 py-2 cursor-text hover:border-primary/40 focus-within:border-primary/60 transition-colors">
        <Search className="h-3.5 w-3.5 text-text-muted shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search POs, vendor, source PR…"
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

      {/* Date range — desktop only */}
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

      {/* Filter button — mobile = all filters; desktop = "more filters" */}
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
                    setCompanyFilter("all");
                    setDateRange("Last 30 Days");
                  }}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Date range — mobile only (desktop has it in the toolbar) */}
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
                Company
              </label>
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="w-full bg-surface-container-low/60 border border-border rounded-xl py-2 px-3 text-sm text-text outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-colors"
              >
                <option value="all">All companies</option>
                {companies.map((c) => (
                  <option key={c} value={c}>
                    {c}
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

/* ─── Loading skeletons — mirror real layout so cards don't reflow ─── */

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
        <ShoppingBag className="h-7 w-7 sm:h-9 sm:w-9" strokeWidth={1.5} />
      </div>
      <h2 className="text-lg sm:text-xl font-bold text-text mb-2 tracking-tight">
        No purchase orders yet
      </h2>
      <p className="text-text-muted text-sm max-w-md mb-5 sm:mb-6 leading-relaxed">
        {canCreate
          ? "Convert an awarded RFQ into your first PO. Once issued, vendors can accept or reject."
          : "Purchase orders issued by your team will appear here once created."}
      </p>
      {canCreate && (
        <Link
          to="/app/purchase-orders/new"
          className="bg-primary hover:brightness-110 text-primary-foreground px-5 sm:px-6 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 transition-all shadow-sm active:scale-95"
        >
          <Plus className="h-4 w-4" />
          New Purchase Order
        </Link>
      )}
    </div>
  );
}

export default function PurchaseOrderListPage() {
  const rows = usePOStore((s) => s.items);
  const loading = usePOStore((s) => s.loading);
  const fetchAll = usePOStore((s) => s.fetchAll);
  const user = useAuthStore((s) => s.user);
  const isApproverRole = APPROVER_ROLES.has(user?.role);
  // Server-authoritative permission — matches the route's <PermissionGate
  // require="po.create">. Drives both the desktop "New Purchase Order"
  // button and the mobile FAB so they stay in sync with what the backend
  // will actually accept.
  const canCreate = useCan("po.create");
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [dateRange, setDateRange] = useState("Last 30 Days");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // KPI counts from the full list (not filtered by query/status)
  const counts = useMemo(() => {
    const c = {
      total: rows.length,
      pending: 0,
      accepted: 0,
      fulfilled: 0,
      rejected: 0,
    };
    let spend = 0;
    for (const r of rows) {
      if (c[r.status] !== undefined) c[r.status] += 1;
      if (r.status !== "rejected") spend += Number(r.total) || 0;
    }
    return { ...c, spend };
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

  // Build option lists for the More-filters popover from actual data
  const vendors = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => r.vendor && set.add(r.vendor));
    return [...set].sort();
  }, [rows]);
  const companies = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => r.business_unit && set.add(r.business_unit));
    return [...set].sort();
  }, [rows]);

  const filtered = rows.filter((r) => {
    const q = query.toLowerCase();
    const matchQuery =
      !q ||
      r.number.toLowerCase().includes(q) ||
      (r.vendor ?? "").toLowerCase().includes(q) ||
      (r.pr_number ?? "").toLowerCase().includes(q) ||
      (r.business_unit ?? "").toLowerCase().includes(q);
    const matchStatus = status === "all" || r.status === status;
    let matchDate = true;
    const recordDate = r.po_date ?? r.created_at;
    if (sinceMs && recordDate) {
      matchDate = new Date(recordDate).getTime() >= sinceMs;
    }
    const matchVendor = vendorFilter === "all" || r.vendor === vendorFilter;
    const matchCompany =
      companyFilter === "all" || r.business_unit === companyFilter;
    return matchQuery && matchStatus && matchDate && matchVendor && matchCompany;
  });

  const initialLoading = loading && rows.length === 0;

  const toggleStatus = (s) =>
    setStatus((prev) => (prev === s ? "all" : s));

  const STATUS_PILLS = [
    { label: "All",       filter: "all",       count: counts.total,     tone: "neutral" },
    { label: "Pending",   filter: "pending",   count: counts.pending,   tone: "warning" },
    { label: "Accepted",  filter: "accepted",  count: counts.accepted,  tone: "info"    },
    { label: "Fulfilled", filter: "fulfilled", count: counts.fulfilled, tone: "success" },
    { label: "Rejected",  filter: "rejected",  count: counts.rejected,  tone: "danger"  },
  ];

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
            Purchase Orders
          </h1>
          <p className="hidden sm:block text-text-muted text-sm mt-1.5">
            Issue, track, and fulfil purchase orders across vendors
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
              to="/app/purchase-orders/new"
              className="hidden sm:inline-flex bg-primary hover:brightness-110 text-primary-foreground px-4 py-2 rounded-full font-bold text-[12px] items-center gap-1.5 transition-all shadow-sm whitespace-nowrap active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              New Purchase Order
            </Link>
          )}
        </div>
      </div>

      {/* ─── Status filter chips (mobile) — replaces full KPI cards ─── */}
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
                  p.filter === "all"
                    ? setStatus("all")
                    : toggleStatus(p.filter)
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── KPI stat cards (desktop) ─── */}
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
              label="Accepted"
              value={counts.accepted}
              icon={CheckCircle2}
              tone="info"
              active={status === "accepted"}
              onClick={() => toggleStatus("accepted")}
            />
            <StatCard
              label="Fulfilled"
              value={counts.fulfilled}
              icon={Truck}
              tone="success"
              active={status === "fulfilled"}
              onClick={() => toggleStatus("fulfilled")}
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

      {/* Active spend banner — only when there's actual spend to show */}
      {counts.spend > 0 && !initialLoading && (
        <div className="glass-card rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
              <TrendingUp className="h-3.5 w-3.5" strokeWidth={2.5} />
            </span>
            <span className="text-[11px] sm:text-xs text-text-muted truncate">
              <span className="hidden sm:inline">Active PO spend </span>
              <span className="sm:hidden">Active spend </span>
              <span className="text-text-subtle">(excl. rejected)</span>
            </span>
          </div>
          <span className="text-base sm:text-lg font-black text-primary font-mono tabular-nums">
            {fmtINR(counts.spend)}
          </span>
        </div>
      )}

      <FilterBar
        query={query}
        setQuery={setQuery}
        dateRange={dateRange}
        setDateRange={setDateRange}
        vendors={vendors}
        companies={companies}
        vendorFilter={vendorFilter}
        setVendorFilter={setVendorFilter}
        companyFilter={companyFilter}
        setCompanyFilter={setCompanyFilter}
      />

      {/* Active filter chips strip */}
      {(status !== "all" ||
        dateRange !== "Last 30 Days" ||
        query ||
        vendorFilter !== "all" ||
        companyFilter !== "all") && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
          <span className="hidden sm:inline">Filtering by:</span>
          {status !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-soft text-primary font-bold uppercase tracking-wider text-[10px]">
              {status}
              <button
                type="button"
                onClick={() => setStatus("all")}
                className="hover:brightness-110 -mr-0.5"
                aria-label="Clear status filter"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          )}
          {dateRange !== "Last 30 Days" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-info-soft text-info font-bold uppercase tracking-wider text-[10px]">
              {dateRange}
              <button
                type="button"
                onClick={() => setDateRange("Last 30 Days")}
                className="hover:brightness-110 -mr-0.5"
                aria-label="Reset date range"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          )}
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
          {companyFilter !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-info-soft text-info font-semibold text-[10px]">
              Co: {companyFilter}
              <button
                type="button"
                onClick={() => setCompanyFilter("all")}
                className="hover:brightness-110 -mr-0.5"
                aria-label="Clear company filter"
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
            onClick={() => {
              setStatus("all");
              setDateRange("Last 30 Days");
              setQuery("");
              setVendorFilter("all");
              setCompanyFilter("all");
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
          {Array.from({ length: 6 }).map((_, i) => (
            <SkRow key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState canCreate={canCreate} />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((row) => {
            const tone = STATUS_TONE[row.status] ?? STATUS_TONE.pending;
            const StatusIcon = tone.icon;
            const iconBg =
              row.status === "fulfilled"
                ? "bg-success-soft text-success"
                : row.status === "accepted"
                  ? "bg-info-soft text-info"
                  : row.status === "rejected"
                    ? "bg-danger-soft text-danger"
                    : "bg-warning-soft text-warning";
            const stripColor =
              row.status === "fulfilled"
                ? "var(--color-success)"
                : row.status === "accepted"
                  ? "var(--color-info)"
                  : row.status === "rejected"
                    ? "var(--color-danger)"
                    : "var(--color-warning)";
            const stages = Array.isArray(row.chain_stages) ? row.chain_stages : [];
            const currentStage = stages.find((s) => s.key === row.chain_stage);
            const chainDone = row.chain_stage === "done";
            const vendor = safe(row.vendor);
            const company = safe(row.business_unit);

            // Sub-text mirrors PR List approach but maps PO chain phases:
            //   chain_stage=done + status=pending → "Awaiting vendor"
            //   chain_stage in-flight             → "Awaiting <stage>"
            //   status=accepted                   → "In flight"
            //   status=fulfilled                  → "Delivered"
            //   status=rejected                   → "Rejected"
            const sub = isApproverRole
              ? row.status === "fulfilled"
                ? "Delivered"
                : row.status === "accepted"
                  ? "In flight"
                  : row.status === "rejected"
                    ? "Rejected"
                    : chainDone
                      ? "Awaiting vendor"
                      : currentStage
                        ? `Awaiting ${currentStage.label}`
                        : ""
              : row.status === "fulfilled"
                ? "Delivered"
                : row.status === "accepted"
                  ? "In flight"
                  : row.status === "rejected"
                    ? "Rejected"
                    : chainDone
                      ? "Awaiting your action"
                      : "Awaiting buyer";

            return (
              <Link
                key={row.id ?? row.number}
                to={`/app/purchase-orders/${row.number}`}
                className="group relative flex items-start sm:items-center gap-3 sm:gap-4 pl-4 pr-3 sm:pl-5 sm:pr-4 py-3 sm:py-4 rounded-2xl sm:rounded-xl border border-border bg-surface shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden active:scale-[0.99]"
              >
                {/* Colored left strip — status indicator */}
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

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Top row — PO number (+ date/source PR on desktop, status pill on mobile) */}
                  <div className="flex items-center justify-between sm:justify-start gap-2 mb-0.5">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                      <span className="font-mono text-[11.5px] sm:text-[13px] font-bold text-primary truncate tracking-wide">
                        {row.number}
                      </span>
                      <span className="hidden sm:inline text-text-subtle">·</span>
                      <span className="hidden sm:inline text-[11px] text-text-muted tabular-nums shrink-0">
                        {formatDate(row.po_date ?? row.created_at)}
                      </span>
                      {row.pr_number && (
                        <>
                          <span className="hidden md:inline text-text-subtle">·</span>
                          <span className="hidden md:inline text-[11px] font-mono text-text-muted">
                            from {row.pr_number}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="sm:hidden shrink-0">
                      <StatusPill status={row.status} />
                    </div>
                  </div>

                  {/* Vendor (title) */}
                  <div className="text-[14px] font-semibold text-text truncate leading-snug">
                    {vendor}
                  </div>

                  {/* Meta — company, total on mobile, date on mobile */}
                  <div className="text-[11px] text-text-muted truncate mt-0.5">
                    {company !== "—" && (
                      <span className="text-text font-medium">{company}</span>
                    )}
                    {row.total != null && (
                      <>
                        {company !== "—" ? " · " : ""}
                        <span className="font-mono tabular-nums text-text">
                          {fmtINR(row.total)}
                        </span>
                      </>
                    )}
                    <span className="sm:hidden text-text-subtle">
                      {" · "}
                      {formatDate(row.po_date ?? row.created_at)}
                    </span>
                    {row.pr_number && (
                      <span className="md:hidden text-text-subtle">
                        {" · "}from {row.pr_number}
                      </span>
                    )}
                  </div>
                </div>

                {/* Approval chain — dynamic from rule (lg+, approver only) */}
                {isApproverRole && stages.length > 0 && (
                  <div className="hidden lg:flex gap-1.5 shrink-0">
                    {stages.map((s, i) => (
                      <ApprovalBadge
                        key={s.key}
                        label={shortStageLabel(s)}
                        state={stageStateFor(s, i, row)}
                        title={`${s.label}: ${stageStateFor(s, i, row)}`}
                      />
                    ))}
                  </div>
                )}

                {/* Status column with sub-text — desktop only */}
                <div className="hidden sm:flex flex-col items-end gap-1 shrink-0 text-right sm:min-w-[120px]">
                  <StatusPill status={row.status} />
                  {sub && (
                    <span
                      className={`text-[10px] font-medium ${
                        row.status === "pending"
                          ? "text-warning"
                          : "text-text-subtle"
                      }`}
                    >
                      {sub}
                    </span>
                  )}
                </div>

                {/* Actions cluster — desktop only */}
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

      {filtered.length > 0 && (
        <div className="flex items-center justify-center sm:justify-between text-xs text-text-muted px-1 pt-1">
          <span className="text-center sm:text-left">
            Showing <strong className="text-text">{filtered.length}</strong>
            {filtered.length !== counts.total && (
              <>
                {" "}
                of <strong className="text-text">{counts.total}</strong>
              </>
            )}{" "}
            purchase order{filtered.length === 1 ? "" : "s"}
          </span>
        </div>
      )}

      {/* Floating action button — mobile only with glow */}
      {canCreate && (
        <Link
          to="/app/purchase-orders/new"
          className="sm:hidden fixed bottom-6 right-4 z-30 group"
          aria-label="New Purchase Order"
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
