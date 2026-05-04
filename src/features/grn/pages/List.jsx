import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Truck, Undo2, Warehouse } from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import StatusPill from "../../../components/data/StatusPill.jsx";
import { useGRNStore } from "../store.js";
import RefreshButton from "../../../components/data/RefreshButton.jsx";
import Skeleton from "../../../components/feedback/Skeleton.jsx";

const TONE = { full: "success", partial: "warning" };

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

export default function GRNListPage() {
  const rows = useGRNStore((s) => s.items);
  const loading = useGRNStore((s) => s.loading);
  const fetchAll = useGRNStore((s) => s.fetchAll);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <div className="max-w-[1200px] mx-auto">
      <PageHeader
        title="Goods Receipt Notes"
        subtitle="Log incoming shipments against purchase orders"
        actions={
          <>
            <RefreshButton onRefresh={fetchAll} loading={loading} />
            <Link to="/app/grn/stock-receive" className="flex items-center gap-2 px-4 py-2 rounded-md border border-border text-text text-sm font-semibold hover:bg-surface-container-low">
              <Warehouse className="h-4 w-4" /> Stock Receive
            </Link>
            <Link to="/app/grn/delivery-challan" className="flex items-center gap-2 px-4 py-2 rounded-md border border-border text-text text-sm font-semibold hover:bg-surface-container-low">
              <Truck className="h-4 w-4" /> Delivery Challan
            </Link>
            <Link to="/app/grn/purchase-return" className="flex items-center gap-2 px-4 py-2 rounded-md border border-border text-text text-sm font-semibold hover:bg-surface-container-low">
              <Undo2 className="h-4 w-4" /> Return
            </Link>
            <Link to="/app/grn/new" className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary hover:brightness-110 text-primary-foreground text-sm font-bold">
              <Plus className="h-4 w-4" /> Create GRN
            </Link>
          </>
        }
      />

      {loading && rows.length === 0 ? (
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
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          No GRNs yet —{" "}
          <Link to="/app/grn/new" className="text-primary font-bold hover:underline">log one now</Link>
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
              {rows.map((r) => {
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
