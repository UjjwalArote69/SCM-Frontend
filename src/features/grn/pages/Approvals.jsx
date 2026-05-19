import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Inbox, Filter, RefreshCcw, ChevronRight, Clock, ShieldCheck,
  AlertTriangle, Package, Building2,
} from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import KpiStatCard from "../../../components/data/KpiStatCard.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import Skeleton from "../../../components/feedback/Skeleton.jsx";
import { useGRNStore } from "../store.js";
import { useAuthStore } from "../../auth/store.js";

/**
 * FLOW item 50 — dedicated GRN approval queue.
 *
 * Lists every GRN whose chain_stage isn't 'done'. Each GRN is its own row,
 * including replacements (item 53 — replacements appear alongside originals,
 * never merged). A "Show only what's waiting for me" toggle filters to the
 * stages where the current user is the assigned approver.
 */

const STAGE_META = {
  pending_pm:           { label: "PM Inspection",         actor: "Project Manager", tone: "warning" },
  pending_purchase_hod: { label: "Purchase HOD Approval", actor: "Purchase HOD",    tone: "info" },
  pending_finance_hod:  { label: "Finance HOD Approval",  actor: "Finance HOD",     tone: "info" },
  pending_cfo:          { label: "CFO Approval",          actor: "CFO",             tone: "info" },
  pending_ceo:          { label: "CEO — Final",           actor: "CEO",             tone: "info" },
};

function actorForRole(user) {
  if (!user) return null;
  if (user.role === "project_manager") return "pending_pm";
  if (user.role === "cfo") return "pending_cfo";
  if (user.role === "ceo") return "pending_ceo";
  if (user.role === "hod") {
    if (user.department?.code === "PURCH") return "pending_purchase_hod";
    if (user.department?.code === "FIN") return "pending_finance_hod";
  }
  if (user.role === "admin") return "admin"; // admin overrides every stage
  return null;
}

const TONE_CLS = {
  warning: "bg-warning-soft text-warning border-warning/30",
  info:    "bg-info-soft text-info border-info/30",
  success: "bg-success-soft text-success border-success/30",
  danger:  "bg-danger-soft text-danger border-danger/30",
};

export default function GRNApprovalsPage() {
  const items = useGRNStore((s) => s.items);
  const loading = useGRNStore((s) => s.loading);
  const fetchAll = useGRNStore((s) => s.fetchAll);
  const user = useAuthStore((s) => s.user);

  const [mineOnly, setMineOnly] = useState(true);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const myStage = actorForRole(user);
  const isAdmin = user?.role === "admin";

  // Open GRNs = anything not 'done'. Each row is its own GRN — original and
  // replacement appear separately by design (item 53).
  const open = useMemo(
    () => items.filter((g) => g.chain_stage && g.chain_stage !== "done"),
    [items],
  );

  const buckets = useMemo(() => {
    const acc = { pm: 0, purchase: 0, finance: 0, cfo: 0, ceo: 0 };
    for (const g of open) {
      if (g.chain_stage === "pending_pm")           acc.pm++;
      else if (g.chain_stage === "pending_purchase_hod") acc.purchase++;
      else if (g.chain_stage === "pending_finance_hod")  acc.finance++;
      else if (g.chain_stage === "pending_cfo")     acc.cfo++;
      else if (g.chain_stage === "pending_ceo")     acc.ceo++;
    }
    return acc;
  }, [open]);

  const visible = useMemo(() => {
    if (!mineOnly) return open;
    if (isAdmin) return open;
    if (!myStage) return [];
    return open.filter((g) => g.chain_stage === myStage);
  }, [open, mineOnly, isAdmin, myStage]);

  const initialLoading = loading && items.length === 0;

  return (
    <div className="max-w-[1400px] mx-auto pb-8">
      <PageHeader
        title="GRN Approvals"
        subtitle="Every receipt waiting on the 5-stage approval chain. Each GRN — including replacements — is its own row."
        actions={
          <button
            type="button"
            onClick={fetchAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-border rounded-md hover:bg-surface-container-low"
          >
            <RefreshCcw className="h-4 w-4" /> Refresh
          </button>
        }
      />

      {/* Bucket KPIs — one per stage */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <KpiStatCard label="PM"           value={buckets.pm}       tone="warning" icon={ShieldCheck} />
        <KpiStatCard label="Purchase HOD" value={buckets.purchase} tone="info"    icon={ShieldCheck} />
        <KpiStatCard label="Finance HOD"  value={buckets.finance}  tone="info"    icon={ShieldCheck} />
        <KpiStatCard label="CFO"          value={buckets.cfo}      tone="info"    icon={ShieldCheck} />
        <KpiStatCard label="CEO"          value={buckets.ceo}      tone="info"    icon={ShieldCheck} />
      </div>

      {/* "For my action" toggle */}
      {(myStage || isAdmin) && (
        <div className="flex items-center justify-between mb-4 px-1">
          <label className="inline-flex items-center gap-2 text-sm text-text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={mineOnly}
              onChange={(e) => setMineOnly(e.target.checked)}
              className="rounded border-border"
            />
            <Filter className="h-3.5 w-3.5" />
            Show only what's waiting for me
            {!isAdmin && myStage && (
              <span className="text-xs text-text-subtle">
                ({STAGE_META[myStage]?.label})
              </span>
            )}
            {isAdmin && (
              <span className="text-xs text-text-subtle">(admin sees all)</span>
            )}
          </label>
          <div className="text-xs text-text-muted">
            Showing {visible.length} of {open.length}
          </div>
        </div>
      )}

      <section className="bg-surface-container-lowest rounded-lg border border-border overflow-hidden">
        {initialLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : visible.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Inbox}
              title={mineOnly && (myStage || isAdmin) ? "Nothing waiting on you" : "No open approvals"}
              description={mineOnly && (myStage || isAdmin)
                ? "When a GRN reaches your stage, it'll appear here."
                : "All GRNs have either been finalised or rejected."}
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((g) => <Row key={g.number} grn={g} />)}
          </ul>
        )}
      </section>
    </div>
  );
}

function Row({ grn }) {
  const meta = STAGE_META[grn.chain_stage] ?? { label: grn.chain_stage, actor: "—", tone: "warning" };
  const totalDamaged = (grn.items ?? []).reduce((s, it) => s + (Number(it.damaged) || 0), 0);
  return (
    <li>
      <Link
        to={`/app/grn/${grn.number}`}
        className="group flex items-center gap-4 px-5 py-3.5 hover:bg-surface-container-low transition-colors"
      >
        <div className="h-9 w-9 rounded-lg bg-warning-soft text-warning flex items-center justify-center shrink-0">
          <Clock className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold font-mono text-info">{grn.number}</span>
            {grn.replaces_grn_number && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-info-soft text-info">
                <Package className="h-3 w-3" />
                Replacement of {grn.replaces_grn_number}
              </span>
            )}
            {totalDamaged > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-warning-soft text-warning text-[10px] font-bold border border-warning/30">
                <AlertTriangle className="h-3 w-3" /> {totalDamaged} damaged
              </span>
            )}
          </div>
          <div className="text-sm font-semibold text-text truncate mt-0.5">
            PO {grn.po_number}
          </div>
          <div className="text-xs text-text-muted flex items-center gap-1">
            <Building2 className="h-3 w-3" /> {grn.vendor}
          </div>
        </div>
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-bold border ${TONE_CLS[meta.tone]}`}>
          {meta.label}
        </span>
        <ChevronRight className="h-4 w-4 text-text-subtle group-hover:text-primary shrink-0" />
      </Link>
    </li>
  );
}
