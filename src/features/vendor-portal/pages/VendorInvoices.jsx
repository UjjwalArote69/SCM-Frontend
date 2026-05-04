import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Upload, Loader2, CheckCircle2, Clock, Receipt } from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import StatusPill from "../../../components/data/StatusPill.jsx";
import RefreshButton from "../../../components/data/RefreshButton.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import { usePOStore } from "../../purchase-orders/store.js";

/**
 * Vendor-portal invoices view.
 *
 * The Invoices feature has no backend of its own yet, so this page renders
 * invoiceable POs (accepted + fulfilled) from the PO store. Each accepted PO
 * is something the vendor can raise an invoice against.
 */
export default function VendorInvoicesPage() {
  const pos = usePOStore((s) => s.items);
  const loading = usePOStore((s) => s.loading);
  const fetchAll = usePOStore((s) => s.fetchAll);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Backend already scopes POs to the current vendor — we just render what's there.
  const invoiceable = pos.filter(
    (p) => p.status === "accepted" || p.status === "fulfilled",
  );
  const pendingAccept = pos.filter((p) => p.status === "pending");

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title="My Invoices"
        subtitle="Invoice against your accepted purchase orders"
        actions={
          <>
            <RefreshButton onRefresh={fetchAll} loading={loading} />
            <Link
              to="/vendor/invoices/upload"
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary hover:brightness-110 text-primary-foreground text-sm font-bold"
            >
              <Upload className="h-4 w-4" /> Upload Invoice
            </Link>
          </>
        }
      />

      {/* Notice that the full Invoices backend isn't live yet */}
      <div className="mb-4 p-3 bg-info-soft/40 border border-info/20 rounded-md text-xs text-info">
        <strong>Preview:</strong> This page lists the POs eligible for
        invoicing. A dedicated Invoices module (with approval + payment tracking)
        is coming soon — for now, treat each accepted PO as an invoiceable line.
      </div>

      {loading && pos.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-text-muted">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
        </div>
      ) : invoiceable.length === 0 && pendingAccept.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No invoiceable POs"
          description="Accept a PO from the buyer to start raising invoices."
          action={{ to: "/vendor/purchase-orders", label: "Go to my POs" }}
        />
      ) : (
        <>
          {/* Invoiceable (accepted/fulfilled) */}
          {invoiceable.length > 0 && (
            <section className="mb-8">
              <h2 className="text-sm font-bold text-text uppercase tracking-wider mb-3">
                Ready to invoice
              </h2>
              <div className="bg-surface-container-lowest rounded-lg overflow-hidden border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-container-low text-[10px] font-bold text-text-muted uppercase tracking-widest">
                      <th className="px-6 py-3 text-left">PO #</th>
                      <th className="px-6 py-3 text-left">Issued</th>
                      <th className="px-6 py-3 text-left">Expected Delivery</th>
                      <th className="px-6 py-3 text-right">PO Amount</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-right w-32">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invoiceable.map((po) => (
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
                        <td className="px-6 py-4 text-right font-mono font-semibold">
                          ₹
                          {Number(po.total ?? 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <StatusPill
                            tone={po.status === "fulfilled" ? "success" : "info"}
                          >
                            <CheckCircle2 className="inline h-3 w-3 mr-1" />
                            {po.status}
                          </StatusPill>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            to="/vendor/invoices/upload"
                            className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-bold"
                          >
                            <Upload className="h-3 w-3" /> Upload Invoice
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Still pending vendor acceptance */}
          {pendingAccept.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-text uppercase tracking-wider mb-3">
                Awaiting your acceptance
              </h2>
              <div className="bg-surface-container-lowest rounded-lg overflow-hidden border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-container-low text-[10px] font-bold text-text-muted uppercase tracking-widest">
                      <th className="px-6 py-3 text-left">PO #</th>
                      <th className="px-6 py-3 text-left">Issued</th>
                      <th className="px-6 py-3 text-right">Amount</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-right w-32">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pendingAccept.map((po) => (
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
                        <td className="px-6 py-4 text-right font-mono">
                          ₹{Number(po.total ?? 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <StatusPill tone="warning">
                            <Clock className="inline h-3 w-3 mr-1" />
                            pending
                          </StatusPill>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            to={`/vendor/purchase-orders/${po.number}`}
                            className="text-xs text-primary hover:underline font-bold"
                          >
                            Review PO →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
