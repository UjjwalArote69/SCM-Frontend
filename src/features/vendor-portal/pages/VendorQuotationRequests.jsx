import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Loader2, Inbox, Clock, CheckCircle2 } from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import StatusPill from "../../../components/data/StatusPill.jsx";
import RefreshButton from "../../../components/data/RefreshButton.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import { useRFQStore } from "../../quotations/store.js";
import { useVendorIdentity } from "../useVendorIdentity.js";

const TONE = {
  open: "warning",
  awarded: "success",
  closed: "neutral",
  compared: "info",
};

export default function VendorQuotationRequestsPage() {
  const rfqs = useRFQStore((s) => s.items);
  const loading = useRFQStore((s) => s.loading);
  const fetchAll = useRFQStore((s) => s.fetchAll);
  const { vendorName, loading: identityLoading } = useVendorIdentity();

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const isLoading = loading || identityLoading;

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title="Quotation Requests"
        subtitle={
          vendorName
            ? `RFQs awaiting a quote from ${vendorName}`
            : "Open RFQs awaiting your quote"
        }
        actions={<RefreshButton onRefresh={fetchAll} loading={loading} />}
      />

      {isLoading && rfqs.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-text-muted">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
        </div>
      ) : rfqs.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No open RFQs"
          description="You'll see new quote requests here as soon as a buyer invites you."
        />
      ) : (
        <div className="bg-surface-container-lowest rounded-lg overflow-hidden border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-container-low text-[10px] font-bold text-text-muted uppercase tracking-widest">
                <th className="px-6 py-3 text-left">RFQ #</th>
                <th className="px-6 py-3 text-left">Title</th>
                <th className="px-6 py-3 text-left">Source PR</th>
                <th className="px-6 py-3 text-left">Items</th>
                <th className="px-6 py-3 text-left">Due</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-right w-32">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rfqs.map((r) => {
                const alreadyQuoted =
                  vendorName &&
                  Array.isArray(r.responses) &&
                  r.responses.some((x) => x.vendor === vendorName);
                const itemCount = Array.isArray(r.items) ? r.items.length : 0;
                const isAwarded =
                  r.status === "awarded" && r.awarded_vendor === vendorName;
                const isLost =
                  r.status === "awarded" && r.awarded_vendor !== vendorName;
                return (
                  <tr
                    key={r.id ?? r.number}
                    className="hover:bg-surface-container-low transition-colors"
                  >
                    <td className="px-6 py-4 font-bold text-primary font-mono">
                      {r.number}
                    </td>
                    <td className="px-6 py-4">{r.title}</td>
                    <td className="px-6 py-4 text-info text-xs font-mono">
                      {r.pr_number ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-text-muted text-xs">
                      {itemCount} item{itemCount === 1 ? "" : "s"}
                    </td>
                    <td className="px-6 py-4 text-text-muted text-xs">
                      {r.due_date ?? "—"}
                    </td>
                    <td className="px-6 py-4">
                      {isAwarded ? (
                        <StatusPill tone="success">
                          <CheckCircle2 className="inline h-3 w-3 mr-1" />
                          awarded
                        </StatusPill>
                      ) : isLost ? (
                        <StatusPill tone="neutral">awarded elsewhere</StatusPill>
                      ) : alreadyQuoted ? (
                        <StatusPill tone="info">
                          <Clock className="inline h-3 w-3 mr-1" />
                          quoted
                        </StatusPill>
                      ) : (
                        <StatusPill tone={TONE[r.status] ?? "neutral"}>
                          {r.status}
                        </StatusPill>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {(r.status === "open" || r.status === "compared") ? (
                        <Link
                          to={`/vendor/quotations/submit/${r.number}`}
                          className="text-sm font-bold text-primary hover:underline"
                        >
                          {alreadyQuoted ? "Revise" : "Submit"}
                        </Link>
                      ) : (
                        <Link
                          to={`/vendor/quotations/submit/${r.number}`}
                          className="text-xs text-text-muted hover:text-primary"
                        >
                          View
                        </Link>
                      )}
                    </td>
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
