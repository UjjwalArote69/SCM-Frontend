import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Upload, Receipt, Clock, CheckCircle2, Wallet, XCircle, TrendingUp,
} from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import StatusPill from "../../../components/data/StatusPill.jsx";
import KpiStatCard from "../../../components/data/KpiStatCard.jsx";
import RefreshButton from "../../../components/data/RefreshButton.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import Skeleton from "../../../components/feedback/Skeleton.jsx";
import { useState } from "react";
import { usePOStore } from "../../purchase-orders/store.js";
import { useInvoiceStore } from "../../finance/store.js";

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

function SkRow() {
  return (
    <tr>
      <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
      <td className="px-6 py-4"><Skeleton className="h-3 w-20" /></td>
      <td className="px-6 py-4"><Skeleton className="h-3 w-20" /></td>
      <td className="px-6 py-4 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
    </tr>
  );
}

/**
 * Vendor invoice view.
 *   Top: real invoices the vendor has raised (server-scoped to current vendor).
 *   Bottom: invoiceable POs (accepted/fulfilled) with no invoice yet —
 *           a CTA strip linking to the upload page.
 */
export default function VendorInvoicesPage() {
  const invoices = useInvoiceStore((s) => s.items);
  const invLoading = useInvoiceStore((s) => s.loading);
  const fetchInvoices = useInvoiceStore((s) => s.fetchAll);

  const pos = usePOStore((s) => s.items);
  const poLoading = usePOStore((s) => s.loading);
  const fetchPOs = usePOStore((s) => s.fetchAll);

  const [statusFilter, setStatusFilter] = useState("all");
  const toggleStatus = (s) => setStatusFilter((p) => (p === s ? "all" : s));

  useEffect(() => {
    fetchInvoices();
    fetchPOs();
  }, [fetchInvoices, fetchPOs]);

  const refresh = () => {
    fetchInvoices();
    fetchPOs();
  };

  // Counts come from full unfiltered list.
  const counts = useMemo(() => {
    const c = { total: invoices.length, pending: 0, approved: 0, paid: 0, rejected: 0 };
    for (const r of invoices) {
      if (c[r.status] !== undefined) c[r.status] += 1;
    }
    return c;
  }, [invoices]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return invoices;
    return invoices.filter((i) => i.status === statusFilter);
  }, [invoices, statusFilter]);

  // Invoiceable POs that DON'T already have an invoice raised against them.
  const invoicedPoNumbers = useMemo(
    () => new Set(invoices.map((i) => i.po_number).filter(Boolean)),
    [invoices],
  );
  const invoiceablePOs = useMemo(
    () =>
      pos.filter(
        (p) =>
          (p.status === "accepted" || p.status === "fulfilled") &&
          !invoicedPoNumbers.has(p.number),
      ),
    [pos, invoicedPoNumbers],
  );

  const initialLoading = invLoading && invoices.length === 0;

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 sm:space-y-6">
      <PageHeader
        title="My Invoices"
        subtitle="Invoices raised against your accepted purchase orders"
        actions={
          <>
            <RefreshButton onRefresh={refresh} loading={invLoading || poLoading} />
            <Link
              to="/vendor/invoices/upload"
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary hover:brightness-110 text-primary-foreground text-sm font-bold"
            >
              <Upload className="h-4 w-4" /> Upload Invoice
            </Link>
          </>
        }
      />

      {/* KPI strip — same active treatment as the rest of the app */}
      <div className="-mx-4 sm:mx-0">
        <div className="flex sm:grid sm:grid-cols-5 gap-3 sm:gap-4 px-4 sm:px-0 overflow-x-auto sm:overflow-visible snap-x snap-mandatory pb-1 sm:pb-0">
          <KpiStatCard label="Total" value={counts.total} icon={TrendingUp} tone="neutral"
            active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
          <KpiStatCard label="Pending" value={counts.pending} icon={Clock} tone="warning"
            active={statusFilter === "pending"} onClick={() => toggleStatus("pending")} />
          <KpiStatCard label="Approved" value={counts.approved} icon={CheckCircle2} tone="success"
            active={statusFilter === "approved"} onClick={() => toggleStatus("approved")} />
          <KpiStatCard label="Paid" value={counts.paid} icon={Wallet} tone="info"
            active={statusFilter === "paid"} onClick={() => toggleStatus("paid")} />
          <KpiStatCard label="Rejected" value={counts.rejected} icon={XCircle} tone="danger"
            active={statusFilter === "rejected"} onClick={() => toggleStatus("rejected")} />
        </div>
      </div>

      {/* Raised invoices */}
      <section>
        <h2 className="text-sm font-bold text-text uppercase tracking-wider mb-3">
          Invoices Raised
        </h2>

        {initialLoading ? (
          <div className="bg-surface-container-lowest rounded-lg overflow-hidden border border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[680px]">
                <thead>
                  <tr className="bg-surface-container-low text-[10px] font-bold text-text-muted uppercase tracking-widest">
                    <th className="px-6 py-3 text-left">Invoice #</th>
                    <th className="px-6 py-3 text-left">PO</th>
                    <th className="px-6 py-3 text-left">Date</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                    <th className="px-6 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {Array.from({ length: 4 }).map((_, i) => <SkRow key={i} />)}
                </tbody>
              </table>
            </div>
          </div>
        ) : filtered.length === 0 && invoices.length > 0 ? (
          <div className="text-center py-10 text-text-muted text-sm border border-border rounded-lg bg-surface-container-lowest">
            No invoices match the <span className="font-bold text-text">{statusFilter}</span> filter.
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No invoices yet"
            description="Once you upload an invoice against an accepted PO, it'll show here while finance reviews it."
            action={
              invoiceablePOs.length > 0
                ? { to: "/vendor/invoices/upload", label: "Upload your first invoice" }
                : { to: "/vendor/purchase-orders", label: "Go to my POs" }
            }
          />
        ) : (
          <div className="bg-surface-container-lowest rounded-lg overflow-hidden border border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[680px]">
                <thead>
                  <tr className="bg-surface-container-low text-[10px] font-bold text-text-muted uppercase tracking-widest">
                    <th className="px-6 py-3 text-left">Invoice #</th>
                    <th className="px-6 py-3 text-left">PO</th>
                    <th className="px-6 py-3 text-left">Date</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                    <th className="px-6 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((r) => (
                    <tr key={r.number} className="hover:bg-surface-container-low">
                      <td className="px-6 py-4 font-mono font-bold text-primary">
                        {r.number}
                      </td>
                      <td className="px-6 py-4 font-mono text-info">
                        {r.po_number ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-text-muted text-xs">
                        {r.invoice_date ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-semibold tabular-nums">
                        {formatINR(r.total)}
                      </td>
                      <td className="px-6 py-4">
                        <StatusPill tone={STATUS_TONE[r.status] ?? "neutral"}>
                          {r.status}
                        </StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Invoiceable POs — POs accepted but not yet invoiced */}
      {invoiceablePOs.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-text uppercase tracking-wider mb-3">
            Ready to invoice <span className="text-text-subtle font-normal">— {invoiceablePOs.length} {invoiceablePOs.length === 1 ? "PO" : "POs"} eligible</span>
          </h2>
          <div className="bg-surface-container-lowest rounded-lg overflow-hidden border border-border">
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[820px]">
              <thead>
                <tr className="bg-surface-container-low text-[10px] font-bold text-text-muted uppercase tracking-widest">
                  <th className="px-6 py-3 text-left">PO #</th>
                  <th className="px-6 py-3 text-left">Issued</th>
                  <th className="px-6 py-3 text-left">Expected Delivery</th>
                  <th className="px-6 py-3 text-right">PO Amount</th>
                  <th className="px-6 py-3 text-left">PO Status</th>
                  <th className="px-6 py-3 text-right w-32">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoiceablePOs.map((po) => (
                  <tr key={po.number} className="hover:bg-surface-container-low">
                    <td className="px-6 py-4">
                      <Link
                        to={`/vendor/purchase-orders/${po.number}`}
                        className="font-bold text-primary hover:underline font-mono"
                      >
                        {po.number}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-text-muted text-xs">
                      {po.po_date ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-text-muted text-xs">
                      {po.expected_delivery ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-semibold tabular-nums">
                      {formatINR(po.total)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusPill tone={po.status === "fulfilled" ? "success" : "info"}>
                        {po.status}
                      </StatusPill>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/vendor/invoices/upload?po=${po.number}`}
                        className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-bold"
                      >
                        <Upload className="h-3 w-3" /> Invoice this PO
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
