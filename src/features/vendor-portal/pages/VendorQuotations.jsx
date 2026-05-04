import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Edit3, Award, Clock, XCircle, Send } from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import StatusPill from "../../../components/data/StatusPill.jsx";
import RefreshButton from "../../../components/data/RefreshButton.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import Skeleton from "../../../components/feedback/Skeleton.jsx";
import { useRFQStore } from "../../quotations/store.js";
import { useVendorIdentity } from "../useVendorIdentity.js";

function SkRow() {
  return (
    <tr>
      <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
      <td className="px-6 py-4"><Skeleton className="h-4 w-44" /></td>
      <td className="px-6 py-4 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
      <td className="px-6 py-4"><Skeleton className="h-3 w-16" /></td>
      <td className="px-6 py-4"><Skeleton className="h-3 w-16" /></td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
      <td className="px-6 py-4 text-right"><Skeleton className="h-3 w-12 ml-auto" /></td>
    </tr>
  );
}

function computeTotal(response, items) {
  if (!response || !Array.isArray(items)) return 0;
  const prices = response.prices ?? [];
  const gsts = response.gst ?? [];
  let sum = 0;
  items.forEach((it, i) => {
    const qty = Number(it.qty ?? 0);
    const rate = Number(prices[i]) || 0;
    const gstPct = Number(gsts[i]) || 0;
    const taxable = qty * rate;
    sum += taxable + (taxable * gstPct) / 100;
  });
  return sum + Number(response.shipping ?? 0);
}

function statusForVendor(rfq, isAwarded, isInvited, hasSubmitted) {
  // What does this RFQ mean to THIS vendor?
  if (isAwarded) return { text: "awarded", tone: "success", Icon: Award };
  if (rfq.status === "awarded" && !isAwarded) return { text: "lost", tone: "danger", Icon: XCircle };
  if (rfq.status === "closed") return { text: "closed", tone: "neutral", Icon: XCircle };
  if (!isInvited) return { text: "not invited", tone: "neutral", Icon: XCircle };
  if (hasSubmitted) return { text: "under review", tone: "warning", Icon: Clock };
  return { text: "action needed", tone: "info", Icon: Send };
}

export default function VendorQuotationsPage() {
  const rfqs = useRFQStore((s) => s.items);
  const loading = useRFQStore((s) => s.loading);
  const fetchAll = useRFQStore((s) => s.fetchAll);
  const { vendorName, loading: identityLoading } = useVendorIdentity();

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Backend scopes /rfqs to vendors the current user is invited to.
  // We resolve "my response" / "awarded to me" by matching vendor_name
  // (the business name on the AppVendor row), not user.name.
  const rows = rfqs.map((r) => {
    const myResponse =
      vendorName &&
      (r.responses ?? []).find((resp) => resp.vendor === vendorName);
    const isInvited =
      vendorName && Array.isArray(r.vendors) && r.vendors.includes(vendorName);
    const isAwarded =
      r.status === "awarded" && vendorName && r.awarded_vendor === vendorName;
    const total = computeTotal(myResponse, r.items);
    return {
      rfq: r,
      myResponse,
      isInvited,
      hasSubmitted: Boolean(myResponse),
      isAwarded,
      total,
      submittedAt: myResponse?.submitted_at,
    };
  });

  const isLoading = loading || identityLoading;

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title="My Quotations"
        subtitle="Quotes you've submitted and RFQs inviting you to bid"
        actions={<RefreshButton onRefresh={fetchAll} loading={loading} />}
      />

      {isLoading && rows.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-lg overflow-hidden border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-container-low text-[10px] font-bold text-text-muted uppercase tracking-widest">
                <th className="px-6 py-3 text-left">RFQ #</th>
                <th className="px-6 py-3 text-left">Title</th>
                <th className="px-6 py-3 text-right">Your Quote</th>
                <th className="px-6 py-3 text-left">Submitted</th>
                <th className="px-6 py-3 text-left">Due</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-right w-28">Action</th>
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
        <EmptyState
          icon={Clock}
          title="No quotation requests"
          description="You'll see RFQs here once a buyer invites your vendor account."
        />
      ) : (
        <div className="bg-surface-container-lowest rounded-lg overflow-hidden border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-container-low text-[10px] font-bold text-text-muted uppercase tracking-widest">
                <th className="px-6 py-3 text-left">RFQ #</th>
                <th className="px-6 py-3 text-left">Title</th>
                <th className="px-6 py-3 text-right">Your Quote</th>
                <th className="px-6 py-3 text-left">Submitted</th>
                <th className="px-6 py-3 text-left">Due</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-right w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => {
                const s = statusForVendor(row.rfq, row.isAwarded, row.isInvited, row.hasSubmitted);
                return (
                  <tr key={row.rfq.number} className="hover:bg-surface-container-low">
                    <td className="px-6 py-4">
                      <Link
                        to={`/vendor/quotations/submit/${row.rfq.number}`}
                        className="font-bold text-primary hover:underline font-mono"
                      >
                        {row.rfq.number}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-text">{row.rfq.title}</td>
                    <td className="px-6 py-4 text-right font-mono">
                      {row.hasSubmitted ? (
                        <span className="font-semibold text-text">
                          ₹
                          {row.total.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      ) : (
                        <span className="text-text-subtle text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-text-muted text-xs">
                      {row.submittedAt
                        ? new Date(row.submittedAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-text-muted text-xs">
                      {row.rfq.due_date ?? "—"}
                    </td>
                    <td className="px-6 py-4">
                      <StatusPill tone={s.tone}>
                        <s.Icon className="inline h-3 w-3 mr-1" />
                        {s.text}
                      </StatusPill>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {row.rfq.status === "open" || row.rfq.status === "compared" ? (
                        <Link
                          to={`/vendor/quotations/submit/${row.rfq.number}`}
                          className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-bold"
                        >
                          <Edit3 className="h-3 w-3" />
                          {row.hasSubmitted ? "Revise" : "Submit"}
                        </Link>
                      ) : (
                        <Link
                          to={`/vendor/quotations/submit/${row.rfq.number}`}
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

      {rows.length > 0 && (
        <div className="text-xs text-text-muted mt-3">
          Showing <strong>{rows.length}</strong> quotation{rows.length === 1 ? "" : "s"}
        </div>
      )}
    </div>
  );
}
