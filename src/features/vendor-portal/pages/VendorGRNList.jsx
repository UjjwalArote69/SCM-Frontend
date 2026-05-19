import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  PackageCheck,
  AlertTriangle,
  CalendarCheck,
  ChevronRight,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Truck,
  ShieldAlert,
} from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import StatusPill from "../../../components/data/StatusPill.jsx";
import KpiStatCard from "../../../components/data/KpiStatCard.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import { useGRNStore } from "../../grn/store.js";

// Replacement-status tone palette — only meaningful once the GRN has been
// PM-approved AND has at least one damaged unit. Pre-PM GRNs get the
// "Awaiting PM" pill instead.
const REPLACEMENT_TONE = {
  pending:  { label: "ACTION NEEDED", chip: "bg-warning-soft text-warning border-warning/30", icon: AlertTriangle, iconCls: "text-warning" },
  accepted: { label: "SCHEDULED",     chip: "bg-info-soft text-info border-info/30",          icon: CalendarCheck, iconCls: "text-info" },
  rejected: { label: "DISPUTED",      chip: "bg-danger-soft text-danger border-danger/30",    icon: XCircle,       iconCls: "text-danger" },
  replaced: { label: "REPLACED",      chip: "bg-success-soft text-success border-success/30", icon: CheckCircle2,  iconCls: "text-success" },
};

function damagedCount(grn) {
  return (grn.items ?? []).reduce((s, it) => s + (Number(it.damaged) || 0), 0);
}
function receivedCount(grn) {
  return (grn.items ?? []).reduce((s, it) => s + (Number(it.received) || 0), 0);
}

/**
 * Decide which tone / pill describes the GRN from the *vendor's* point of
 * view. Order matters — earliest match wins.
 */
function vendorStatusOf(grn) {
  // Site/PM rejected the whole receipt outright.
  if (grn.status === "rejected") {
    return { key: "rejected", label: "REJECTED", tone: "danger", chip: "bg-danger-soft text-danger border-danger/30", icon: XCircle, sub: "Receipt was rejected by site." };
  }
  // Fresh receipt — PM hasn't approved yet. Site person just logged it.
  if (grn.chain_stage && grn.chain_stage !== "done") {
    const damaged = damagedCount(grn);
    return {
      key: "awaiting_pm",
      label: damaged > 0 ? "DAMAGE REPORTED" : "JUST RECEIVED",
      tone: damaged > 0 ? "warning" : "info",
      chip: damaged > 0
        ? "bg-warning-soft text-warning border-warning/30"
        : "bg-info-soft text-info border-info/30",
      icon: damaged > 0 ? AlertTriangle : Truck,
      sub: damaged > 0
        ? `${damaged} unit${damaged === 1 ? "" : "s"} flagged as damaged · awaiting PM approval`
        : "Site has logged the goods · awaiting PM approval",
    };
  }
  // PM has approved.
  if (grn.replacement_status) {
    const t = REPLACEMENT_TONE[grn.replacement_status] ?? REPLACEMENT_TONE.pending;
    const tone = grn.replacement_status === "pending" ? "warning"
      : grn.replacement_status === "accepted" ? "info"
      : grn.replacement_status === "rejected" ? "danger" : "success";
    return {
      key: grn.replacement_status,
      label: t.label,
      tone,
      chip: t.chip,
      icon: t.icon,
      sub: grn.replacement_target_date
        ? `Target replacement: ${new Date(grn.replacement_target_date).toLocaleDateString()}`
        : grn.replacement_status === "pending"
          ? "Waiting for your acknowledgement"
          : `Replacement: ${grn.replacement_status}`,
    };
  }
  // PM approved AND no damage — clean delivery.
  return {
    key: "delivered",
    label: "DELIVERED",
    tone: "success",
    chip: "bg-success-soft text-success border-success/30",
    icon: CheckCircle2,
    sub: "Receipt approved by PM. No issues reported.",
  };
}

