import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ChevronRight, CheckCircle2, XCircle, Download, FileText, Loader2,
} from "lucide-react";
import { useToast } from "../../../hooks/useToast.jsx";
import { useAuthStore } from "../../auth/store.js";
import invoiceApi from "../api.js";
import { useInvoiceStore } from "../store.js";
import StatusPill from "../../../components/data/StatusPill.jsx";

const APPROVER_ROLES = new Set(["cfo", "accountant", "admin"]);
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

export default function InvoiceApprovalPage() {
  const { id: number } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const updateStatus = useInvoiceStore((s) => s.updateStatus);

  const [inv, setInv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comment, setComment] = useState("");
  const [acting, setActing] = useState(false);

  const canApprove =
    APPROVER_ROLES.has(user?.role) && inv?.status === "pending";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    invoiceApi
      .get(number)
      .then((data) => {
        if (!cancelled) {
          setInv(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.response?.data?.message ?? "Invoice not found");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [number]);

  const handle = async (action) => {
    if (!inv) return;
    setActing(true);
    try {
      await updateStatus(inv.number, action, comment || null);
      toast.success(`Invoice ${action === "approve" ? "approved" : "rejected"}.`);
      setTimeout(() => nav("/app/invoices"), 800);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Action failed");
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1100px] mx-auto py-16 flex items-center justify-center text-text-muted">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading {number}…
      </div>
    );
  }

  if (error || !inv) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <h2 className="text-2xl font-bold text-text mb-2">{error ?? "Invoice not found"}</h2>
        <Link to="/app/invoices" className="text-primary font-bold hover:underline">
          Back to invoices
        </Link>
      </div>
    );
  }

  const items = Array.isArray(inv.items) ? inv.items : [];
  const history = Array.isArray(inv.approval_history) ? inv.approval_history : [];
  const isTerminal = inv.status !== "pending";

  return (
    <div className="max-w-[1100px] mx-auto">
      <nav className="text-sm font-medium text-text-muted mb-2 flex items-center gap-2">
        <Link to="/app/invoices" className="hover:text-primary">
          Invoices
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-text font-mono">{inv.number}</span>
      </nav>

      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-text tracking-tight">
            Invoice Approval
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <StatusPill tone={STATUS_TONE[inv.status] ?? "neutral"}>{inv.status}</StatusPill>
            {inv.po_number && (
              <span className="text-xs text-text-muted">
                PO: <span className="text-info font-mono">{inv.po_number}</span>
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => toast.info("PDF generation coming soon for invoices")}
          className="px-4 py-2 text-sm font-semibold text-text border border-border rounded-md hover:bg-surface-container-low flex items-center gap-2"
        >
          <Download className="h-4 w-4" /> Download PDF
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <section className="bg-surface-container-lowest rounded-md p-6 border border-border">
            <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
              <div>
                <div className="text-sm text-text-muted">From</div>
                <div className="text-lg font-bold text-text">{inv.vendor}</div>
                {inv.vendor_invoice_no && (
                  <div className="text-xs text-text-muted font-mono mt-1">
                    Vendor ref: {inv.vendor_invoice_no}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm text-text-muted font-mono">{inv.number}</div>
                <div className="text-sm text-text-muted">{formatDate(inv.invoice_date ?? inv.created_at)}</div>
                {inv.due_date && (
                  <div className="text-xs text-text-muted mt-1">
                    Due: {formatDate(inv.due_date)}
                  </div>
                )}
              </div>
            </div>

            {items.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-semibold text-text-muted uppercase border-b border-border">
                    <th className="py-2 text-left">Description</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2 text-right">Rate</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((it, i) => (
                    <tr key={i}>
                      <td className="py-3">{it.name ?? it.desc ?? "—"}</td>
                      <td className="py-3 text-right text-text-muted tabular-nums">{it.qty ?? "—"}</td>
                      <td className="py-3 text-right text-text-muted tabular-nums">
                        {it.rate ? formatINR(it.rate) : "—"}
                      </td>
                      <td className="py-3 text-right font-medium tabular-nums">
                        {it.amount ? formatINR(it.amount) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-text-muted italic">No line items recorded.</p>
            )}

            <div className="mt-6 ml-auto w-72 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Subtotal</span>
                <span className="tabular-nums">{formatINR(inv.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Tax (GST)</span>
                <span className="tabular-nums">{formatINR(inv.tax)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border font-bold text-lg text-primary">
                <span>Total</span>
                <span className="tabular-nums">{formatINR(inv.total)}</span>
              </div>
            </div>
          </section>

          {inv.notes && (
            <section className="bg-surface-container-lowest rounded-md p-6 border border-border">
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Notes
              </div>
              <p className="text-sm text-text whitespace-pre-line">{inv.notes}</p>
            </section>
          )}

          {history.length > 0 && (
            <section className="bg-surface-container-lowest rounded-md p-6 border border-border">
              <h3 className="text-sm font-bold text-text uppercase tracking-wider mb-3">
                Approval Trail
              </h3>
              <ul className="space-y-3">
                {history.map((h, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span
                      className={`mt-1 inline-flex items-center justify-center w-6 h-6 rounded-full ${
                        h.action === "approve"
                          ? "bg-success-soft text-success"
                          : "bg-danger-soft text-danger"
                      }`}
                    >
                      {h.action === "approve" ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                    </span>
                    <div className="flex-1">
                      <div className="font-semibold text-text">
                        {h.by_user_name ?? "—"}
                        <span className="text-xs text-text-muted ml-2 uppercase tracking-wider">
                          {h.by_role}
                        </span>
                      </div>
                      <div className="text-xs text-text-muted">
                        {h.action === "approve" ? "Approved" : "Rejected"} ·{" "}
                        {formatDate(h.at)}
                      </div>
                      {h.comment && (
                        <div className="text-sm text-text mt-1 italic">"{h.comment}"</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div>
          <div className="sticky top-6 space-y-4">
            <div className="bg-surface-container-lowest rounded-md p-6 border border-border">
              <h2 className="text-lg font-bold text-text mb-4">Approval</h2>
              {isTerminal ? (
                <div className="text-sm text-text-muted">
                  This invoice is <span className="font-bold capitalize">{inv.status}</span> and
                  cannot be acted on further.
                </div>
              ) : !APPROVER_ROLES.has(user?.role) ? (
                <div className="text-sm text-text-muted">
                  Only the CFO, accountant, or admin can approve invoices.
                </div>
              ) : (
                <>
                  <label className="block text-xs font-semibold text-text-muted mb-2 uppercase">
                    Comments
                  </label>
                  <textarea
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Optional note for vendor / finance team"
                    className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant focus:border-primary px-3 py-2 text-sm outline-none resize-none mb-4"
                  />
                  <div className="space-y-2">
                    <button
                      onClick={() => handle("approve")}
                      disabled={!canApprove || acting}
                      className="w-full bg-success text-white px-4 py-2.5 rounded-md font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Approve & Send for Payment
                    </button>
                    <button
                      onClick={() => handle("reject")}
                      disabled={!canApprove || acting}
                      className="w-full bg-transparent border border-danger text-danger px-4 py-2.5 rounded-md font-bold text-sm flex items-center justify-center gap-2 hover:bg-danger-soft disabled:opacity-60"
                    >
                      {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                      Reject
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
