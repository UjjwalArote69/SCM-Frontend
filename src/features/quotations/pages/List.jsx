import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Download,
  Plus,
  Search,
  ListFilter,
  FileSpreadsheet,
  MoreVertical,
  Loader2,
  Award,
  Clock,
  XCircle,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { useRFQStore } from "../store.js";
import { useToast } from "../../../hooks/useToast.jsx";
import { useAuthStore } from "../../auth/store.js";
import RefreshButton from "../../../components/data/RefreshButton.jsx";

// Mirrors RfqController::canWriteRfq — admin, purchase_officer, OR HOD of
// Procurement / Purchase. Generic HODs (IT, FIN, etc.) still can't author.
const RFQ_WRITE_HOD_DEPT_CODES = new Set(["PROC", "PURCH"]);
function canWriteRfq(user) {
  if (!user) return false;
  if (user.role === "admin" || user.role === "purchase_officer") return true;
  if (user.role === "hod") return RFQ_WRITE_HOD_DEPT_CODES.has(user.department?.code);
  return false;
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

function StatCard({ label, value, icon: Icon, tone = "neutral", active, onClick }) {
  const toneStyles = {
    neutral: "text-text bg-surface-container-low border-border",
    info:    "text-info bg-info-soft/50 border-info/20",
    warning: "text-warning bg-warning-soft/50 border-warning/20",
    success: "text-success bg-success-soft/50 border-success/20",
    danger:  "text-danger bg-danger-soft/50 border-danger/20",
  };
  const iconBg = {
    neutral: "bg-surface-container-high",
    info:    "bg-info-soft",
    warning: "bg-warning-soft",
    success: "bg-success-soft",
    danger:  "bg-danger-soft",
  };
  const ringActive = active
    ? "ring-2 ring-primary ring-offset-2 ring-offset-bg"
    : "";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left flex items-center gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-lg border transition-all duration-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 shrink-0 snap-start min-w-[140px] sm:min-w-0 ${toneStyles[tone]} ${ringActive}`}
    >
      <div
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-md flex items-center justify-center shrink-0 ${iconBg[tone]}`}
      >
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.25} />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest font-bold text-text-muted">
          {label}
        </div>
        <div className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
          {value}
        </div>
      </div>
    </button>
  );
}

function FilterBar({ query, setQuery, dateRange, setDateRange }) {
  return (
    <div className="bg-surface-container-lowest border border-border rounded-lg p-3 flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 sm:items-center mb-4">
      <div className="relative w-full sm:min-w-[260px] sm:flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search RFQ number, title, source PR…"
          className="w-full bg-transparent border border-border rounded-md focus:border-primary focus:ring-0 pl-10 pr-3 py-2 text-sm text-text outline-none"
        />
      </div>
      <div className="flex gap-2">
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="flex-1 sm:flex-initial bg-transparent border border-border rounded-md focus:border-primary focus:ring-0 py-2 pl-3 pr-8 text-sm text-text outline-none"
        >
          <option>Last 30 Days</option>
          <option>Last 7 Days</option>
          <option>This Quarter</option>
          <option>All Time</option>
        </select>
        <button
          type="button"
          className="px-3 py-2 text-sm font-medium text-text-muted rounded-md border border-border hover:bg-surface-container-low flex items-center gap-1 whitespace-nowrap"
        >
          <ListFilter className="h-4 w-4" />
          <span className="hidden sm:inline">More filters</span>
        </button>
      </div>
    </div>
  );
}

