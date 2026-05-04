import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Loader2, Inbox, Clock, CheckCircle2, XCircle, Truck } from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import StatusPill from "../../../components/data/StatusPill.jsx";
import RefreshButton from "../../../components/data/RefreshButton.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import KpiCard from "../../../components/ui/KpiCard.jsx";
import { usePOStore } from "../../purchase-orders/store.js";

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

      {pos.length > 0 && (
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
      )}

      {loading && pos.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-text-muted">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
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
