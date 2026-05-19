import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  Hourglass,
  Search,
  Building2,
  Clock,
  AlertCircle,
  AlertTriangle,
  Receipt,
  Truck,
  Layers,
  Wallet,
  ShieldCheck,
  Crown,
  TrendingUp,
  X as XIcon,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { usePaymentStore } from "../store.js";
import { useAuthStore } from "../../auth/store.js";
import RefreshButton from "../../../components/data/RefreshButton.jsx";
import Skeleton from "../../../components/feedback/Skeleton.jsx";
import KpiStatCard from "../../../components/data/KpiStatCard.jsx";
import client from "../../../api/client.js";

/**
 * Awaiting Approval — unified queue of:
 *   • Payments  parked at pending_finance_hod / pending_cfo / pending_ceo
 *   • GRNs      already past Purchase HOD that haven't reached 'done' yet
 *               (pending_vendor_replacement / finance_hod / cfo / ceo)
 *
 * The page is role-aware: each viewer gets their own queue first
 * ("Your turn" chip + "Mine" filter), with smart sort by stage urgency
 * and age so the most blocking items float up.
 */

// ─── Helpers ───────────────────────────────────────────────────────────────

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

function isCurrentApprover(user, chainStage) {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (chainStage === "pending_cfo") return user.role === "cfo";
  if (chainStage === "pending_ceo") return user.role === "ceo";
  if (chainStage === "pending_finance_hod") {
    return user.role === "hod" && user.department?.code === "FIN";
  }
  return false;
}

// Stage metadata — shared by Payments and GRNs.
const STAGE_INFO = {
  pending_finance_hod: { label: "Finance HOD",        short: "FIN",  tone: "info",    Icon: Wallet,         rank: 2 },
  pending_cfo:         { label: "CFO Review",         short: "CFO",  tone: "warning", Icon: ShieldCheck,    rank: 1 },
  pending_ceo:         { label: "CEO Final",          short: "CEO",  tone: "danger",  Icon: Crown,          rank: 0 },
  pending_vendor_replacement: { label: "Vendor Agreement", short: "VEN", tone: "warning", Icon: AlertTriangle, rank: 3 },
};

// ─── Mobile-first status filter pill (mirrors PR/PO list pattern) ──────────

