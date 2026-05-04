import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ChevronRight,
  Printer,
  Download,
  Mail,
  CheckCircle2,
  Clock,
  Truck,
  Building2,
  Loader2,
  XCircle,
  Trash2,
  AlertCircle,
  GitBranch,
} from "lucide-react";
import AcceptPOModal from "../components/AcceptPOModal.jsx";
import StatusPill from "../../../components/data/StatusPill.jsx";
import ChainStatusModal from "../../../components/feedback/ChainStatusModal.jsx";
import PoDocumentsCard from "../../po-documents/components/PoDocumentsCard.jsx";
import VendorFeedbackCard from "../../vendor-feedback/components/VendorFeedbackCard.jsx";
import VendorRatingCard from "../../vendor-rating/components/VendorRatingCard.jsx";
import PrintLetterhead from "../../../components/print/PrintLetterhead.jsx";
import PrintFooter from "../../../components/print/PrintFooter.jsx";
import { usePOStore } from "../store.js";
import { useGRNStore } from "../../grn/store.js";
import { useToast } from "../../../hooks/useToast.jsx";
import { useAuthStore } from "../../auth/store.js";
import poApi from "../api.js";

// FLOW.md item 8 — PO chain stages, in order. respective_hod is dynamic
// (only present if the source RFQ resolved a respective department).
const CHAIN_STAGES = [
  { key: "purchase_hod", label: "Purchase HOD", role: "hod", deptCode: "PURCH" },
  { key: "finance_hod", label: "Finance HOD", role: "hod", deptCode: "FIN" },
  { key: "respective_hod", label: "Respective Dept HOD", role: "hod" },
  { key: "cfo", label: "CFO", role: "cfo" },
  { key: "ceo", label: "CEO", role: "ceo" },
];

function userActsOnStage(user, stage, respectiveDeptCode) {
  if (!user || !stage) return false;
  if (user.role === "admin") return true;
  if (stage === "purchase_hod") {
    return user.role === "hod" && user.department?.code === "PURCH";
  }
  if (stage === "finance_hod") {
    return user.role === "hod" && user.department?.code === "FIN";
  }
  if (stage === "respective_hod") {
    return (
      user.role === "hod" &&
      respectiveDeptCode &&
      user.department?.code === respectiveDeptCode
    );
  }
  if (stage === "cfo") return user.role === "cfo";
  if (stage === "ceo") return user.role === "ceo";
  return false;
}

// Mirrors PoController BACKOFFICE_ROLES on the backend
const BACKOFFICE_ROLES = new Set([
  "admin",
  "purchase_officer",
  "manager",
  "hod",
  "cfo",
  "ceo",
]);

