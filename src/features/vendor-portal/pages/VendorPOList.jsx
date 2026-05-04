import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Inbox, Clock, CheckCircle2, XCircle, Truck } from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import StatusPill from "../../../components/data/StatusPill.jsx";
import RefreshButton from "../../../components/data/RefreshButton.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import KpiCard from "../../../components/ui/KpiCard.jsx";
import Skeleton from "../../../components/feedback/Skeleton.jsx";
import { usePOStore } from "../../purchase-orders/store.js";

function SkKpiCard() {
  return (
    <div className="rounded-lg border border-border bg-surface-container-lowest p-4 flex flex-col gap-2 shadow-sm">
      <Skeleton className="h-9 w-9 rounded-md" />
      <div className="space-y-1.5">
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className="h-7 w-12" />
      </div>
    </div>
  );
}

function SkRow() {
  return (
    <tr>
      <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
      <td className="px-6 py-4"><Skeleton className="h-3 w-20" /></td>
      <td className="px-6 py-4"><Skeleton className="h-3 w-20" /></td>
      <td className="px-6 py-4"><Skeleton className="h-3 w-16" /></td>
      <td className="px-6 py-4 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
    </tr>
  );
}

const TONE = {
  pending: "warning",
  accepted: "success",
  rejected: "danger",
  fulfilled: "success",
};

function fmtINR(n) {
  return `₹${Number(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function VendorPOListPage() {
  const pos = usePOStore((s) => s.items);
  const loading = usePOStore((s) => s.loading);
  const fetchAll = usePOStore((s) => s.fetchAll);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Backend already scopes /pos to AppVendor::where('user_id', $user->id).
  // No client-side filter — that would either leak other vendors' POs (if it
  // falls back) or hide our own (if user.name != vendor_name).
  const counts = useMemo(() => {
    const c = { pending: 0, accepted: 0, fulfilled: 0, rejected: 0 };
    for (const p of pos) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [pos]);

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title="My Purchase Orders"
        subtitle="Orders placed by your buyers"
        actions={<RefreshButton onRefresh={fetchAll} loading={loading} />}
      />

      {loading && pos.length === 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkKpiCard key={i} />
          ))}
        </div>
      ) : pos.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <KpiCard
            label="Awaiting Acceptance"
            value={counts.pending}
            icon={Clock}
            tone={counts.pending > 0 ? "warning" : "neutral"}
          />
          <KpiCard
            label="Accepted"
            value={counts.accepted}
            icon={CheckCircle2}
            tone="success"
          />
          <KpiCard
            label="Fulfilled"
            value={counts.fulfilled}
            icon={Truck}
            tone="success"
          />
          <KpiCard
            label="Rejected"
            value={counts.rejected}
            icon={XCircle}
            tone={counts.rejected > 0 ? "danger" : "neutral"}
          />
        </div>
      ) : null}

      {loading && pos.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-lg overflow-hidden border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-container-low text-[10px] font-bold text-text-muted uppercase tracking-widest">
                <th className="px-6 py-3 text-left">PO #</th>
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-left">Source PR</th>
                <th className="px-6 py-3 text-left">Expected</th>
                <th className="px-6 py-3 text-right">Amount</th>
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
      ) : pos.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No purchase orders yet"
          description="POs your buyers issue will land here. Make sure you've quoted any open RFQs."
          action={{ to: "/vendor/quotation-requests", label: "Browse open RFQs" }}
        />
      ) : (
        <div className="bg-surface-container-lowest rounded-lg overflow-hidden border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-container-low text-[10px] font-bold text-text-muted uppercase tracking-widest">
                <th className="px-6 py-3 text-left">PO #</th>
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-left">Source PR</th>
                <th className="px-6 py-3 text-left">Expected</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pos.map((r) => (
                <tr
                  key={r.id ?? r.number}
                  className="hover:bg-surface-container-low transition-colors"
                >
                  <td className="px-6 py-4">
                    <Link
                      to={`/vendor/purchase-orders/${r.number}`}
                      className="font-bold text-primary hover:underline font-mono"
                    >
                      {r.number}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-text-muted">{r.po_date ?? "—"}</td>
                  <td className="px-6 py-4 text-info text-xs font-mono">
                    {r.pr_number ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-text-muted text-xs">
                    {r.expected_delivery ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-semibold">
                    {fmtINR(r.total)}
                  </td>
                  <td className="px-6 py-4">
                    <StatusPill tone={TONE[r.status] ?? "neutral"}>
                      {r.status}
                    </StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
