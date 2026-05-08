import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  Download,
  Plus,
  Search,
  ListFilter,
  FileText,
  MoreVertical,
  CheckCircle2,
  Clock,
  XCircle,
  CircleDot,
  TrendingUp,
  ChevronRight,
  Layers,
  Trash2,
} from "lucide-react";
import { usePRStore } from "../store.js";
import { useToast } from "../../../hooks/useToast.jsx";
import { useAuthStore } from "../../auth/store.js";
import RefreshButton from "../../../components/data/RefreshButton.jsx";
import Skeleton from "../../../components/feedback/Skeleton.jsx";
import KpiStatCard from "../../../components/data/KpiStatCard.jsx";

const APPROVER_ROLES = new Set(["admin", "hod", "cfo", "ceo"]);

function fmtDraftSaved(ts) {
  if (!ts) return "earlier";
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

/** Short, list-friendly label for a stage chip. */
function shortStageLabel(stage) {
  if (!stage) return "";
  if (stage.role === "hod") {
    if (!stage.department_code) return "HOD";
    if (stage.department_code === ":requester_dept") return "REQ";
    return stage.department_code;   // e.g. PURCH, FIN
  }
  return stage.role.toUpperCase();
}

/**
 * Per-stage state for the row badges:
 *   approved | rejected | hold | pending | waiting
 * Read approval_history first; fall back to position vs current chain_stage.
 */
function stageStateFor(stage, idx, row) {
  const history = Array.isArray(row.approval_history) ? row.approval_history : [];
  // Last history entry for this stage key
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i]?.stage === stage.key) {
      const action = history[i].action;
      if (action === "approve") return "approved";
      if (action === "reject") return "rejected";
      if (action === "hold") {
        return row.chain_stage === stage.key ? "hold" : "approved";
      }
    }
  }
  if (row.status === "approved") return "approved";
  if (row.status === "rejected" || row.status === "cancelled") return "rejected";
  // No history yet → derive from current position
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
  approved: {
    cls: "bg-success-soft text-success border-success/30",
    icon: CheckCircle2,
  },
  rejected: {
    cls: "bg-danger-soft text-danger border-danger/30",
    icon: XCircle,
  },
  cancelled: {
    cls: "bg-surface-container-high text-text-muted border-border",
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

// StatCard moved to shared component — see components/data/KpiStatCard.jsx
const StatCard = KpiStatCard;

function FilterBar({
  query,
  setQuery,
  dateRange,
  setDateRange,
  departments,
  companies,
  priorities,
  deptFilter,
  setDeptFilter,
  companyFilter,
  setCompanyFilter,
  priorityFilter,
  setPriorityFilter,
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [popPos, setPopPos] = useState(null);
  const triggerRef = useRef(null);
  const popRef = useRef(null);

  // Compute portal position relative to the trigger when opening.
  useEffect(() => {
    if (!moreOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPopPos({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
  }, [moreOpen]);

  // Close popover on outside click + on scroll/resize.
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
    (deptFilter && deptFilter !== "all" ? 1 : 0) +
    (companyFilter && companyFilter !== "all" ? 1 : 0) +
    (priorityFilter && priorityFilter !== "all" ? 1 : 0);

  return (
    <div className="glass-card rounded-2xl p-3 flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 sm:items-center">
      <label className="relative w-full sm:min-w-[260px] sm:flex-1 flex items-center gap-2 bg-surface-container-low/60 border border-border rounded-full pl-4 pr-3 py-2 cursor-text hover:border-primary/40 focus-within:border-primary/60 transition-colors">
        <Search className="h-3.5 w-3.5 text-text-muted shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search PR number, requester, department…"
          className="w-full bg-transparent text-sm text-text placeholder:text-text-subtle outline-none min-w-0"
        />
      </label>
      <div className="flex gap-2">
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="flex-1 sm:flex-initial bg-surface-container-low/60 border border-border rounded-full focus:border-primary py-2 pl-4 pr-8 text-[12px] font-semibold text-text-muted hover:text-text outline-none transition-colors"
        >
          <option>Last 30 Days</option>
          <option>Last 7 Days</option>
          <option>This Quarter</option>
          <option>All Time</option>
        </select>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setMoreOpen((o) => !o)}
          className={`px-4 py-2 text-[12px] font-semibold rounded-full border flex items-center gap-1.5 whitespace-nowrap transition-colors ${
            moreOpen || activeMoreCount > 0
              ? "border-primary/40 bg-primary-soft text-primary"
              : "border-border bg-surface-container-low/60 text-text-muted hover:text-text hover:border-white/20"
          }`}
        >
          <ListFilter className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">More filters</span>
          {activeMoreCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold tabular-nums">
              {activeMoreCount}
            </span>
          )}
        </button>
        {moreOpen &&
          popPos &&
          createPortal(
            <div
              ref={popRef}
              className="rounded-2xl border border-border p-4 space-y-3"
              style={{
                position: "fixed",
                top: popPos.top,
                right: popPos.right,
                zIndex: 1000,
                width: 288,
                backgroundColor: "var(--color-surface)",
                backdropFilter: "blur(14px) saturate(1.1)",
                WebkitBackdropFilter: "blur(14px) saturate(1.1)",
                boxShadow:
                  "0 1px 2px rgba(0,0,0,0.06), 0 4px 16px -4px rgba(0,0,0,0.10), 0 24px 48px -16px rgba(0,0,0,0.18)",
              }}
            >
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-muted">
                  More filters
                </h4>
                {activeMoreCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeptFilter("all");
                      setCompanyFilter("all");
                      setPriorityFilter("all");
                    }}
                    className="text-[11px] font-semibold text-primary hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted mb-1.5">
                  Department
                </label>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="w-full bg-surface-container-low/60 border border-border rounded-xl py-2 px-3 text-sm text-text outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-colors"
                >
                  <option value="all">All departments</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
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

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted mb-1.5">
                  Priority
                </label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full bg-surface-container-low/60 border border-border rounded-xl py-2 px-3 text-sm text-text outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-colors capitalize"
                >
                  <option value="all">Any priority</option>
                  {priorities.map((p) => (
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
    </div>
  );
}

/* ─── Loading skeletons — match real layout so cards don't reflow ─── */

function SkStatCard() {
  return (
    <div className="glass-card flex items-center gap-3 p-4 rounded-2xl shrink-0 snap-start min-w-[140px] sm:min-w-0">
      <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-2.5 w-14" />
        <Skeleton className="h-6 w-12" />
      </div>
    </div>
  );
}

function SkRow() {
  return (
    <div className="relative flex items-center gap-3 sm:gap-4 pl-4 sm:pl-5 pr-3 sm:pr-4 py-4 rounded-xl border border-border bg-surface overflow-hidden">
      <span
        className="absolute left-0 top-0 bottom-0 w-1 bg-surface-container"
        aria-hidden
      />
      <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0 min-w-[120px]">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-4 w-4 shrink-0" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass-card w-full rounded-2xl p-16 flex flex-col items-center text-center">
      <div className="w-20 h-20 bg-primary-soft text-primary rounded-2xl flex items-center justify-center mb-6">
        <FileText className="h-9 w-9" strokeWidth={1.5} />
      </div>
      <h2 className="text-xl font-bold text-text mb-2 tracking-tight">
        No purchase requests yet
      </h2>
      <p className="text-text-muted text-sm max-w-md mb-6 leading-relaxed">
        Start by creating your first internal purchase requisition. Once
        submitted, it will appear here for tracking and approval.
      </p>
      <Link
        to="/app/purchase-requests/new"
        className="bg-primary hover:brightness-110 text-primary-foreground px-6 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 transition-all shadow-sm"
      >
        <Plus className="h-4 w-4" />
        New Purchase Request
      </Link>
    </div>
  );
}

export default function PurchaseRequestListPage() {
  const rows = usePRStore((s) => s.items);
  const loading = usePRStore((s) => s.loading);
  const fetchAll = usePRStore((s) => s.fetchAll);
  const user = useAuthStore((s) => s.user);
  const isApproverRole = APPROVER_ROLES.has(user?.role);
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [dateRange, setDateRange] = useState("Last 30 Days");
  const [deptFilter, setDeptFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Local draft (saved by Create.jsx in localStorage). Surface it here so the
  // user can resume an unsaved PR. The Create page key is per-user.
  const DRAFT_KEY = `scm-pr-draft-${user?.id ?? "guest"}`;
  const readDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  const [draft, setDraft] = useState(readDraft);
  // Re-read draft when the tab regains focus — Create.jsx may have updated it.
  useEffect(() => {
    const onFocus = () => setDraft(readDraft());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [DRAFT_KEY]);

  const draftCount = draft ? 1 : 0;

  const discardDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setDraft(null);
    setView("list");
    toast.info("Draft discarded");
  };

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // KPI counts from the full list (not filtered by query/status)
  const counts = useMemo(() => {
    const c = {
      total: rows.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
    };
    for (const r of rows) {
      if (c[r.status] !== undefined) c[r.status] += 1;
    }
    return c;
  }, [rows]);

  // Captured once on mount so date-range filter stays pure across re-renders.
  const [nowMs] = useState(() => Date.now());

  // Resolve the date-range option into a "since" timestamp (or null for All Time).
  const sinceMs = useMemo(() => {
    if (dateRange === "Last 7 Days") return nowMs - 7 * 86400000;
    if (dateRange === "Last 30 Days") return nowMs - 30 * 86400000;
    if (dateRange === "This Quarter") {
      const d = new Date(nowMs);
      const qMonth = Math.floor(d.getMonth() / 3) * 3;
      return new Date(d.getFullYear(), qMonth, 1, 0, 0, 0).getTime();
    }
    return null; // All Time
  }, [dateRange, nowMs]);

  // Build option lists for the More-filters popover from actual data so we
  // never show options the user has no rows for.
  const departments = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => r.department && set.add(r.department));
    return [...set].sort();
  }, [rows]);
  const companies = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => r.business_unit && set.add(r.business_unit));
    return [...set].sort();
  }, [rows]);
  const priorities = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => r.priority && set.add(r.priority));
    return [...set].sort();
  }, [rows]);

  const filtered = rows.filter((r) => {
    const requester = r.requester_name ?? r.requester ?? "";
    const q = query.toLowerCase();
    // Search across PR number, requester, department, AND title.
    const matchQuery =
      !q ||
      r.number.toLowerCase().includes(q) ||
      requester.toLowerCase().includes(q) ||
      (r.department ?? "").toLowerCase().includes(q) ||
      (r.title ?? "").toLowerCase().includes(q);
    const matchStatus = status === "all" || r.status === status;
    // Date-range gate — uses created_at; rows without one always pass through.
    let matchDate = true;
    if (sinceMs && r.created_at) {
      matchDate = new Date(r.created_at).getTime() >= sinceMs;
    }
    const matchDept = deptFilter === "all" || r.department === deptFilter;
    const matchCompany =
      companyFilter === "all" || r.business_unit === companyFilter;
    const matchPriority =
      priorityFilter === "all" || r.priority === priorityFilter;
    return (
      matchQuery &&
      matchStatus &&
      matchDate &&
      matchDept &&
      matchCompany &&
      matchPriority
    );
  });

  // View tab — "list" (default, all PRs from DB) vs "drafts" (local).
  const [view, setView] = useState("list");
  const showDraftsView = view === "drafts";

  // Initial loading: first fetch in flight AND nothing cached yet. Drives the
  // skeleton swap on the stats strip + row list.
  const initialLoading = loading && rows.length === 0;

  const toggleStatus = (s) =>
    setStatus((prev) => (prev === s ? "all" : s));

  return (
    <div className="max-w-[1400px] mx-auto pb-20 sm:pb-0 space-y-4 sm:space-y-6">
      {/* Header — eyebrow + bold title (matches dashboard aesthetic) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-text-muted">
            <Layers className="h-3 w-3" strokeWidth={2} />
            <span className="text-[10px] font-semibold tracking-[0.22em] uppercase">
              Procurement
            </span>
          </div>
          <h1 className="text-[20px] sm:text-[28px] font-bold text-text leading-tight tracking-tight mt-1">
            Purchase Requests
          </h1>
          <p className="hidden sm:block text-text-muted text-sm mt-1.5">
            Track and approve internal purchase requisitions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton onRefresh={fetchAll} loading={loading} />
          <button
            type="button"
            onClick={() =>
              toast.success(`Exported ${filtered.length} records to CSV`)
            }
            className="px-3 sm:px-4 py-2 text-[12px] font-semibold text-text-muted rounded-full border border-border bg-surface-container-low/60 hover:text-text hover:border-white/20 flex items-center gap-1.5 whitespace-nowrap transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
          {/* Desktop "New PR" button — mobile uses the FAB at bottom-right */}
          <Link
            to="/app/purchase-requests/new"
            className="hidden sm:inline-flex bg-primary hover:brightness-110 text-primary-foreground px-4 py-2 rounded-full font-bold text-[12px] items-center gap-1.5 transition-all shadow-sm whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            New Purchase Request
          </Link>
        </div>
      </div>

      {/* KPI stats — horizontal scroll on mobile, 5-col grid on md+ */}
      <div className="-mx-4 sm:mx-0">
        <div className="flex sm:grid sm:grid-cols-5 gap-3 sm:gap-4 px-4 sm:px-0 overflow-x-auto sm:overflow-visible snap-x snap-mandatory pb-1 sm:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
                icon={CheckCircle2}
                tone="success"
                active={status === "approved"}
                onClick={() => toggleStatus("approved")}
              />
              <StatCard
                label="Rejected"
                value={counts.rejected}
                icon={XCircle}
                tone="danger"
                active={status === "rejected"}
                onClick={() => toggleStatus("rejected")}
              />
              <StatCard
                label="Cancelled"
                value={counts.cancelled}
                icon={CircleDot}
                tone="info"
                active={status === "cancelled"}
                onClick={() => toggleStatus("cancelled")}
              />
            </>
          )}
        </div>
      </div>

      <FilterBar
        query={query}
        setQuery={setQuery}
        dateRange={dateRange}
        setDateRange={setDateRange}
        departments={departments}
        companies={companies}
        priorities={priorities}
        deptFilter={deptFilter}
        setDeptFilter={setDeptFilter}
        companyFilter={companyFilter}
        setCompanyFilter={setCompanyFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
      />

      {/* View tabs — switch between all PRs (DB) and local drafts */}
      <div className="flex items-center gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => setView("list")}
          className={`relative px-4 py-2.5 text-[13px] font-semibold transition-colors ${
            view === "list"
              ? "text-text"
              : "text-text-muted hover:text-text"
          }`}
        >
          All PRs
          <span className="ml-1.5 text-[11px] tabular-nums text-text-subtle">
            {counts.total}
          </span>
          {view === "list" && (
            <span
              className="absolute left-0 right-0 -bottom-px h-[2px] bg-primary rounded-full"
              aria-hidden
            />
          )}
        </button>
        <button
          type="button"
          onClick={() => setView("drafts")}
          className={`relative px-4 py-2.5 text-[13px] font-semibold transition-colors ${
            view === "drafts"
              ? "text-text"
              : "text-text-muted hover:text-text"
          }`}
        >
          My Drafts
          <span
            className={`ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold tabular-nums ${
              draftCount > 0
                ? "bg-primary text-primary-foreground"
                : "bg-surface-container text-text-subtle"
            }`}
          >
            {draftCount}
          </span>
          {view === "drafts" && (
            <span
              className="absolute left-0 right-0 -bottom-px h-[2px] bg-primary rounded-full"
              aria-hidden
            />
          )}
        </button>
      </div>

      {view === "list" &&
        (status !== "all" ||
          dateRange !== "Last 30 Days" ||
          query ||
          deptFilter !== "all" ||
          companyFilter !== "all" ||
          priorityFilter !== "all") && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
            <span>Filtering by:</span>
            {status !== "all" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-soft text-primary font-bold uppercase tracking-wider text-[10px]">
                {status}
                <button
                  type="button"
                  onClick={() => setStatus("all")}
                  className="hover:brightness-110"
                  aria-label="Clear status filter"
                >
                  ×
                </button>
              </span>
            )}
            {dateRange !== "Last 30 Days" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-info-soft text-info font-bold uppercase tracking-wider text-[10px]">
                {dateRange}
                <button
                  type="button"
                  onClick={() => setDateRange("Last 30 Days")}
                  className="hover:brightness-110"
                  aria-label="Reset date range"
                >
                  ×
                </button>
              </span>
            )}
            {deptFilter !== "all" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-info-soft text-info font-semibold text-[10px]">
                Dept: {deptFilter}
                <button
                  type="button"
                  onClick={() => setDeptFilter("all")}
                  className="hover:brightness-110"
                  aria-label="Clear department filter"
                >
                  ×
                </button>
              </span>
            )}
            {companyFilter !== "all" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-info-soft text-info font-semibold text-[10px]">
                Co: {companyFilter}
                <button
                  type="button"
                  onClick={() => setCompanyFilter("all")}
                  className="hover:brightness-110"
                  aria-label="Clear company filter"
                >
                  ×
                </button>
              </span>
            )}
            {priorityFilter !== "all" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning-soft text-warning font-semibold text-[10px] capitalize">
                {priorityFilter}
                <button
                  type="button"
                  onClick={() => setPriorityFilter("all")}
                  className="hover:brightness-110"
                  aria-label="Clear priority filter"
                >
                  ×
                </button>
              </span>
            )}
            {query && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container border border-border text-text font-semibold text-[10px]">
                &ldquo;{query}&rdquo;
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-text-muted hover:text-text"
                  aria-label="Clear search"
                >
                  ×
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setStatus("all");
                setDateRange("Last 30 Days");
                setQuery("");
                setDeptFilter("all");
                setCompanyFilter("all");
                setPriorityFilter("all");
              }}
              className="text-[11px] text-text-muted hover:text-primary font-semibold underline-offset-2 hover:underline ml-auto"
            >
              Clear all
            </button>
          </div>
        )}

      {showDraftsView ? (
        draft ? (
          <div>
            <Link
              to="/app/purchase-requests/new"
              className="group relative flex items-center gap-3 sm:gap-4 pl-3 pr-3 sm:pl-5 sm:pr-4 py-3 sm:py-4 rounded-xl border border-border bg-surface shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden"
            >
              <span
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{ background: "var(--color-info)" }}
                aria-hidden
              />
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 bg-info-soft text-info">
                <FileText className="h-[18px] w-[18px]" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="font-mono text-[12px] sm:text-[13px] font-bold text-info shrink-0">
                    DRAFT
                  </span>
                  <span className="text-text-subtle hidden sm:inline">·</span>
                  <span className="hidden sm:inline text-[11px] text-text-muted truncate">
                    saved {fmtDraftSaved(draft.savedAt)}
                  </span>
                </div>
                <div className="text-[13px] sm:text-[14px] font-semibold text-text truncate mt-0.5">
                  {draft.form?.items?.[0]?.name?.trim() ||
                    "Untitled draft"}
                </div>
                <div className="text-[11px] text-text-muted truncate mt-0.5">
                  {draft.form?.requester_name && (
                    <span className="text-text font-medium">
                      {draft.form.requester_name}
                    </span>
                  )}
                  {draft.form?.department && (
                    <>
                      {" · "}
                      {draft.form.department}
                    </>
                  )}
                  {draft.form?.items?.length > 0 && (
                    <>
                      {" · "}
                      {draft.form.items.length}{" "}
                      {draft.form.items.length === 1 ? "item" : "items"}
                    </>
                  )}
                  <span className="sm:hidden text-text-subtle">
                    {" · "}
                    saved {fmtDraftSaved(draft.savedAt)}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0 text-right sm:min-w-[120px]">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border bg-info-soft text-info border-info/30">
                  <FileText className="h-3 w-3" strokeWidth={2.5} />
                  Draft
                </span>
                <span className="hidden sm:inline text-[10px] font-medium text-text-subtle">
                  Tap to resume
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    discardDraft();
                  }}
                  className="text-text-muted hover:text-danger p-1.5 rounded-full hover:bg-danger-soft opacity-0 group-hover:opacity-100 transition-all"
                  aria-label="Discard draft"
                  title="Discard draft"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <ChevronRight className="h-4 w-4 text-text-subtle group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          </div>
        ) : (
          <div className="glass-card rounded-2xl p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-info-soft text-info flex items-center justify-center mb-4">
              <FileText className="h-7 w-7" strokeWidth={1.5} />
            </div>
            <h2 className="text-base font-bold text-text mb-1">
              No saved drafts
            </h2>
            <p className="text-text-muted text-sm max-w-md mx-auto mb-5">
              Start a new request — your progress saves automatically until you
              submit it.
            </p>
            <Link
              to="/app/purchase-requests/new"
              className="inline-flex items-center gap-2 bg-primary hover:brightness-110 text-primary-foreground px-5 py-2 rounded-full font-bold text-[12px] transition-all shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              New Purchase Request
            </Link>
          </div>
        )
      ) : initialLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkRow key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((row) => {
              const tone = STATUS_TONE[row.status] ?? STATUS_TONE.pending;
              const StatusIcon = tone.icon;
              const iconBg =
                row.status === "approved"
                  ? "bg-success-soft text-success"
                  : row.status === "rejected"
                    ? "bg-danger-soft text-danger"
                    : row.status === "cancelled"
                      ? "bg-surface-container text-text-subtle"
                      : "bg-warning-soft text-warning";
              // Colored left strip carries the status without needing a full
              // tinted background — keeps the row visually anchored.
              const stripColor =
                row.status === "approved"
                  ? "var(--color-success)"
                  : row.status === "rejected"
                    ? "var(--color-danger)"
                    : row.status === "cancelled"
                      ? "var(--color-text-subtle)"
                      : "var(--color-warning)";
              const stages = Array.isArray(row.chain_stages) ? row.chain_stages : [];
              const currentStage = stages.find((s) => s.key === row.chain_stage);
              const requester = safe(row.requester_name ?? row.requester);
              const department = safe(row.department);
              const sub = isApproverRole
                ? row.status === "approved"
                  ? stages.length === 0 ? "Auto-approved" : "Ready for PO"
                  : row.status === "rejected"
                    ? "Rejected"
                    : row.status === "cancelled"
                      ? "Cancelled"
                      : currentStage
                        ? `Awaiting ${currentStage.label}`
                        : ""
                : row.status === "approved"
                  ? "Approved"
                  : row.status === "rejected"
                    ? "Rejected"
                    : row.status === "cancelled"
                      ? "Cancelled"
                      : "Pending review";

              return (
                <Link
                  key={row.id ?? row.number}
                  to={`/app/purchase-requests/${row.number}`}
                  className="group relative flex items-center gap-3 sm:gap-4 pl-3 pr-3 sm:pl-5 sm:pr-4 py-3 sm:py-4 rounded-xl border border-border bg-surface shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden"
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

                  {/* Primary column — PR number + title + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="font-mono text-[12px] sm:text-[13px] font-bold text-primary truncate">
                        {row.number}
                      </span>
                      <span className="text-text-subtle hidden sm:inline">·</span>
                      <span className="hidden sm:inline text-[11px] text-text-muted tabular-nums shrink-0">
                        {formatDate(row.created_at)}
                      </span>
                    </div>
                    {row.title && (
                      <div className="text-[13px] sm:text-[14px] font-semibold text-text truncate mt-0.5">
                        {row.title}
                      </div>
                    )}
                    <div className="text-[11px] text-text-muted truncate mt-0.5">
                      <span className="text-text font-medium">{requester}</span>
                      {department !== "—" && (
                        <>
                          {" · "}
                          {department}
                        </>
                      )}
                      <span className="sm:hidden text-text-subtle">
                        {" · "}
                        {formatDate(row.created_at)}
                      </span>
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

                  {/* Status pill + sub-text — sub hidden on mobile (pill carries the same info) */}
                  <div className="flex flex-col items-end gap-1 shrink-0 text-right sm:min-w-[120px]">
                    <StatusPill status={row.status} />
                    {sub && (
                      <span
                        className={`hidden sm:inline text-[10px] font-medium ${
                          row.status === "pending"
                            ? "text-warning"
                            : "text-text-subtle"
                        }`}
                      >
                        {sub}
                      </span>
                    )}
                  </div>

                  {/* Actions cluster — chevron always; more-actions on hover (desktop only) */}
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
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>
            Showing <strong className="text-text">{filtered.length}</strong>
            {filtered.length !== counts.total && (
              <> of <strong className="text-text">{counts.total}</strong></>
            )}{" "}
            purchase request{filtered.length === 1 ? "" : "s"}
          </span>
        </div>
      )}

      {/* Floating action button — mobile only. Replaces the desktop "New PR"
          button which is hidden on small screens. */}
      <Link
        to="/app/purchase-requests/new"
        className="sm:hidden fixed bottom-5 right-4 z-30 bg-primary hover:brightness-110 text-primary-foreground rounded-full shadow-2xl w-14 h-14 flex items-center justify-center transition-transform active:scale-95"
        aria-label="New Purchase Request"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </Link>
    </div>
  );
}