function EmptyState({ canCreate, hasFilters }) {
  return (
    <div className="w-full bg-surface-container-low rounded-2xl p-16 flex flex-col items-center text-center border border-dashed border-border">
      <div className="w-20 h-20 bg-surface-container-lowest rounded-full flex items-center justify-center shadow-sm border border-border mb-6">
        <FileSpreadsheet className="h-9 w-9 text-text-subtle" strokeWidth={1.5} />
      </div>
      <h2 className="text-xl font-bold text-text mb-2 tracking-tight">
        {hasFilters ? "No matching quotations" : "No quotations yet"}
      </h2>
      <p className="text-text-muted text-sm max-w-md mb-6 leading-relaxed">
        {hasFilters
          ? "Try a different search or clear the filters."
          : canCreate
            ? "Create an RFQ to start collecting vendor quotes. Once invited, vendors will respond here."
            : "Quotations from your team will appear here once they are created."}
      </p>
      {!hasFilters && canCreate && (
        <Link
          to="/app/quotations/new"
          className="bg-primary hover:bg-primary-hover text-primary-foreground px-6 py-2.5 rounded-md font-bold text-sm flex items-center gap-2 transition-colors shadow-sm"
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
  const canCreate = canWriteRfq(user);
  const toast = useToast();
  const [query,     setQuery]     = useState("");
  const [status,    setStatus]    = useState("all");
  const [dateRange, setDateRange] = useState("Last 30 Days");

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // KPI counts from the full list (not filtered by query/status)
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
  const hasFilters = Boolean(query) || status !== "all";

  return (
    <div className="max-w-7xl mx-auto pb-20 sm:pb-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text tracking-tight">
            Quotations
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Track RFQs, vendor responses, and awards
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <RefreshButton onRefresh={fetchAll} loading={loading} />
          <button
            type="button"
            onClick={() =>
              toast.success(`Exported ${filtered.length} records to CSV`)
            }
            className="px-3 sm:px-4 py-2 text-sm font-semibold text-text rounded-md border border-border hover:bg-surface-container-low flex items-center gap-2 bg-surface-container-lowest"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          {canCreate && (
            <Link
              to="/app/quotations/new"
              className="bg-primary hover:bg-primary-hover text-primary-foreground px-3 sm:px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 transition-colors shadow-sm whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New RFQ</span>
              <span className="sm:hidden">New</span>
            </Link>
          )}
        </div>
      </div>

      {/* KPI stats — horizontal scroll on mobile, 5-col grid on md+ */}
      <div className="-mx-4 sm:mx-0 mb-4">
        <div className="flex sm:grid sm:grid-cols-5 gap-2 sm:gap-3 px-4 sm:px-0 overflow-x-auto sm:overflow-visible snap-x snap-mandatory pb-1 sm:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
        </div>
      </div>

      <FilterBar
        query={query}
        setQuery={setQuery}
        dateRange={dateRange}
        setDateRange={setDateRange}
      />

      {status !== "all" && (
        <div className="flex items-center gap-2 mb-3 text-xs text-text-muted">
          <span>Filtering by:</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-soft text-primary font-bold uppercase tracking-wider text-[10px]">
            {STATUS_LABEL[status] ?? status}
            <button
              type="button"
              onClick={() => setStatus("all")}
              className="hover:text-primary-hover"
              aria-label="Clear status filter"
            >
              ×
            </button>
          </span>
        </div>
      )}

      {loading && rows.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-text-muted">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState canCreate={canCreate} hasFilters={hasFilters} />
      ) : (
        <div className="bg-surface-container-lowest rounded-lg overflow-hidden border border-border shadow-sm">
          {/* Column header — desktop only; mobile uses card layout per row */}
          <div className="hidden md:flex items-center bg-surface-container-low border-b border-border px-4 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
            <div className="w-10">#</div>
            <div className="w-28">Date</div>
            <div className="w-40">RFQ Number</div>
            <div className="flex-1 min-w-[180px]">Title · Source PR</div>
            <div className="w-48 hidden lg:block">Responses · Due</div>
            <div className="w-36">Status</div>
            <div className="w-16 text-right">—</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-border">
            {filtered.map((row, idx) => {
              const strip =
                row.status === "awarded"
                  ? "bg-success"
                  : row.status === "compared"
                    ? "bg-warning"
                    : row.status === "closed"
                      ? "bg-text-subtle"
                      : "bg-info";
              const vendorCount = Array.isArray(row.vendors)   ? row.vendors.length   : 0;
              const responded   = Array.isArray(row.responses) ? row.responses.length : 0;
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
              const dueDate = row.due_date ? formatDate(row.due_date) : "—";

              return (
                <div
                  key={row.id ?? row.number}
                  className="hover:bg-surface-container-low transition-colors relative group"
                >
                  <div
                    className={`absolute left-0 top-1.5 bottom-1.5 w-1 ${strip} rounded-r`}
                  />

                  {/* Mobile card layout — tap anywhere to open detail */}
                  <Link
                    to={`/app/quotations/${row.number}`}
                    className="md:hidden flex items-center gap-3 px-4 py-3.5 pl-5 active:bg-surface-container-low"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-primary font-mono text-[13px] truncate">
                          {row.number}
                        </span>
                        <StatusPill status={row.status} />
                      </div>
                      {row.title && (
                        <div className="text-sm font-medium text-text truncate">
                          {row.title}
                        </div>
                      )}
                      <div className="text-xs text-text-muted truncate">
                        {row.pr_number && (
                          <>
                            <span className="font-mono">{row.pr_number}</span>
                            <> · </>
                          </>
                        )}
                        <span className={responseColor}>{responseRatio} responded</span>
                        <> · {formatDate(row.created_at)}</>
                      </div>
                      {sub && (
                        <div
                          className={`text-[10px] font-medium ${
                            row.status === "open"
                              ? "text-info"
                              : "text-text-subtle"
                          }`}
                        >
                          {sub}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-text-subtle shrink-0" />
                  </Link>

                  {/* Desktop row layout */}
                  <div className="hidden md:flex items-center px-4 py-3 text-sm">
                    <div className="w-10 text-text-muted font-medium">
                      {idx + 1}
                    </div>
                    <div className="w-28 text-text-muted">
                      {formatDate(row.created_at)}
                    </div>
                    <div className="w-40">
                      <Link
                        to={`/app/quotations/${row.number}`}
                        className="font-bold text-primary hover:underline font-mono text-[13px]"
                      >
                        {row.number}
                      </Link>
                    </div>
                    <div className="flex-1 min-w-[180px] pr-3">
                      <div className="font-semibold text-text truncate">
                        {safe(row.title)}
                      </div>
                      <div className="text-xs text-text-muted font-mono">
                        {row.pr_number ?? "—"}
                      </div>
                    </div>
                    <div className="w-48 hidden lg:flex flex-col gap-0.5">
                      <span className={`text-sm font-bold ${responseColor}`}>
                        {responseRatio}
                        <span className="text-[10px] font-medium text-text-muted ml-1">
                          responded
                        </span>
                      </span>
                      <span className="text-[11px] text-text-subtle">
                        Due {dueDate}
                      </span>
                    </div>
                    <div className="w-36 flex flex-col items-start gap-1">
                      <StatusPill status={row.status} />
                      <span
                        className={`text-[10px] font-medium truncate max-w-[140px] ${
                          row.status === "open"
                            ? "text-info"
                            : "text-text-subtle"
                        }`}
                      >
                        {sub}
                      </span>
                    </div>
                    <div className="w-16 flex items-center justify-end gap-2">
                      <Link
                        to={`/app/quotations/${row.number}`}
                        className="text-xs font-bold text-primary hover:brightness-110 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() => toast.info("Quick actions coming soon")}
                        className="text-text-muted hover:text-text p-1 rounded hover:bg-surface-container-high"
                        aria-label="More actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="flex items-center justify-between mt-4 text-xs text-text-muted">
          <span>
            Showing <strong className="text-text">{filtered.length}</strong>
            {filtered.length !== counts.total && (
              <> of <strong className="text-text">{counts.total}</strong></>
            )}{" "}
            quotation{filtered.length === 1 ? "" : "s"}
          </span>
        </div>
      )}

      {/* Floating action button — mobile only. Replaces the desktop "New RFQ"
          button which is hidden on small screens. */}
      {canCreate && (
        <Link
          to="/app/quotations/new"
          className="sm:hidden fixed bottom-5 right-4 z-30 bg-primary hover:bg-primary-hover text-primary-foreground rounded-full shadow-lg w-14 h-14 flex items-center justify-center transition-transform active:scale-95"
          aria-label="New RFQ"
        >
          <Plus className="h-6 w-6" strokeWidth={2.5} />
        </Link>
      )}
    </div>
  );
}