function currency(n) {
  return `₹${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function display(v) {
  return v === null || v === undefined || v === "" ? "—" : v;
}

function Meta({ label, value }) {
  return (
    <div>
      <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-base font-medium text-text">{display(value)}</div>
    </div>
  );
}

const TONE = {
  pending: "warning",
  accepted: "success",
  rejected: "danger",
  fulfilled: "success",
};

/**
 * Procure-to-pay tracker for a single PO. Reflects real backend state
 * (PO status, GRN aggregate). Invoice + Payment are still TBD on the
 * backend so we mark them as "Coming soon" rather than fake-completed.
 */
function FulfilmentTracker({ po, grns, isVendorView }) {
  const poGrns = (grns ?? []).filter((g) => g.po_number === po.number);
  const totalReceived = poGrns.reduce((sum, g) => {
    return (
      sum +
      (g.items ?? []).reduce((s, it) => s + (Number(it.received) || 0), 0)
    );
  }, 0);
  const totalOrdered = (po.items ?? []).reduce(
    (s, it) => s + (Number(it.qty) || 0),
    0,
  );
  const grnDone = totalOrdered > 0 && totalReceived >= totalOrdered;
  const grnPartial = totalReceived > 0 && !grnDone;
  const isAccepted = po.status === "accepted" || po.status === "fulfilled";
  const isRejected = po.status === "rejected";

  const steps = [
    {
      label: "PO issued",
      sublabel: po.po_date ?? null,
      state: "done",
    },
    {
      label: isRejected ? "Vendor rejected" : "Vendor acceptance",
      sublabel: isAccepted
        ? `Accepted by ${po.vendor}`
        : isRejected
          ? "PO will not proceed"
          : `Awaiting ${po.vendor}`,
      state: isAccepted ? "done" : isRejected ? "rejected" : "active",
    },
    {
      label: "Goods received",
      sublabel: grnDone
        ? `Fully received (${poGrns.length} GRN${poGrns.length === 1 ? "" : "s"})`
        : grnPartial
          ? `Partial — ${totalReceived} of ${totalOrdered}`
          : isAccepted
            ? "Pending delivery"
            : "Awaits acceptance",
      state: grnDone
        ? "done"
        : grnPartial
          ? "partial"
          : isAccepted
            ? "active"
            : "waiting",
    },
    {
      label: "Invoiced",
      sublabel: "Coming soon",
      state: "waiting",
      muted: true,
    },
    {
      label: "Paid",
      sublabel: "Coming soon",
      state: "waiting",
      muted: true,
    },
  ];

  return (
    <section className="bg-surface-container-lowest rounded-md p-6 border border-border print:hidden">
      <h2 className="text-sm font-bold text-text uppercase tracking-wider mb-5 flex items-center gap-2">
        <Truck className="h-4 w-4 text-text-muted" /> Procure-to-pay
      </h2>
      <ol>
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          const nodeCls =
            step.state === "done"
              ? "bg-success text-white"
              : step.state === "rejected"
                ? "bg-danger text-white"
                : step.state === "partial"
                  ? "bg-warning text-white"
                  : step.state === "active"
                    ? "bg-warning text-white ring-4 ring-warning-soft"
                    : "bg-surface-container border border-border text-text-subtle";
          const NodeIcon =
            step.state === "done"
              ? CheckCircle2
              : step.state === "rejected"
                ? XCircle
                : Clock;
          const connectorCls =
            step.state === "done"
              ? "bg-success"
              : step.state === "rejected"
                ? "bg-danger"
                : step.state === "partial"
                  ? "bg-warning"
                  : "bg-border";
          return (
            <li key={step.label} className="flex gap-3">
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${nodeCls}`}
                >
                  <NodeIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
                </div>
                {!isLast && (
                  <div
                    className={`w-[2px] flex-1 my-1 rounded-full ${connectorCls}`}
                    aria-hidden
                  />
                )}
              </div>
              <div className={`flex-1 min-w-0 ${isLast ? "" : "pb-4"} pt-0.5`}>
                <div
                  className={`text-sm font-semibold ${step.muted ? "text-text-muted" : "text-text"}`}
                >
                  {step.label}
                </div>
                {step.sublabel && (
                  <div className="text-xs text-text-subtle mt-0.5">
                    {step.sublabel}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {isVendorView && grnPartial && (
        <p className="mt-4 pt-4 border-t border-border text-xs text-text-muted">
          {totalOrdered - totalReceived} unit
          {totalOrdered - totalReceived === 1 ? "" : "s"} still to deliver.
        </p>
      )}
    </section>
  );
}

