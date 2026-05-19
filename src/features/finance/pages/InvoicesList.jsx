import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Upload, Download, Loader2,
  TrendingUp, Clock, CheckCircle2, Wallet, XCircle,
} from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import StatusPill from "../../../components/data/StatusPill.jsx";
import KpiStatCard from "../../../components/data/KpiStatCard.jsx";
import RefreshButton from "../../../components/data/RefreshButton.jsx";
import { useToast } from "../../../hooks/useToast.jsx";
import { useInvoiceStore } from "../store.js";

const STATUS_TONE = {
  pending: "warning",
  approved: "success",
  paid: "success",
  rejected: "danger",
};

function formatINR(n) {
  const v = Number(n) || 0;
  return `₹ ${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function InvoicesListPage() {
  const toast = useToast();
  const items = useInvoiceStore((s) => s.items);
  const loading = useInvoiceStore((s) => s.loading);
  const fetchAll = useInvoiceStore((s) => s.fetchAll);

  const [status, setStatus] = useState("all");
  const toggleStatus = (s) => setStatus((prev) => (prev === s ? "all" : s));

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const counts = useMemo(() => {
    const c = { total: items.length, pending: 0, approved: 0, paid: 0, rejected: 0 };
    for (const r of items) {
      if (c[r.status] !== undefined) c[r.status] += 1;
    }
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    if (status === "all") return items;
    return items.filter((r) => r.status === status);
  }, [items, status]);

  const initialLoading = loading && items.length === 0;

  return (
    <div className="max-w-[1200px] mx-auto space-y-4 sm:space-y-6">
      <PageHeader
        title="Invoices & Payments"
        subtitle="Approve invoices and process payments to vendors"
        actions={
          <>
            <RefreshButton onRefresh={fetchAll} loading={loading} />
            <button
              onClick={() => toast.success(`Exported ${filtered.length} invoices to CSV`)}
              className="flex items-center gap-2 px-4 py-2 rounded-md border border-border text-text text-sm font-semibold hover:bg-surface-container-low"
            >
              <Download className="h-4 w-4" /> Export
            </button>
            <Link
              to="/vendor/invoices/upload"
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary hover:brightness-110 text-primary-foreground text-sm font-bold"
            >
              <Upload className="h-4 w-4" /> Upload Invoice
            </Link>
          </>
        }
      />

      {/* KPI strip — same active treatment as PR/PO/RFQ/GRN */}
      <div className="-mx-4 sm:mx-0">
        <div className="flex sm:grid sm:grid-cols-5 gap-3 sm:gap-4 px-4 sm:px-0 overflow-x-auto sm:overflow-visible snap-x snap-mandatory pb-1 sm:pb-0">
          <KpiStatCard label="Total" value={counts.total} icon={TrendingUp} tone="neutral"
            active={status === "all"} onClick={() => setStatus("all")} />
          <KpiStatCard label="Pending" value={counts.pending} icon={Clock} tone="warning"
            active={status === "pending"} onClick={() => toggleStatus("pending")} />
          <KpiStatCard label="Approved" value={counts.approved} icon={CheckCircle2} tone="success"
            active={status === "approved"} onClick={() => toggleStatus("approved")} />
          <KpiStatCard label="Paid" value={counts.paid} icon={Wallet} tone="info"
            active={status === "paid"} onClick={() => toggleStatus("paid")} />
          <KpiStatCard label="Rejected" value={counts.rejected} icon={XCircle} tone="danger"
            active={status === "rejected"} onClick={() => toggleStatus("rejected")} />
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-lg overflow-hidden border border-border">
        {initialLoading ? (
          <div className="p-12 text-center text-text-muted flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading invoices…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-text-muted">
            {items.length === 0
              ? "No invoices yet."
              : "No invoices match the current filter."}
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="bg-surface-container-low text-xs font-semibold text-text-muted uppercase">
                <th className="px-6 py-3 text-left">Invoice #</th>
                <th className="px-6 py-3 text-left">PO</th>
                <th className="px-6 py-3 text-left">Vendor</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => (
                <tr key={r.number} className="hover:bg-surface-container-low">
                  <td className="px-6 py-4 font-semibold text-primary font-mono">
                    {r.number}
                  </td>
                  <td className="px-6 py-4 text-info font-mono">{r.po_number ?? "—"}</td>
                  <td className="px-6 py-4">{r.vendor}</td>
                  <td className="px-6 py-4 text-right font-medium tabular-nums">
                    {formatINR(r.total)}
                  </td>
                  <td className="px-6 py-4 text-text-muted">{formatDate(r.invoice_date ?? r.created_at)}</td>
                  <td className="px-6 py-4">
                    <StatusPill tone={STATUS_TONE[r.status] ?? "neutral"}>
                      {r.status}
                    </StatusPill>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {r.status === "pending" ? (
                      <Link
                        to={`/app/invoices/${r.number}/approve`}
                        className="text-sm font-bold text-primary hover:underline"
                      >
                        Approve
                      </Link>
                    ) : (
                      <Link
                        to={`/app/invoices/${r.number}/approve`}
                        className="text-sm text-text-muted hover:text-text"
                      >
                        View
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