function FilterPill({ label, count, active, onClick, tone = "neutral", Icon }) {
  const toneCls = {
    neutral: active
      ? "bg-text text-bg border-text shadow-sm"
      : "border-border bg-surface-container-low/60 text-text-muted hover:text-text",
    primary: active
      ? "bg-primary text-primary-foreground border-primary shadow-[0_2px_8px_-2px_color-mix(in_srgb,var(--color-primary)_55%,transparent)]"
      : "border-primary/25 bg-primary-soft/40 text-primary hover:bg-primary-soft/60",
    info: active
      ? "bg-info text-white border-info shadow-[0_2px_8px_-2px_color-mix(in_srgb,var(--color-info)_55%,transparent)]"
      : "border-info/25 bg-info-soft/40 text-info hover:bg-info-soft/60",
    warning: active
      ? "bg-warning text-white border-warning shadow-[0_2px_8px_-2px_color-mix(in_srgb,var(--color-warning)_55%,transparent)]"
      : "border-warning/25 bg-warning-soft/40 text-warning hover:bg-warning-soft/60",
    danger: active
      ? "bg-danger text-white border-danger shadow-[0_2px_8px_-2px_color-mix(in_srgb,var(--color-danger)_55%,transparent)]"
      : "border-danger/25 bg-danger-soft/40 text-danger hover:bg-danger-soft/60",
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
          className={`tabular-nums text-[11px] font-bold ${
            active ? "" : "opacity-70"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Loading skeletons ─────────────────────────────────────────────────────

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

// ─── Empty state ───────────────────────────────────────────────────────────

function EmptyState({ title, body, IconC = Hourglass }) {
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

// ─── Page ──────────────────────────────────────────────────────────────────

export default function AwaitingApprovalPage() {
  const paymentRows = usePaymentStore((s) => s.items);
  const paymentsLoading = usePaymentStore((s) => s.loading);
  const fetchPayments = usePaymentStore((s) => s.fetchAll);
  const user = useAuthStore((s) => s.user);

  const [query, setQuery] = useState("");
  const [view, setView] = useState("all"); // all | payments | grns
  const [stageFilter, setStageFilter] = useState("all");
  const [mineOnly, setMineOnly] = useState(false);
  const [staleOnly, setStaleOnly] = useState(false);

  // GRNs that have already cleared Purchase HOD (precursor work that will
  // become payments). Fetched off the /payments/awaiting-approval endpoint.
  const [grns, setGrns] = useState(null);
  const [grnsLoading, setGrnsLoading] = useState(false);
  const reloadGrns = async () => {
    setGrnsLoading(true);
    try {
      const r = await client.get("/payments/awaiting-approval");
      setGrns(Array.isArray(r.data?.data) ? r.data.data : []);
    } catch {
      setGrns([]);
    } finally {
      setGrnsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    reloadGrns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshAll = () => {
    fetchPayments(true);
    reloadGrns();
  };

  // Normalize both sets into a uniform shape.
  const items = useMemo(() => {
    const list = [];
    for (const r of paymentRows) {
      if (!STAGE_INFO[r.chain_stage]) continue;
      list.push({
        id: `pay-${r.number}`,
        kind: "payment",
        number: r.number,
        po_number: r.po_number ?? null,
        vendor: r.vendor ?? "—",
        chain_stage: r.chain_stage,
        amount: Number(r.amount) || 0,
        damaged: 0,
        date: r.created_at,
        link: `/app/payments/${r.number}`,
        yours: isCurrentApprover(user, r.chain_stage),
      });
    }
    for (const g of grns ?? []) {
      if (!STAGE_INFO[g.chain_stage]) continue;
      const damaged = (g.items ?? []).reduce(
        (s, it) => s + (Number(it.damaged) || 0),
        0,
      );
      list.push({
        id: `grn-${g.number}`,
        kind: "grn",
        number: g.number,
        po_number: g.po_number ?? null,
        vendor: g.vendor ?? "—",
        chain_stage: g.chain_stage,
        amount: 0,
        damaged,
        date: g.received_date ?? g.created_at,
        link: `/app/grn/${g.number}`,
        yours: isCurrentApprover(user, g.chain_stage),
      });
    }
    return list;
  }, [paymentRows, grns, user]);

  // Counts derived from the full unfiltered set — drives the KPI strip + chips.
  const counts = useMemo(() => {
    const c = {
      total: 0,
      mine: 0,
      payments: 0,
      grns: 0,
      fin: 0, cfo: 0, ceo: 0, vendor: 0,
      finAmt: 0, cfoAmt: 0, ceoAmt: 0,
      atRisk: 0, // age >= 7d
    };
    for (const it of items) {
      c.total++;
      if (it.yours) c.mine++;
      if (it.kind === "payment") c.payments++;
      else c.grns++;
      const age = daysAgo(it.date);
      if (age !== null && age >= 7) c.atRisk++;
      if (it.chain_stage === "pending_finance_hod") {
        c.fin++; c.finAmt += it.amount;
      } else if (it.chain_stage === "pending_cfo") {
        c.cfo++; c.cfoAmt += it.amount;
      } else if (it.chain_stage === "pending_ceo") {
        c.ceo++; c.ceoAmt += it.amount;
      } else if (it.chain_stage === "pending_vendor_replacement") {
        c.vendor++;
      }
    }
    return c;
  }, [items]);

  // Total ₹ at stake (excluding GRNs, which have no draft amount yet).
  const totalAmount = counts.finAmt + counts.cfoAmt + counts.ceoAmt;

  // Filter pipeline.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((it) => {
        if (view === "all") return true;
        if (view === "payments") return it.kind === "payment";
        if (view === "grns") return it.kind === "grn";
        return true;
      })
      .filter(
        (it) =>
          !q ||
          it.number.toLowerCase().includes(q) ||
          (it.po_number ?? "").toLowerCase().includes(q) ||
          (it.vendor ?? "").toLowerCase().includes(q),
      )
      .filter((it) => stageFilter === "all" || it.chain_stage === stageFilter)
      .filter((it) => !mineOnly || it.yours)
      .filter((it) => {
        if (!staleOnly) return true;
        const age = daysAgo(it.date);
        return age !== null && age >= 7;
      })
      .sort((a, b) => {
        // 1. Your turn first.
        if (a.yours && !b.yours) return -1;
        if (!a.yours && b.yours) return 1;
        // 2. Stage urgency (CEO > CFO > FIN > vendor).
        const diff = STAGE_INFO[a.chain_stage].rank - STAGE_INFO[b.chain_stage].rank;
        if (diff !== 0) return diff;
        // 3. Oldest first.
        return new Date(a.date ?? 0) - new Date(b.date ?? 0);
      });
  }, [items, query, view, stageFilter, mineOnly, staleOnly]);

  const initialLoading =
    (paymentsLoading && paymentRows.length === 0) || grns === null;

  const canFilterByMine =
    user?.role === "admin" ||
    user?.role === "cfo" ||
    user?.role === "ceo" ||
    (user?.role === "hod" && user?.department?.code === "FIN");

  // Stage filter chips (sticky-ish under the search bar)
  const STAGE_PILLS = [
    { label: "All stages",      filter: "all",                          count: counts.total,  tone: "neutral" },
    { label: "Finance HOD",     filter: "pending_finance_hod",          count: counts.fin,    tone: "info" },
    { label: "CFO",             filter: "pending_cfo",                  count: counts.cfo,    tone: "warning" },
    { label: "CEO",             filter: "pending_ceo",                  count: counts.ceo,    tone: "danger" },
    { label: "Vendor agreement",filter: "pending_vendor_replacement",   count: counts.vendor, tone: "warning" },
  ];

  const hasActiveFilter =
    query
    || view !== "all"
    || stageFilter !== "all"
    || mineOnly
    || staleOnly;

  const clearAll = () => {
    setQuery("");
    setView("all");
    setStageFilter("all");
    setMineOnly(false);
    setStaleOnly(false);
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-8 space-y-4 sm:space-y-6">
      {/* Breadcrumb */}
      <nav className="text-[11px] sm:text-[12px] font-medium text-text-muted flex items-center gap-1.5">
        <Link
          to="/app/payments"
          className="hover:text-primary transition-colors"
        >
          Payments
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-text-subtle" />
        <span className="text-text">Awaiting Approval</span>
      </nav>

      {/* Hero header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-text-muted">
            <Layers className="h-3 w-3" strokeWidth={2} />
            <span className="text-[10px] font-semibold tracking-[0.22em] uppercase">
              Finance · Approval Queue
            </span>
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-bold text-text leading-tight tracking-tight mt-1 flex items-center gap-2">
            <Hourglass className="h-6 w-6 sm:h-7 sm:w-7 text-info" strokeWidth={2.25} />
            Awaiting Approval
          </h1>
          <p className="hidden sm:block text-text-muted text-sm mt-1.5">
            Payments and GRNs queued for Finance HOD, CFO or CEO. Approvers see
            their queue first.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <RefreshButton onRefresh={refreshAll} loading={paymentsLoading || grnsLoading} />
        </div>
      </div>

      {/* Mobile filter pills (KPI replacement) */}
      <div className="sm:hidden flex flex-wrap gap-1.5">
        {initialLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))
        ) : (
          <>
            <FilterPill
              label="Total"
              count={counts.total}
              active={stageFilter === "all" && !mineOnly}
              tone="neutral"
              onClick={() => { setStageFilter("all"); setMineOnly(false); }}
            />
            {canFilterByMine && (
              <FilterPill
                label="Mine"
                count={counts.mine}
                active={mineOnly}
                tone="primary"
                Icon={Sparkles}
                onClick={() => setMineOnly((v) => !v)}
              />
            )}
            <FilterPill
              label="FIN HOD"
              count={counts.fin}
              active={stageFilter === "pending_finance_hod"}
              tone="info"
              onClick={() =>
                setStageFilter((s) =>
                  s === "pending_finance_hod" ? "all" : "pending_finance_hod",
                )
              }
            />
            <FilterPill
              label="CFO"
              count={counts.cfo}
              active={stageFilter === "pending_cfo"}
              tone="warning"
              onClick={() =>
                setStageFilter((s) =>
                  s === "pending_cfo" ? "all" : "pending_cfo",
                )
              }
            />
            <FilterPill
              label="CEO"
              count={counts.ceo}
              active={stageFilter === "pending_ceo"}
              tone="danger"
              onClick={() =>
                setStageFilter((s) =>
                  s === "pending_ceo" ? "all" : "pending_ceo",
                )
              }
            />
          </>
        )}
      </div>

      {/* Desktop KPI strip */}
      <div className={`hidden sm:grid gap-4 ${canFilterByMine ? "sm:grid-cols-5" : "sm:grid-cols-4"}`}>
        {initialLoading ? (
          Array.from({ length: canFilterByMine ? 5 : 4 }).map((_, i) => (
            <SkStat key={i} />
          ))
        ) : (
          <>
            <KpiStatCard
              label="Total queued"
              value={counts.total}
              icon={TrendingUp}
              tone="neutral"
              active={stageFilter === "all" && !mineOnly}
              onClick={() => { setStageFilter("all"); setMineOnly(false); }}
            />
            {canFilterByMine && (
              <KpiStatCard
                label="Your turn"
                value={counts.mine}
                icon={Sparkles}
                tone="primary"
                active={mineOnly}
                onClick={() => setMineOnly((v) => !v)}
              />
            )}
            <KpiStatCard
              label="Finance HOD"
              value={counts.fin}
              icon={Wallet}
              tone="info"
              active={stageFilter === "pending_finance_hod"}
              onClick={() =>
                setStageFilter((s) =>
                  s === "pending_finance_hod" ? "all" : "pending_finance_hod",
                )
              }
            />
            <KpiStatCard
              label="CFO"
              value={counts.cfo}
              icon={ShieldCheck}
              tone="warning"
              active={stageFilter === "pending_cfo"}
              onClick={() =>
                setStageFilter((s) =>
                  s === "pending_cfo" ? "all" : "pending_cfo",
                )
              }
            />
            <KpiStatCard
              label="CEO"
              value={counts.ceo}
              icon={Crown}
              tone="danger"
              active={stageFilter === "pending_ceo"}
              onClick={() =>
                setStageFilter((s) =>
                  s === "pending_ceo" ? "all" : "pending_ceo",
                )
              }
            />
          </>
        )}
      </div>

      {/* ₹ at stake + at-risk banner */}
      {!initialLoading && (totalAmount > 0 || counts.atRisk > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {totalAmount > 0 && (
            <div className="glass-card rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
                  <TrendingUp className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
                <span className="text-[11px] sm:text-xs text-text-muted truncate">
                  Payment value queued for approval
                </span>
              </div>
              <span className="text-base sm:text-lg font-black text-primary font-mono tabular-nums">
                {fmtCompactINR(totalAmount)}
              </span>
            </div>
          )}
          {counts.atRisk > 0 && (
            <button
              type="button"
              onClick={() => setStaleOnly((v) => !v)}
              className={`glass-card rounded-2xl px-4 py-3 flex items-center justify-between gap-3 text-left transition-all active:scale-[0.98] ${
                staleOnly
                  ? "ring-2 ring-warning/40 bg-warning-soft/20"
                  : "hover:ring-1 hover:ring-warning/20"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-warning-soft text-warning flex items-center justify-center shrink-0">
                  <AlertCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
                <span className="text-[11px] sm:text-xs text-text-muted truncate">
                  {staleOnly ? "Showing stale items only · click to clear" : "Sitting longer than 7 days"}
                </span>
              </div>
              <span className="text-base sm:text-lg font-black text-warning font-mono tabular-nums">
                {counts.atRisk}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Filter bar */}
      <div className="glass-card rounded-2xl p-2 sm:p-3 flex items-center gap-2 sm:flex-wrap sm:gap-3">
        <label className="relative flex-1 min-w-0 sm:min-w-[260px] flex items-center gap-2 bg-surface-container-low/60 border border-border rounded-full pl-3.5 pr-2 py-2 cursor-text hover:border-primary/40 focus-within:border-primary/60 transition-colors">
          <Search className="h-3.5 w-3.5 text-text-muted shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search number, PO, or vendor…"
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

        {/* View tabs — Payments vs GRNs */}
        <div className="flex items-center bg-surface-container-low/60 border border-border rounded-full p-0.5 shrink-0">
          {[
            { key: "all",      label: "All",       Icon: Layers },
            { key: "payments", label: "Payments",  Icon: Receipt },
            { key: "grns",     label: "GRNs",      Icon: Truck },
          ].map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className={`px-3 py-1.5 text-[11.5px] font-bold rounded-full inline-flex items-center gap-1.5 transition-all ${
                view === key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-text-muted hover:text-text"
              }`}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
              <span className="hidden md:inline">{label}</span>
            </button>
          ))}
        </div>

        {canFilterByMine && (
          <button
            type="button"
            onClick={() => setMineOnly((v) => !v)}
            className={`hidden sm:inline-flex shrink-0 px-3 py-2 text-[12px] font-semibold rounded-full border items-center gap-1.5 transition-all ${
              mineOnly
                ? "border-primary/40 bg-primary-soft text-primary"
                : "border-border bg-surface-container-low/60 text-text-muted hover:text-text"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2.25} />
            Mine only
            {counts.mine > 0 && (
              <span
                className={`tabular-nums text-[11px] font-bold ${
                  mineOnly ? "" : "opacity-70"
                }`}
              >
                {counts.mine}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Desktop stage filter chips */}
      <div className="hidden sm:flex flex-wrap gap-1.5">
        {STAGE_PILLS.map((p) => (
          <FilterPill
            key={p.filter}
            label={p.label}
            count={p.count}
            tone={p.tone}
            active={stageFilter === p.filter || (p.filter === "all" && stageFilter === "all")}
            onClick={() => setStageFilter(p.filter)}
          />
        ))}
      </div>

      {/* Active filter strip */}
      {hasActiveFilter && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
          <span className="hidden sm:inline">Filtering by:</span>
          {view !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-soft text-primary font-bold uppercase tracking-wider text-[10px]">
              {view}
              <button
                type="button"
                onClick={() => setView("all")}
                className="hover:brightness-110 -mr-0.5"
                aria-label="Clear view filter"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          )}
          {stageFilter !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-info-soft text-info font-bold uppercase tracking-wider text-[10px]">
              {STAGE_INFO[stageFilter]?.label ?? stageFilter}
              <button
                type="button"
                onClick={() => setStageFilter("all")}
                className="hover:brightness-110 -mr-0.5"
                aria-label="Clear stage filter"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          )}
          {mineOnly && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-soft text-primary font-bold uppercase tracking-wider text-[10px]">
              Mine
              <button
                type="button"
                onClick={() => setMineOnly(false)}
                className="hover:brightness-110 -mr-0.5"
                aria-label="Clear mine filter"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          )}
          {staleOnly && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning-soft text-warning font-bold uppercase tracking-wider text-[10px]">
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
            body="Nothing matches the filters above. Try clearing one or two to broaden the search."
            IconC={Search}
          />
        ) : (
          <EmptyState
            title="Inbox zero — nothing waiting"
            body="Every payment and GRN has either cleared the chain, been rejected, or hasn't reached Finance yet."
            IconC={CheckCircle2}
          />
        )
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((it) => <ItemRow key={it.id} item={it} />)}
        </div>
      )}

      {/* Footer counter */}
      {filtered.length > 0 && !initialLoading && (
        <div className="flex items-center justify-center sm:justify-between text-xs text-text-muted px-1 pt-1">
          <span className="text-center sm:text-left">
            Showing <strong className="text-text">{filtered.length}</strong>
            {filtered.length !== counts.total && (
              <>
                {" "}of <strong className="text-text">{counts.total}</strong>
              </>
            )}{" "}
            item{filtered.length === 1 ? "" : "s"}
            {counts.mine > 0 && !mineOnly && canFilterByMine && (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={() => setMineOnly(true)}
                  className="text-primary font-semibold hover:underline"
                >
                  {counts.mine} waiting on you
                </button>
              </>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Row ───────────────────────────────────────────────────────────────────

function ItemRow({ item }) {
  const stage = STAGE_INFO[item.chain_stage];
  const StageIcon = stage.Icon;
  const age = daysAgo(item.date);
  const stale = age !== null && age >= 7;
  const veryStale = age !== null && age >= 14;
  const isPayment = item.kind === "payment";
  const KindIcon = isPayment ? Receipt : Truck;

  const stripColor = stage.tone === "info"    ? "var(--color-info)"
    : stage.tone === "warning" ? "var(--color-warning)"
    : stage.tone === "danger"  ? "var(--color-danger)"
    : "var(--color-text)";

  const iconBg = stage.tone === "info"    ? "bg-info-soft text-info"
    : stage.tone === "warning" ? "bg-warning-soft text-warning"
    : stage.tone === "danger"  ? "bg-danger-soft text-danger"
    : "bg-surface-container text-text-muted";

  const chipCls = stage.tone === "info"    ? "bg-info-soft text-info border-info/30"
    : stage.tone === "warning" ? "bg-warning-soft text-warning border-warning/30"
    : stage.tone === "danger"  ? "bg-danger-soft text-danger border-danger/30"
    : "bg-surface-container border-border text-text";

  return (
    <Link
      to={item.link}
      className="group relative flex items-start sm:items-center gap-3 sm:gap-4 pl-4 pr-3 sm:pl-5 sm:pr-4 py-3 sm:py-4 rounded-2xl sm:rounded-xl border border-border bg-surface shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden active:scale-[0.99]"
    >
      <span
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ background: stripColor }}
        aria-hidden
      />

      {/* Stage icon avatar */}
      <div
        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg} relative`}
      >
        <StageIcon className="h-[18px] w-[18px]" strokeWidth={2} />
        <span
          className={`absolute -top-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center border-2 border-surface ${
            isPayment ? "bg-primary text-primary-foreground" : "bg-info text-white"
          }`}
          title={isPayment ? "Payment" : "GRN"}
        >
          <KindIcon className="h-2.5 w-2.5" strokeWidth={2.5} />
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between sm:justify-start gap-2 mb-0.5">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="font-mono text-[11.5px] sm:text-[13px] font-bold text-primary truncate tracking-wide">
              {item.number}
            </span>
            <span className="hidden sm:inline text-text-subtle">·</span>
            <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wider text-text-muted">
              {isPayment ? "PAYMENT" : "GRN"}
            </span>
            {item.po_number && (
              <>
                <span className="hidden md:inline text-text-subtle">·</span>
                <span className="hidden md:inline text-[11px] font-mono text-text-muted">
                  from {item.po_number}
                </span>
              </>
            )}
            {item.yours && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold tracking-widest shrink-0 ml-0.5">
                YOUR TURN
              </span>
            )}
          </div>
          <div className="sm:hidden shrink-0">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${chipCls}`}>
              <StageIcon className="h-3 w-3" strokeWidth={2.5} />
              {stage.short}
            </span>
          </div>
        </div>

        {/* Vendor (title) */}
        <div className="text-[14px] font-semibold text-text truncate leading-snug flex items-center gap-1.5">
          <Building2 className="md:hidden h-3 w-3 text-text-subtle shrink-0" />
          {item.vendor}
        </div>

        {/* Meta row */}
        <div className="text-[11px] text-text-muted truncate mt-0.5">
          {isPayment && item.amount > 0 && (
            <span className="font-mono tabular-nums text-text font-semibold">
              {fmtINR(item.amount)}
            </span>
          )}
          {item.damaged > 0 && (
            <>
              {isPayment && item.amount > 0 && " · "}
              <span className="text-warning font-semibold inline-flex items-center gap-0.5">
                <AlertTriangle className="h-3 w-3" strokeWidth={2.5} />
                {item.damaged} damaged
              </span>
            </>
          )}
          {item.po_number && (
            <span className="md:hidden text-text-subtle">
              {(isPayment && item.amount > 0) || item.damaged > 0 ? " · " : ""}
              from {item.po_number}
            </span>
          )}
        </div>
      </div>

      {/* Desktop right column */}
      <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0 text-right sm:min-w-[140px]">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${chipCls}`}
        >
          <StageIcon className="h-3 w-3" strokeWidth={2.5} />
          {stage.label}
        </span>
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-medium tabular-nums ${
            veryStale ? "text-danger font-bold"
              : stale ? "text-warning font-bold"
              : "text-text-subtle"
          }`}
        >
          {(stale || veryStale) && <AlertCircle className="h-3 w-3" strokeWidth={2.5} />}
          <Clock className="h-3 w-3" />
          {age !== null ? `${age}d sitting` : "today"}
        </span>
      </div>

      <ChevronRight className="hidden sm:inline h-4 w-4 text-text-subtle group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
    </Link>
  );
}
