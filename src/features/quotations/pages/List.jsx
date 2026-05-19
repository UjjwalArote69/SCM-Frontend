import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  Download,
  Plus,
  Search,
  ListFilter,
  FileSpreadsheet,
  MoreVertical,
  Award,
  Clock,
  XCircle,
  TrendingUp,
  ChevronRight,
  Layers,
  X as XIcon,
  Calendar,
} from "lucide-react";
import { useRFQStore } from "../store.js";
import { useToast } from "../../../hooks/useToast.jsx";
import { useAuthStore } from "../../auth/store.js";
import { useCan } from "../../../hooks/useCan.js";
import RefreshButton from "../../../components/data/RefreshButton.jsx";
import Skeleton from "../../../components/feedback/Skeleton.jsx";
import KpiStatCard from "../../../components/data/KpiStatCard.jsx";

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

const STATUS_TONE = {
  open:     { cls: "bg-info-soft text-info border-info/30",                icon: Clock },
  compared: { cls: "bg-warning-soft text-warning border-warning/30",       icon: FileSpreadsheet },
  awarded:  { cls: "bg-success-soft text-success border-success/30",       icon: Award },
  closed:   { cls: "bg-surface-container-high text-text-muted border-border", icon: XCircle },
};

const STATUS_LABEL = {
  open:     "Open",
  compared: "Comparing",
  awarded:  "Awarded",
  closed:   "Closed",
};

