import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus, TrendingUp, CheckCircle2, Clock, XCircle,
} from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import StatusPill from "../../../components/data/StatusPill.jsx";
import KpiStatCard from "../../../components/data/KpiStatCard.jsx";
import { useGRNStore } from "../store.js";
import { useAuthStore } from "../../auth/store.js";
import RefreshButton from "../../../components/data/RefreshButton.jsx";
import Skeleton from "../../../components/feedback/Skeleton.jsx";

const TONE = { full: "success", partial: "warning", rejected: "danger" };

// Mirrors backend WAREHOUSE_ROLES — employees cannot create GRNs.
const WAREHOUSE_ROLES = new Set(["admin", "purchase_officer", "manager", "hod", "cfo", "ceo"]);

function SkRow() {
  return (
    <tr>
      <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
      <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
      <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
      <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
      <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
    </tr>
  );
}

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

export default function GRNListPage() {
  const rows = useGRNStore((s) => s.items);
  const loading = useGRNStore((s) => s.loading);
  const fetchAll = useGRNStore((s) => s.fetchAll);
  const userRole = useAuthStore((s) => s.user?.role);
  const canCreate = WAREHOUSE_ROLES.has(userRole);

  const [status, setStatus] = useState("all");
  const toggleStatus = (s) => setStatus((prev) => (prev === s ? "all" : s));

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // KPI counts from the full unfiltered list.
  const counts = useMemo(() => {
    const c = { total: rows.length, full: 0, partial: 0, rejected: 0 };
    for (const r of rows) {
      if (r.status === "full") c.full += 1;
      else if (r.status === "rejected") c.rejected += 1;
      else c.partial += 1;
    }
    return c;
  }, [rows]);

  // Filtered rows for the table
  const filtered = useMemo(() => {
    if (status === "all") return rows;
    if (status === "partial") {
      return rows.filter((r) => r.status !== "full" && r.status !== "rejected");
    }
    return rows.filter((r) => r.status === status);
  }, [rows, status]);

  const initialLoading = loading && rows.length === 0;

  return (
    <div className="max-w-[1200px] mx-auto space-y-4 sm:space-y-6">
      <PageHeader
        title="Goods Receipt Notes"
        subtitle="Log incoming shipments against purchase orders"
        actions={
          <>
            <RefreshButton onRefresh={fetchAll} loading={loading} />
            {canCreate && (
              <Link to="/app/grn/new" className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary hover:brightness-110 text-primary-foreground text-sm font-bold">
                <Plus className="h-4 w-4" /> Create GRN
              </Link>
            )}
          </>
        }
      />

      {/* KPI strip — same shared component + active treatment as PR/PO/RFQ */}
      <div className="-mx-4 sm:mx-0">
        <div className="flex sm:grid sm:grid-cols-4 gap-3 sm:gap-4 px-4 sm:px-0 overflow-x-auto sm:overflow-visible snap-x snap-mandatory pb-1 sm:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {initialLoading ? (
            Array.from({ length: 4 }).map((_, i) => <SkStatCard key={i} />)
          ) : (
            <>
              <KpiStatCard
                label="Total"
                value={counts.total}
                icon={TrendingUp}
                tone="neutral"
                active={status === "all"}
                onClick={() => setStatus("all")}
              />
              <KpiStatCard
                label="Full Receipt"
                value={counts.full}
                icon={CheckCircle2}
                tone="success"
                active={status === "full"}
                onClick={() => toggleStatus("full")}
              />
              <KpiStatCard
                label="Partial"
                value={counts.partial}
                icon={Clock}
                tone="warning"
                active={status === "partial"}
                onClick={() => toggleStatus("partial")}
              />
              <KpiStatCard
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
      </div>

      {initialLoading ? (
        <div className="bg-surface-container-lowest rounded-lg overflow-hidden border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-container-low text-xs font-semibold text-text-muted uppercase">
                <th className="px-6 py-3 text-left">GRN #</th>
                <th className="px-6 py-3 text-left">PO</th>
                <th className="px-6 py-3 text-left">Vendor</th>
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-left">Items</th>
                <th className="px-6 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkRow key={i} />
              ))}
            </tbody>
          </table>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          {rows.length === 0 ? (
            <>
              No GRNs yet
              {canCreate ? (
                <> — <Link to="/app/grn/new" className="text-primary font-bold hover:underline">log one now</Link></>
              ) : (
                "."
              )}
            </>
          ) : (
            <>No GRNs match the <span className="font-bold text-text">{status}</span> filter.</>
          )}
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-lg overflow-hidden border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-container-low text-xs font-semibold text-text-muted uppercase">
                <th className="px-6 py-3 text-left">GRN #</th>
                <th className="px-6 py-3 text-left">PO</th>
                <th className="px-6 py-3 text-left">Vendor</th>
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-left">Items</th>
                <th className="px-6 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => {
                const items = Array.isArray(r.items) ? r.items : [];
                const totalRecv = items.reduce((s, it) => s + (Number(it.received) || 0), 0);
                const totalOrd = items.reduce((s, it) => s + (Number(it.ordered) || 0), 0);
                return (
                  <tr key={r.id ?? r.number} className="hover:bg-surface-container-low">
                    <td className="px-6 py-4 font-semibold text-primary">
                      <Link to={`/app/grn/${r.number}`} className="hover:underline">{r.number}</Link>
                    </td>
                    <td className="px-6 py-4 text-info">{r.po_number}</td>
                    <td className="px-6 py-4">{r.vendor}</td>
                    <td className="px-6 py-4 text-text-muted">{r.received_date ?? "—"}</td>
                    <td className="px-6 py-4 text-text-muted">{totalRecv} of {totalOrd}</td>
                    <td className="px-6 py-4"><StatusPill tone={TONE[r.status] ?? "neutral"}>{r.status}</StatusPill></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
