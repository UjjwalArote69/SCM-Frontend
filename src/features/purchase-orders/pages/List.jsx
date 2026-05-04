import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Download,
  Plus,
  Search,
  ListFilter,
  ShoppingBag,
  MoreVertical,
  Loader2,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { usePOStore } from "../store.js";
import { useToast } from "../../../hooks/useToast.jsx";
import { useAuthStore } from "../../auth/store.js";
import RefreshButton from "../../../components/data/RefreshButton.jsx";

// Mirrors PoController::canWritePo — only admin and purchase_officer can
// author POs. Per FLOW.md item 6, HODs (incl. Purchase HOD) have
// approve+read only and assign authoring to a subordinate officer.
function canWritePo(user) {
  if (!user) return false;
  return user.role === "admin" || user.role === "purchase_officer";
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

function fmtINR(n) {
  return `₹${Number(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const STATUS_TONE = {
  pending:   { cls: "bg-warning-soft text-warning border-warning/30", icon: Clock },
  accepted:  { cls: "bg-info-soft text-info border-info/30",          icon: CheckCircle2 },
  fulfilled: { cls: "bg-success-soft text-success border-success/30", icon: Truck },
  rejected:  { cls: "bg-danger-soft text-danger border-danger/30",    icon: XCircle },
};

const STATUS_LABEL = {
  pending:   "Pending",
  accepted:  "Accepted",
  fulfilled: "Fulfilled",
  rejected:  "Rejected",
};

function StatusPill({ status }) {
  const tone = STATUS_TONE[status] ?? STATUS_TONE.pending;
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
  const iconBg = {
    neutral: "bg-surface-container",
    info: "bg-info-soft",
    warning: "bg-warning-soft",
    success: "bg-success-soft",
    danger: "bg-danger-soft",
  };
  const iconColor = {
    neutral: "text-text-muted",
    info: "text-info",
    warning: "text-warning",
    success: "text-success",
    danger: "text-danger",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`glass-card text-left flex items-center gap-3 p-4 rounded-2xl transition-all duration-200 shrink-0 snap-start min-w-[140px] sm:min-w-0 hover:shadow-lg hover:-translate-y-0.5 ${
        active ? "ring-2 ring-primary/40" : ""
      }`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg[tone]}`}
      >
        <Icon className={`h-4 w-4 ${iconColor[tone]}`} strokeWidth={2.25} />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-text-muted">
          {label}
        </div>
        <div className="text-2xl font-bold tracking-tight tabular-nums leading-tight text-text">
          {value}
        </div>
      </div>
    </button>
  );
}

function FilterBar({ query, setQuery, dateRange, setDateRange }) {
  return (
    <div className="glass-card rounded-2xl p-3 flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 sm:items-center">
      <label className="relative w-full sm:min-w-[260px] sm:flex-1 flex items-center gap-2 bg-surface-container-low/60 border border-border rounded-full pl-4 pr-3 py-2 cursor-text hover:border-primary/40 focus-within:border-primary/60 transition-colors">
        <Search className="h-3.5 w-3.5 text-text-muted shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search PO number, vendor, source PR…"
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
          type="button"
          className="px-4 py-2 text-[12px] font-semibold text-text-muted rounded-full border border-border bg-surface-container-low/60 hover:text-text hover:border-white/20 flex items-center gap-1.5 whitespace-nowrap transition-colors"
        >
          <ListFilter className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">More filters</span>
        </button>
      </div>
    </div>
  );
}

function EmptyState({ canCreate, hasFilters }) {
  return (
    <div className="glass-card w-full rounded-2xl p-16 flex flex-col items-center text-center">
      <div className="w-20 h-20 bg-primary-soft text-primary rounded-2xl flex items-center justify-center mb-6">
        <ShoppingBag className="h-9 w-9" strokeWidth={1.5} />
      </div>
      <h2 className="text-xl font-bold text-text mb-2 tracking-tight">
        {hasFilters ? "No matching purchase orders" : "No purchase orders yet"}
      </h2>
      <p className="text-text-muted text-sm max-w-md mb-6 leading-relaxed">
        {hasFilters
          ? "Try a different search or clear the filters."
          : canCreate
            ? "Convert an awarded RFQ into your first PO. Once issued, vendors can accept or reject."
            : "Purchase orders issued by your team will appear here once created."}
      </p>
      {!hasFilters && canCreate && (
        <Link
          to="/app/purchase-orders/new"
          className="bg-primary hover:brightness-110 text-primary-foreground px-6 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 transition-all shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Create PO
        </Link>
      )}
    </div>
  );
}