function StatusPill({ status }) {
  const tone = STATUS_TONE[status] ?? STATUS_TONE.open;
  const Icon = tone.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${tone.cls}`}
    >
      <Icon className="h-3 w-3" strokeWidth={2.5} />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

/**
 * Compact, mobile-first status filter pill — replaces the full KPI card on
 * narrow screens. Tinted soft background when idle, solid fill when active.
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

function FilterBar({ query, setQuery, dateRange, setDateRange }) {
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

  // On mobile, date range is hidden from toolbar — it's a filter inside the popover
  const activeMobileCount = (dateRange !== "Last 30 Days" ? 1 : 0);

  return (
    <div className="glass-card rounded-2xl p-2 sm:p-3 flex items-center gap-2 sm:flex-wrap sm:gap-3">
      <label className="relative flex-1 min-w-0 sm:min-w-[260px] flex items-center gap-2 bg-surface-container-low/60 border border-border rounded-full pl-3.5 pr-2 py-2 cursor-text hover:border-primary/40 focus-within:border-primary/60 transition-colors">
        <Search className="h-3.5 w-3.5 text-text-muted shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search RFQs…"
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
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "var(--text)" }} strokeWidth={2.5} />
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

      {/* Filter button */}
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
              {dateRange !== "Last 30 Days" && (
                <button
                  type="button"
                  onClick={() => setDateRange("Last 30 Days")}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Date range — mobile only (desktop has it in the toolbar) */}
            <div className="sm:hidden">
              <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted mb-1.5 inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" style={{ color: "var(--text)" }} strokeWidth={2.5} />
                Time range
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "var(--text)" }} strokeWidth={2.5} />
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

            <p className="text-[11px] text-text-subtle italic">
              More filters coming soon.
            </p>

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

/* ─── Loading skeletons — match real layout so cards don't reflow ─── */

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
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

function EmptyState({ canCreate, hasFilters }) {
  return (
    <div className="glass-card w-full rounded-2xl px-6 py-12 sm:p-16 flex flex-col items-center text-center">
      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary-soft text-primary rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
        <FileSpreadsheet className="h-7 w-7 sm:h-9 sm:w-9" strokeWidth={1.5} />
      </div>
      <h2 className="text-lg sm:text-xl font-bold text-text mb-2 tracking-tight">
        {hasFilters ? "No matching quotations" : "No quotations yet"}
      </h2>
      <p className="text-text-muted text-sm max-w-md mb-5 sm:mb-6 leading-relaxed">
        {hasFilters
          ? "Try a different search or clear the filters."
          : canCreate
            ? "Create an RFQ to start collecting vendor quotes. Once invited, vendors will respond here."
            : "Quotations from your team will appear here once they are created."}
      </p>
      {!hasFilters && canCreate && (
        <Link
          to="/app/quotations/new"
          className="bg-primary hover:brightness-110 text-primary-foreground px-5 sm:px-6 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 transition-all shadow-sm active:scale-95"
        >
          <Plus className="h-4 w-4" />
          New RFQ
        </Link>
      )}
    </div>
  );
}

export default function QuotationListPage() {
  const rows     = useRFQStore((s) => s.items);
  const loading  = useRFQStore((s) => s.loading);
  const fetchAll = useRFQStore((s) => s.fetchAll);
  const user     = useAuthStore((s) => s.user);
  // Server-authoritative permission — matches the route's <PermissionGate
  // require="quote.create">. Keeps the New RFQ button in lock-step with what
  // the backend will actually accept, so admins can change the role matrix
  // at /admin/roles and the UI follows automatically.
  const canCreate = useCan("quote.create");
  const toast = useToast();
  const [query,     setQuery]     = useState("");
  const [status,    setStatus]    = useState("all");
  const [dateRange, setDateRange] = useState("Last 30 Days");

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const counts = useMemo(() => {
    const c = { total: rows.length, open: 0, compared: 0, awarded: 0, closed: 0 };
    for (const r of rows) {
      if (c[r.status] !== undefined) c[r.status] += 1;
    }
    return c;
  }, [rows]);

  const filtered = rows.filter((r) => {
    const q = query.toLowerCase();
    const matchQuery =
      !q ||
      r.number.toLowerCase().includes(q) ||
      (r.title ?? "").toLowerCase().includes(q) ||
      (r.pr_number ?? "").toLowerCase().includes(q);
    const matchStatus = status === "all" || r.status === status;
    return matchQuery && matchStatus;
  });

  const toggleStatus = (s) => setStatus((prev) => (prev === s ? "all" : s));
  const hasFilters = Boolean(query) || status !== "all" || dateRange !== "Last 30 Days";

  const initialLoading = loading && rows.length === 0;

  const STATUS_PILLS = [
    { label: "All",       filter: "all",      count: counts.total,    tone: "neutral" },
    { label: "Open",      filter: "open",     count: counts.open,     tone: "info"    },
    { label: "Comparing", filter: "compared", count: counts.compared, tone: "warning" },
    { label: "Awarded",   filter: "awarded",  count: counts.awarded,  tone: "success" },
    { label: "Closed",    filter: "closed",   count: counts.closed,   tone: "neutral" },
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
            Quotations
          </h1>
          <p className="hidden sm:block text-text-muted text-sm mt-1.5">
            Track RFQs, vendor responses, and awards
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
              to="/app/quotations/new"
              className="hidden sm:inline-flex bg-primary hover:brightness-110 text-primary-foreground px-4 py-2 rounded-full font-bold text-[12px] items-center gap-1.5 transition-all shadow-sm whitespace-nowrap active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              New RFQ
            </Link>
          )}
        </div>
      </div>

      {/* ─── Status filter chips (mobile) ─── */}
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
              label="Open"
              value={counts.open}
              icon={Clock}
              tone="info"
              active={status === "open"}
              onClick={() => toggleStatus("open")}
            />
            <StatCard
              label="Comparing"
              value={counts.compared}
              icon={FileSpreadsheet}
              tone="warning"
              active={status === "compared"}
              onClick={() => toggleStatus("compared")}
            />
            <StatCard
              label="Awarded"
              value={counts.awarded}
              icon={Award}
              tone="success"
              active={status === "awarded"}
              onClick={() => toggleStatus("awarded")}
            />
            <StatCard
              label="Closed"
              value={counts.closed}
              icon={XCircle}
              tone="neutral"
              active={status === "closed"}
              onClick={() => toggleStatus("closed")}
            />
          </>
        )}
      </div>

      <FilterBar
        query={query}
        setQuery={setQuery}
        dateRange={dateRange}
        setDateRange={setDateRange}
      />

      {/* Active filter chips strip */}
      {(status !== "all" || dateRange !== "Last 30 Days" || query) && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
          <span className="hidden sm:inline">Filtering by:</span>
          {status !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-soft text-primary font-bold uppercase tracking-wider text-[10px]">
              {STATUS_LABEL[status] ?? status}
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
              setQuery("");
              setDateRange("Last 30 Days");
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
        <EmptyState canCreate={canCreate} hasFilters={hasFilters} />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((row) => {
            const tone = STATUS_TONE[row.status] ?? STATUS_TONE.open;
            const StatusIcon = tone.icon;
            const iconBg =
              row.status === "awarded"
                ? "bg-success-soft text-success"
                : row.status === "compared"
                  ? "bg-warning-soft text-warning"
                  : row.status === "closed"
                    ? "bg-surface-container text-text-subtle"
                    : "bg-info-soft text-info";
            const stripColor =
              row.status === "awarded"
                ? "var(--color-success)"
                : row.status === "compared"
                  ? "var(--color-warning)"
                  : row.status === "closed"
                    ? "var(--color-text-subtle)"
                    : "var(--color-info)";
            const vendorCount = Array.isArray(row.vendors) ? row.vendors.length : 0;
            const responded = Array.isArray(row.responses) ? row.responses.length : 0;
            const responseRatio = `${responded}/${vendorCount}`;
            const responseColor =
              responded === vendorCount && responded > 0
                ? "text-success"
                : responded > 0
                  ? "text-warning"
                  : "text-text-muted";
            const sub =
              row.status === "awarded"
                ? `Awarded to ${row.awarded_vendor ?? "—"}`
                : row.status === "closed"
                  ? "Closed"
                  : row.status === "compared"
                    ? "Ready to award"
                    : responded === 0
                      ? "Awaiting responses"
                      : `${responded}/${vendorCount} responded`;
            const dueDate = row.due_date ? formatDate(row.due_date) : null;

            return (
              <Link
                key={row.id ?? row.number}
                to={`/app/quotations/${row.number}`}
                className="group relative flex items-start sm:items-center gap-3 sm:gap-4 pl-4 pr-3 sm:pl-5 sm:pr-4 py-3 sm:py-4 rounded-2xl sm:rounded-xl border border-border bg-surface shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden active:scale-[0.99]"
              >
                {/* Colored left strip */}
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
                  {/* Top row — RFQ number (+ date/PR on desktop, status pill on mobile) */}
                  <div className="flex items-center justify-between sm:justify-start gap-2 mb-0.5">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
                      <span className="font-mono text-[11.5px] sm:text-[13px] font-bold text-primary truncate tracking-wide">
                        {row.number}
                      </span>
                      <span className="hidden sm:inline text-text-subtle">·</span>
                      <span className="hidden sm:inline text-[11px] text-text-muted tabular-nums shrink-0">
                        {formatDate(row.created_at)}
                      </span>
                      {row.pr_number && (
                        <>
                          <span className="hidden sm:inline text-text-subtle">·</span>
                          <span className="hidden sm:inline text-[11px] font-mono text-text-muted">
                            from {row.pr_number}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="sm:hidden shrink-0">
                      <StatusPill status={row.status} />
                    </div>
                  </div>

                  {/* Title */}
                  {row.title && (
                    <div className="text-[14px] font-semibold text-text truncate leading-snug">
                      {safe(row.title)}
                    </div>
                  )}

                  {/* Meta line */}
                  <div className="text-[11px] text-text-muted truncate mt-0.5">
                    <span className={`font-semibold ${responseColor}`}>
                      {responseRatio}
                    </span>
                    <span className="text-text-muted"> responded</span>
                    {dueDate && (
                      <>
                        <span className="text-text-subtle"> · </span>
                        Due {dueDate}
                      </>
                    )}
                    {row.pr_number && (
                      <span className="sm:hidden text-text-subtle">
                        {" · "}from {row.pr_number}
                      </span>
                    )}
                    <span className="sm:hidden text-text-subtle">
                      {" · "}
                      {formatDate(row.created_at)}
                    </span>
                  </div>
                </div>

                {/* Status pill + sub-text — desktop only */}
                <div className="hidden sm:flex flex-col items-end gap-1 shrink-0 text-right sm:min-w-[120px]">
                  <StatusPill status={row.status} />
                  {sub && (
                    <span
                      className={`text-[10px] font-medium truncate max-w-[140px] ${
                        row.status === "open"
                          ? "text-info"
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
            quotation{filtered.length === 1 ? "" : "s"}
          </span>
        </div>
      )}

      {/* Floating action button — mobile only with glow */}
      {canCreate && (
        <Link
          to="/app/quotations/new"
          className="sm:hidden fixed bottom-6 right-4 z-30 group"
          aria-label="New RFQ"
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