export default function VendorGRNList() {
  const items   = useGRNStore((s) => s.items);
  const loading = useGRNStore((s) => s.loading);
  const fetchAll = useGRNStore((s) => s.fetchAll);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Backend already scopes to vendor (supplier or buyer-arranged transport).
  // No frontend filter — every GRN scoped to the vendor surfaces here, the
  // moment site logs it.
  const rows = items;

  const counts = useMemo(() => {
    const out = { total: rows.length, awaitingPm: 0, damageOpen: 0, scheduled: 0, replaced: 0, disputed: 0 };
    for (const g of rows) {
      const v = vendorStatusOf(g);
      if (v.key === "awaiting_pm") out.awaitingPm += 1;
      if (v.key === "pending")     out.damageOpen += 1;
      if (v.key === "accepted")    out.scheduled  += 1;
      if (v.key === "replaced")    out.replaced   += 1;
      if (v.key === "rejected")    out.disputed   += 1;
    }
    return out;
  }, [rows]);

  // GRNs with damaged units OR pending replacement decisions are the most
  // urgent — float them to the top of the list.
  const sorted = useMemo(() => {
    const score = (g) => {
      const dmg = damagedCount(g);
      if (g.replacement_status === "pending") return 0;
      if (dmg > 0 && g.chain_stage !== "done") return 1;
      if (g.replacement_status === "accepted") return 2;
      if (dmg > 0) return 3;
      return 4;
    };
    return [...rows].sort((a, b) => {
      const d = score(a) - score(b);
      if (d !== 0) return d;
      return (b.id ?? 0) - (a.id ?? 0);
    });
  }, [rows]);

  const initialLoading = loading && items.length === 0;
  const damageHeadline = counts.damageOpen + (counts.awaitingPm > 0
    ? sorted.filter((g) => g.chain_stage !== "done" && damagedCount(g) > 0).length
    : 0);

  return (
    <div className="max-w-6xl mx-auto pb-8">
      <PageHeader
        title="Goods Receipts"
        subtitle="Every receipt logged against your POs — including fresh ones still awaiting PM approval. Damage reports surface immediately."
        actions={
          <button
            type="button"
            onClick={() => fetchAll(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-border rounded-md hover:bg-surface-container-low"
          >
            <RefreshCcw className="h-4 w-4" /> Refresh
          </button>
        }
      />

      {damageHeadline > 0 && (
        <div className="mb-4 flex items-start gap-3 p-3 rounded-lg border border-warning/40 bg-warning-soft/50 text-warning">
          <ShieldAlert className="h-5 w-5 mt-0.5 shrink-0" strokeWidth={2.25} />
          <div className="text-sm">
            <div className="font-bold">
              {damageHeadline} receipt{damageHeadline === 1 ? "" : "s"} with damaged goods
            </div>
            <div className="text-xs text-warning/90 mt-0.5">
              Open each one to see the affected lines. You can accept the
              replacement plan, propose a different date, or dispute the
              damage report.
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <KpiStatCard label="All receipts"   value={counts.total}      tone="info"    icon={PackageCheck} />
        <KpiStatCard label="Awaiting PM"    value={counts.awaitingPm} tone="info"    icon={Clock} />
        <KpiStatCard label="Action needed"  value={counts.damageOpen} tone="warning" icon={AlertTriangle} />
        <KpiStatCard label="Scheduled"      value={counts.scheduled}  tone="info"    icon={CalendarCheck} />
        <KpiStatCard label="Replaced"       value={counts.replaced}   tone="success" icon={CheckCircle2} />
      </div>

      {initialLoading ? (
        <div className="flex items-center justify-center py-16 text-text-muted">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title="No goods receipts yet"
          message="When the site person logs goods received against one of your POs, it will appear here immediately — including a damage flag if any units were marked damaged."
        />
      ) : (
        <ul className="space-y-2">
          {sorted.map((g) => {
            const v = vendorStatusOf(g);
            const Icon = v.icon;
            const dmg = damagedCount(g);
            const rec = receivedCount(g);
            return (
              <li key={g.number}>
                <Link
                  to={`/vendor/grn/${g.number}`}
                  className="group flex items-center gap-4 px-4 py-3.5 bg-surface-container-lowest border border-border rounded-lg hover:border-primary hover:shadow-md transition-all"
                >
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${v.chip.replace("text-", "bg-").replace("-soft", "/20")}`}>
                    <Icon className={`h-5 w-5 text-${v.tone}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold font-mono text-info">{g.number}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border tracking-wider ${v.chip}`}>
                        {v.label}
                      </span>
                      {dmg > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border tracking-wider bg-danger-soft text-danger border-danger/30">
                          <AlertTriangle className="h-3 w-3" />
                          {dmg} damaged
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-text mt-0.5 truncate">
                      {g.po_number}
                      {rec > 0 && (
                        <span className="text-text-muted font-normal">
                          {" "}· {rec} unit{rec === 1 ? "" : "s"} received
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-text-muted">{v.sub}</div>
                  </div>
                  <StatusPill tone={
                    g.status === "rejected" ? "danger"
                    : g.chain_stage === "done" ? "success" : "warning"
                  }>
                    {g.status === "rejected"
                      ? "Rejected"
                      : g.chain_stage === "done" ? "PM Approved" : "Pending PM"}
                  </StatusPill>
                  <ChevronRight className="h-4 w-4 text-text-subtle group-hover:text-primary shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