export default function PurchaseOrderListPage() {
  const rows     = usePOStore((s) => s.items);
  const loading  = usePOStore((s) => s.loading);
  const fetchAll = usePOStore((s) => s.fetchAll);
  const user     = useAuthStore((s) => s.user);
  const canCreate = canWritePo(user);
  const toast = useToast();
  const [query,     setQuery]     = useState("");
  const [status,    setStatus]    = useState("all");
  const [dateRange, setDateRange] = useState("Last 30 Days");

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // KPI counts from the full list (not filtered)
  const counts = useMemo(() => {
    const c = { total: rows.length, pending: 0, accepted: 0, fulfilled: 0, rejected: 0 };
    let spend = 0;
    for (const r of rows) {
      if (c[r.status] !== undefined) c[r.status] += 1;
      if (r.status !== "rejected") spend += Number(r.total) || 0;
    }
    return { ...c, spend };
  }, [rows]);

  const filtered = rows.filter((r) => {
    const q = query.toLowerCase();
    const matchQuery =
      !q ||
      r.number.toLowerCase().includes(q) ||
      (r.vendor ?? "").toLowerCase().includes(q) ||
      (r.pr_number ?? "").toLowerCase().includes(q);
    const matchStatus = status === "all" || r.status === status;
    return matchQuery && matchStatus;
  });

  const toggleStatus = (s) => setStatus((prev) => (prev === s ? "all" : s));
  const hasFilters = Boolean(query) || status !== "all";

  return (
    <div className="max-w-[1400px] mx-auto pb-20 sm:pb-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-text-muted">
            <ShoppingBag className="h-3 w-3" strokeWidth={2} />
            <span className="text-[10px] font-semibold tracking-[0.22em] uppercase">
              Procurement
            </span>
          </div>
          <h1 className="text-[22px] sm:text-[28px] font-bold text-text leading-tight tracking-tight mt-1">
            Purchase Orders
          </h1>
          <p className="text-text-muted text-sm mt-1.5">
            Monitor and manage purchase orders across all business units
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RefreshButton onRefresh={fetchAll} loading={loading} />
          <button
            type="button"
            onClick={() =>
              toast.success(`Exported ${filtered.length} records to CSV`)
            }
            className="px-4 py-2 text-[12px] font-semibold text-text-muted rounded-full border border-border bg-surface-container-low/60 hover:text-text hover:border-white/20 flex items-center gap-1.5 whitespace-nowrap transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
          {canCreate && (
            <Link
              to="/app/purchase-orders/new"
              className="bg-primary hover:brightness-110 text-primary-foreground px-4 py-2 rounded-full font-bold text-[12px] flex items-center gap-1.5 transition-all shadow-sm whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Create PO</span>
              <span className="sm:hidden">New PO</span>
            </Link>
          )}
        </div>
      </div>

      {/* KPI stats — horizontal scroll on mobile, 5-col grid on md+ */}
      <div className="-mx-4 sm:mx-0">
        <div className="flex sm:grid sm:grid-cols-5 gap-3 sm:gap-4 px-4 sm:px-0 overflow-x-auto sm:overflow-visible snap-x snap-mandatory pb-1 sm:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
        </div>
      </div>

      {/* Active spend banner */}
      {counts.spend > 0 && (
        <div className="bg-primary-soft/40 border border-primary/20 rounded-lg px-4 py-2.5 mb-4 flex items-center justify-between gap-3">
          <span className="text-xs sm:text-sm text-text-muted">
            Active PO spend (excluding rejected)
          </span>
          <span className="text-base sm:text-lg font-black text-primary font-mono">
            {fmtINR(counts.spend)}
          </span>
        </div>
      )}

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
        <div className="glass-card rounded-2xl py-16 flex items-center justify-center text-text-muted">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState canCreate={canCreate} hasFilters={hasFilters} />
      ) : (
        <div className="glass-card rounded-2xl p-2 sm:p-3">
          <div className="flex flex-col gap-1">
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
              const sub =
                row.status === "fulfilled"
                  ? "Delivered"
                  : row.status === "accepted"
                    ? "In flight"
                    : row.status === "rejected"
                      ? "Rejected by vendor"
                      : "Awaiting vendor";

              return (
                <Link
                  key={row.id ?? row.number}
                  to={`/app/purchase-orders/${row.number}`}
                  className="group flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3.5 rounded-xl hover:bg-white/[0.04] transition-colors"
                >
                  {/* Status icon avatar */}
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}
                  >
                    <StatusIcon className="h-[18px] w-[18px]" strokeWidth={2} />
                  </div>

                  {/* Primary column — PO number + date + vendor + source PR */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[13px] font-bold text-primary">
                        {row.number}
                      </span>
                      <span className="text-text-subtle">·</span>
                      <span className="text-[11px] text-text-muted tabular-nums">
                        {formatDate(row.po_date ?? row.created_at)}
                      </span>
                      {row.pr_number && (
                        <>
                          <span className="text-text-subtle">·</span>
                          <span className="text-[11px] font-mono text-text-muted">
                            from {row.pr_number}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="text-[14px] font-semibold text-text truncate mt-0.5">
                      {safe(row.vendor)}
                    </div>
                    <div className="text-[11px] text-text-muted truncate mt-0.5">
                      {safe(row.business_unit)}
                    </div>
                  </div>

                  {/* Amount (lg+) */}
                  <div className="hidden lg:block text-right shrink-0 min-w-[110px]">
                    <div className="text-[15px] font-bold text-text tabular-nums leading-tight">
                      {fmtINR(row.total)}
                    </div>
                    <div className="text-[10px] text-text-subtle">amount</div>
                  </div>

                  {/* Status pill + sub-text */}
                  <div className="flex flex-col items-end gap-1 shrink-0 text-right min-w-[120px]">
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

                  {/* Actions cluster */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toast.info("Quick actions coming soon");
                      }}
                      className="hidden sm:inline-flex text-text-muted hover:text-text p-1.5 rounded-full hover:bg-white/[0.06] opacity-0 group-hover:opacity-100 transition-all"
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
        </div>
      )}

      {filtered.length > 0 && (
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>
            Showing <strong className="text-text">{filtered.length}</strong>
            {filtered.length !== counts.total && (
              <> of <strong className="text-text">{counts.total}</strong></>
            )}{" "}
            purchase order{filtered.length === 1 ? "" : "s"}
          </span>
        </div>
      )}

      {/* Floating action button — mobile only */}
      {canCreate && (
        <Link
          to="/app/purchase-orders/new"
          className="sm:hidden fixed bottom-5 right-4 z-30 bg-primary hover:brightness-110 text-primary-foreground rounded-full shadow-2xl w-14 h-14 flex items-center justify-center transition-transform active:scale-95"
          aria-label="Create PO"
        >
          <Plus className="h-6 w-6" strokeWidth={2.5} />
        </Link>
      )}
    </div>
  );
}