export default function PurchaseOrderDetailPage({ view = "admin" }) {
  const { id: number } = useParams();
  const inStore = usePOStore((s) => s.items.find((x) => x.number === number));
  const accept = usePOStore((s) => s.accept);
  const reject = usePOStore((s) => s.reject);
  const remove = usePOStore((s) => s.remove);
  const updateChainStatus = usePOStore((s) => s.updateStatus);
  const user = useAuthStore((s) => s.user);
  const grns = useGRNStore((s) => s.items);
  const fetchGRNs = useGRNStore((s) => s.fetchAll);

  const [fetched, setFetched] = useState(null);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [modal, setModal] = useState(false);
  const [chainModalOpen, setChainModalOpen] = useState(false);
  const [acting, setActing] = useState(false);
  const toast = useToast();

  const po = inStore ?? fetched;
  const loading = !po && !fetchFailed;

  useEffect(() => {
    if (inStore) return;
    let cancelled = false;
    poApi
      .get(number)
      .then((data) => {
        if (!cancelled) setFetched(data);
      })
      .catch(() => {
        if (!cancelled) setFetchFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [number, inStore]);

  useEffect(() => {
    fetchGRNs();
  }, [fetchGRNs]);

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto flex items-center justify-center py-24 text-text-muted">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading {number}…
      </div>
    );
  }
  if (!po) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <h2 className="text-2xl font-bold text-text mb-2">PO not found</h2>
        <Link
          to={view === "vendor" ? "/vendor/purchase-orders" : "/app/purchase-orders"}
          className="text-primary font-bold hover:underline"
        >
          Back to list
        </Link>
      </div>
    );
  }

  const items = Array.isArray(po.items) ? po.items : [];
  const isTerminal =
    po.status === "accepted" || po.status === "rejected" || po.status === "fulfilled";
  const isVendorView = view === "vendor";
  const isAdmin = user?.role === "admin";
  const isBackoffice = BACKOFFICE_ROLES.has(user?.role);

  // FLOW.md item 8 — internal approval chain state
  const chainStage = po.chain_stage ?? "done"; // legacy POs default to done
  const chainDone = chainStage === "done";
  const canActOnChain =
    !chainDone &&
    !isTerminal &&
    userActsOnStage(user, chainStage, po.respective_dept_code);
  const visibleChainSteps = CHAIN_STAGES.filter(
    (s) => s.key !== "respective_hod" || po.respective_dept_code,
  );
  const stageIndex = visibleChainSteps.findIndex((s) => s.key === chainStage);
  const currentStage = visibleChainSteps[stageIndex];

  const onChainSubmit = async ({ action, comments }) => {
    setActing(true);
    try {
      const updated = await updateChainStatus(po.number, { action, comments });
      setFetched(updated);
      setChainModalOpen(false);
      toast.success(`PO ${action === "approve" ? "approved" : action === "reject" ? "rejected" : "held"}.`);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Could not update status");
    } finally {
      setActing(false);
    }
  };

  const doAccept = async () => {
    setActing(true);
    try {
      const updated = await accept(po.number);
      setFetched(updated);
      setModal(false);
      toast.success(`${po.number} accepted — buyer has been notified`);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Could not accept PO");
    } finally {
      setActing(false);
    }
  };

  const doReject = async () => {
    if (!window.confirm(`Reject ${po.number}?`)) return;
    setActing(true);
    try {
      const updated = await reject(po.number);
      setFetched(updated);
      toast.success(`${po.number} rejected`);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Could not reject PO");
    } finally {
      setActing(false);
    }
  };

  const doDelete = async () => {
    if (!window.confirm(`Permanently delete ${po.number}?`)) return;
    setActing(true);
    try {
      await remove(po.number);
      toast.success(`${po.number} deleted`);
      window.history.back();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Could not delete");
      setActing(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <PrintLetterhead
        docType="Purchase Order"
        docNumber={po.number}
        subtitle={po.vendor ? `Vendor: ${po.vendor}` : null}
      />

      <nav className="text-sm font-medium text-text-muted mb-2 flex items-center gap-2 print:hidden">
        <Link
          to={isVendorView ? "/vendor/purchase-orders" : "/app/purchase-orders"}
          className="hover:text-primary"
        >
          Purchase Orders
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-text">{po.number}</span>
      </nav>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-text tracking-tight flex items-center gap-3 flex-wrap">
            {po.number}
            <StatusPill tone={TONE[po.status] ?? "neutral"}>
              {po.status}
            </StatusPill>
          </h1>
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-sm text-text-muted">
            <span>
              <strong className="text-text">Vendor:</strong> {display(po.vendor)}
            </span>
            {po.po_date && (
              <span>
                <strong className="text-text">Issued:</strong> {po.po_date}
              </span>
            )}
            {po.expected_delivery && (
              <span>
                <strong className="text-text">Expected:</strong>{" "}
                {po.expected_delivery}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 text-xs font-semibold text-text-muted border border-border rounded-md hover:bg-surface-container-low hover:text-text flex items-center gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
          <button
            type="button"
            onClick={() => {
              toast.info("Use 'Save as PDF' in the print dialog.");
              setTimeout(() => window.print(), 150);
            }}
            className="px-3 py-1.5 text-xs font-semibold text-text-muted border border-border rounded-md hover:bg-surface-container-low hover:text-text flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" /> PDF
          </button>
          {isBackoffice && (
            <button
              type="button"
              onClick={() => {
                const subject = `Purchase Order ${po.number}`;
                const body = encodeURIComponent(
                  `Please find PO ${po.number} for your review.\n\nOpen in SCM: ${window.location.href}`,
                );
                window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${body}`;
              }}
              className="px-3 py-1.5 text-xs font-semibold text-text-muted border border-border rounded-md hover:bg-surface-container-low hover:text-text flex items-center gap-1.5"
            >
              <Mail className="h-3.5 w-3.5" /> Email
            </button>
          )}

          {/* Internal approval chain — Update Status for the role at this stage */}
          {canActOnChain && (
            <button
              type="button"
              onClick={() => setChainModalOpen(true)}
              disabled={acting}
              className="px-5 py-2 text-sm font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-md disabled:opacity-60"
            >
              Update Status
            </button>
          )}

          {/* Accept/Reject — vendor view only, while pending AND chain done */}
          {isVendorView && po.status === "pending" && (
            <>
              <button
                type="button"
                onClick={doReject}
                disabled={acting || !chainDone}
                title={!chainDone ? "Awaiting buyer approval" : undefined}
                className="px-4 py-2 text-sm font-semibold text-danger border border-danger/30 bg-danger-soft/40 rounded-md hover:bg-danger-soft disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <XCircle className="h-4 w-4" /> Reject
              </button>
              <button
                type="button"
                onClick={() => setModal(true)}
                disabled={acting || !chainDone}
                title={!chainDone ? "Awaiting buyer approval" : undefined}
                className="px-5 py-2 text-sm font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Accept PO
              </button>
            </>
          )}

          {/* Admin delete — always available */}
          {isAdmin && !isVendorView && (
            <button
              type="button"
              onClick={doDelete}
              disabled={acting}
              className="px-3 py-1.5 text-xs font-semibold text-danger border border-danger/30 bg-danger-soft/40 rounded-md hover:bg-danger-soft disabled:opacity-60 flex items-center gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Internal-chain banner — only for in-org users. Vendors get a
          neutral "awaiting buyer approval" notice (see below) so they
          don't see internal stage / role detail. */}
      {!chainDone && po.status === "pending" && !isVendorView && (
        <div className="bg-info-soft border border-info/30 rounded-lg px-4 py-3 mb-6 flex flex-col sm:flex-row sm:items-center gap-3 print:hidden">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <GitBranch className="h-5 w-5 text-info shrink-0 mt-0.5" strokeWidth={2.5} />
            <div className="min-w-0">
              <div className="text-sm font-bold text-info">
                Approval in progress — stage:{" "}
                <span className="capitalize">
                  {currentStage?.label ?? chainStage}
                </span>
              </div>
              <div className="text-xs text-text-muted mt-0.5">
                Step {Math.max(stageIndex + 1, 1)} of {visibleChainSteps.length} ·
                Vendor cannot act until the chain reaches Done.
              </div>
            </div>
          </div>
          {/* Compact step rail */}
          <div className="flex items-center gap-1 flex-wrap shrink-0">
            {visibleChainSteps.map((step, i) => {
              const reached = i < stageIndex;
              const active = i === stageIndex;
              return (
                <span
                  key={step.key}
                  title={step.label}
                  className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded ${
                    reached
                      ? "bg-success-soft text-success"
                      : active
                        ? "bg-warning-soft text-warning"
                        : "bg-surface-container text-text-subtle"
                  }`}
                >
                  {step.label.split(" ")[0]}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Vendor-facing notice — neutral wording, no stage / role detail. */}
      {!chainDone && po.status === "pending" && isVendorView && (
        <div className="bg-info-soft border border-info/30 rounded-lg px-4 py-3 mb-6 flex items-center gap-3 print:hidden">
          <Clock className="h-5 w-5 text-info" strokeWidth={2.5} />
          <div>
            <div className="text-sm font-bold text-info">
              Awaiting buyer approval
            </div>
            <div className="text-xs text-text-muted mt-0.5">
              You'll be notified once this PO is released. No action is needed
              from you yet.
            </div>
          </div>
        </div>
      )}

      {/* Terminal-state banners */}
      {po.status === "accepted" && (
        <div className="bg-success-soft border border-success/30 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 print:hidden">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-success" strokeWidth={2.5} />
            <div className="text-sm font-bold text-success">
              Vendor accepted — goods can now be received.
            </div>
          </div>
          {/* Finance / accountant / admin can issue a payment from here */}
          {!isVendorView &&
            (user?.role === "admin" ||
              user?.role === "accountant" ||
              (user?.role === "hod" && user.department?.code === "FIN")) && (
              <Link
                to={`/app/payments/new?po=${po.number}`}
                className="px-3 py-2 text-xs font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-md whitespace-nowrap inline-flex items-center gap-1.5 self-start sm:self-auto"
              >
                Create Payment →
              </Link>
            )}
        </div>
      )}
      {po.status === "rejected" && (
        <div className="bg-danger-soft border border-danger/30 rounded-lg px-4 py-3 flex items-center gap-3 mb-6 print:hidden">
          <XCircle className="h-5 w-5 text-danger" strokeWidth={2.5} />
          <div className="text-sm font-bold text-danger">
            Vendor rejected this PO. Contact procurement to renegotiate.
          </div>
        </div>
      )}
      {po.status === "pending" && isVendorView && chainDone && (
        <div className="bg-warning-soft border border-warning/30 rounded-lg px-4 py-3 flex items-center gap-3 mb-6 print:hidden">
          <Clock className="h-5 w-5 text-warning" strokeWidth={2.5} />
          <div className="text-sm font-semibold text-warning">
            Action needed — please Accept or Reject this PO.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 print:block">
        <div className="xl:col-span-8 space-y-6">
          <section className="bg-surface-container-lowest rounded-md p-6 border border-border">
            <h2 className="text-lg font-bold text-text mb-6 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary print:hidden" /> Vendor &amp;
              References
            </h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              <Meta label="Vendor" value={po.vendor} />
              <Meta label="PR Reference" value={po.pr_number} />
              <Meta label="Business Unit" value={po.business_unit} />
              <Meta label="PO Date" value={po.po_date} />
              <Meta label="Expected Delivery" value={po.expected_delivery} />
            </div>
            {po.notes && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                  Notes / Terms
                </div>
                <div className="text-sm text-text whitespace-pre-line">
                  {po.notes}
                </div>
              </div>
            )}
          </section>

          <section className="bg-surface-container-lowest rounded-md overflow-hidden border border-border">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold text-text">Line Items</h2>
              <span className="text-xs text-text-muted">
                {items.length} line{items.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="bg-surface-container-low text-[10px] font-bold text-text-muted uppercase tracking-widest">
                    <th className="px-4 py-3 text-left">Item</th>
                    <th className="px-3 py-3 text-left">Code</th>
                    <th className="px-3 py-3 text-left">HSN</th>
                    <th className="px-3 py-3 text-right">UOM</th>
                    <th className="px-3 py-3 text-right">Qty</th>
                    <th className="px-3 py-3 text-right">Rate</th>
                    <th className="px-3 py-3 text-right">GST</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-8 text-center text-text-muted"
                      >
                        No items on this PO.
                      </td>
                    </tr>
                  ) : (
                    items.map((it, i) => {
                      const qty = Number(it.qty) || 0;
                      const rate =
                        Number(it.rate) || Number(it.price) || 0;
                      const gstPct = Number(it.gst) || 0;
                      const taxable = qty * rate;
                      const gstAmt = (taxable * gstPct) / 100;
                      const lineTotal = taxable + gstAmt;
                      return (
                        <tr
                          key={i}
                          className="border-b border-border hover:bg-surface-container-low"
                        >
                          <td className="px-4 py-3 font-medium">
                            {display(it.name)}
                          </td>
                          <td className="px-3 py-3 text-text-muted font-mono text-xs">
                            {display(it.code)}
                          </td>
                          <td className="px-3 py-3 text-text-muted font-mono text-xs">
                            {display(it.hsn_code)}
                          </td>
                          <td className="px-3 py-3 text-right text-text-muted">
                            {display(it.uom)}
                          </td>
                          <td className="px-3 py-3 text-right font-medium">
                            {qty}
                          </td>
                          <td className="px-3 py-3 text-right font-mono">
                            {currency(rate)}
                          </td>
                          <td className="px-3 py-3 text-right text-text-muted text-xs">
                            {gstPct}%
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold">
                            {currency(lineTotal)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="xl:col-span-4 space-y-6 print:mt-6">
          <section className="bg-surface-container-lowest rounded-md p-6 border border-border">
            <h2 className="text-lg font-bold text-text mb-6">Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Taxable Subtotal</span>
                <span className="font-mono">{currency(po.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">GST Total</span>
                <span className="font-mono">{currency(po.tax)}</span>
              </div>
              <div className="pt-3 mt-3 border-t border-border flex justify-between items-center">
                <span className="font-bold text-text">Grand Total</span>
                <span className="text-xl font-black text-primary font-mono">
                  {currency(po.total)}
                </span>
              </div>
            </div>
          </section>

          <FulfilmentTracker po={po} grns={grns} isVendorView={isVendorView} />


          {!isBackoffice && !isVendorView && !isTerminal && (
            <div className="text-xs text-text-muted flex items-start gap-2 px-2">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5" />
              <span>
                Only the assigned vendor or admin can accept / reject this PO.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Dispatch documents (FLOW.md items 12-13) — visible once PO is in
          a state where the vendor would be expected to dispatch. Per-doc
          delete eligibility is decided inside the card (admin OR uploader). */}
      {(po.status === "accepted" || po.status === "fulfilled") && (
        <div className="mt-6 print:hidden">
          <PoDocumentsCard
            poNumber={po.number}
            canUpload={isVendorView || isAdmin}
          />
        </div>
      )}

      {/* Vendor feedback — any in-org viewer can leave one against the PO's
          vendor. Hidden in vendor portal view (vendors don't see feedback
          against themselves yet). */}
      {!isVendorView && po.vendor && (
        <div className="mt-6 print:hidden">
          <VendorFeedbackCard
            vendorName={po.vendor}
            poNumber={po.number}
          />
        </div>
      )}

      {/* Vendor rating — multi-dimensional scorecard. Each in-org user has
          one row per vendor (upserted). Aggregate is computed server-side
          and shown at the top of the card. */}
      {!isVendorView && po.vendor && (
        <div className="mt-6 print:hidden">
          <VendorRatingCard vendorName={po.vendor} />
        </div>
      )}

      {modal && (
        <AcceptPOModal
          poNumber={po.number}
          onClose={() => setModal(false)}
          onAccept={doAccept}
          busy={acting}
        />
      )}

      {chainModalOpen && currentStage && (
        <ChainStatusModal
          title={`Update PO Status — ${po.number}`}
          stageLabel={currentStage.label}
          onClose={() => setChainModalOpen(false)}
          onSubmit={onChainSubmit}
        />
      )}

      <PrintFooter
        docNumber={po.number}
        signatures={[
          { label: "Issued By (Purchase)" },
          { label: "Authorised By", name: po.business_unit ?? null },
          { label: "Vendor Acceptance", name: po.vendor },
        ]}
      />
    </div>
  );
}
