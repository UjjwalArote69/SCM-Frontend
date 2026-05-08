import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  CheckCircle2,
  Clock,
  Loader2,
  Trash2,
  AlertCircle,
  GitBranch,
  ShieldCheck,
  XCircle,
  PauseCircle,
  History,
  CreditCard,
  Hash,
  Building2,
  Calendar,
} from "lucide-react";
import { usePaymentStore } from "../store.js";
import paymentApi from "../api.js";
import { useAuthStore } from "../../auth/store.js";
import { useToast } from "../../../hooks/useToast.jsx";
import ChainStatusModal from "../../../components/feedback/ChainStatusModal.jsx";
import PrintLetterhead from "../../../components/print/PrintLetterhead.jsx";
import PrintFooter from "../../../components/print/PrintFooter.jsx";
import PrintActions from "../../../components/print/PrintActions.jsx";

// Terminal stage shown after the rule's chain — Finance HOD releases payment here.
const TERMINAL_STAGE = {
  key: "cleared_to_pay",
  label: "Cleared — ready to pay",
  role: "hod",
  department_code: "FIN",
  short: "Clear",
  blurb: "Finance HOD release",
};

/**
 * Build the visualizable chain: rule-driven approval stages + terminal.
 * For older Payments without chain_stages, fall back to amount-tier mapping.
 */
function chainFor(payment) {
  const stages = Array.isArray(payment.chain_stages) ? [...payment.chain_stages] : null;
  if (stages === null || stages.length === 0) {
    // legacy hardcoded fallback (covers Payments created before the engine landed
    // and the "auto-cleared" tier-1 case which has no approval stages)
    const n = Number(payment.amount ?? 0);
    if (n >= 500_000) {
      return [
        { key: "pending_cfo", label: "CFO Review", role: "cfo" },
        { key: "pending_ceo", label: "CEO Review", role: "ceo" },
        TERMINAL_STAGE,
      ];
    }
    if (n >= 50_000) {
      return [{ key: "pending_cfo", label: "CFO Review", role: "cfo" }, TERMINAL_STAGE];
    }
    return [TERMINAL_STAGE];
  }
  return [...stages, TERMINAL_STAGE];
}

function userActsOnPaymentStage(user, stageObj) {
  if (!user || !stageObj) return false;
  if (user.role === "admin") return true;
  if (user.role !== stageObj.role) return false;
  if (!stageObj.department_code) return true;
  return user.department?.code === stageObj.department_code;
}

const STAGE_LABEL = {
  cleared_to_pay: "Cleared — ready to pay",
  done: "Done",
};

function fmtINR(n) {
  return `₹${Number(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function display(v) {
  return v === null || v === undefined || v === "" ? "—" : v;
}

function formatDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

const STATUS_TONE = {
  pending: "bg-warning-soft text-warning border-warning/30",
  paid: "bg-success-soft text-success border-success/30",
  rejected: "bg-danger-soft text-danger border-danger/30",
};

function StatusPill({ status }) {
  const Icon = status === "paid" ? CheckCircle2 : Clock;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${
        STATUS_TONE[status] ?? STATUS_TONE.pending
      }`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
      {status}
    </span>
  );
}

function canMarkPaid(user) {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.role === "hod" && user.department?.code === "FIN") return true;
  return false;
}

function MetaField({ label, value, mono = false, icon: Icon }) {
  return (
    <div className="flex items-start gap-2 min-w-0">
      {Icon && (
        <Icon className="h-3.5 w-3.5 text-text-subtle shrink-0 mt-1.5" strokeWidth={2.25} />
      )}
      <div className="min-w-0">
        <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-0.5">
          {label}
        </div>
        <div className={`text-sm font-semibold text-text truncate ${mono ? "font-mono" : ""}`}>
          {display(value)}
        </div>
      </div>
    </div>
  );
}

const HISTORY_ICON = {
  approve: { Icon: CheckCircle2, cls: "bg-success text-white", tone: "text-success" },
  reject: { Icon: XCircle, cls: "bg-danger text-white", tone: "text-danger" },
  hold: { Icon: PauseCircle, cls: "bg-warning text-white", tone: "text-warning" },
  mark_paid: {
    Icon: CheckCircle2,
    cls: "bg-primary text-primary-foreground",
    tone: "text-primary",
  },
};

const HISTORY_LABEL = {
  approve: "Approved",
  reject: "Rejected",
  hold: "Put on hold",
  mark_paid: "Marked as paid",
};

function HistoryEntry({ entry, isLast }) {
  const meta = HISTORY_ICON[entry.action] ?? HISTORY_ICON.approve;
  const Icon = meta.Icon;
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center shrink-0">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${meta.cls}`}
        >
          <Icon className="h-4 w-4" strokeWidth={2.5} />
        </div>
        {!isLast && <div className="w-[2px] flex-1 my-1 bg-border" aria-hidden />}
      </div>
      <div className={`flex-1 min-w-0 pt-1 ${isLast ? "" : "pb-5"}`}>
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <div className="text-sm font-semibold text-text">
            <span className={meta.tone}>{HISTORY_LABEL[entry.action] ?? entry.action}</span>
            {entry.stage && (
              <span className="text-text-muted font-normal">
                {" "}at <span className="capitalize">{entry.stage.replace(/_/g, " ")}</span>
              </span>
            )}
          </div>
          <span className="text-[11px] text-text-subtle">
            {entry.at ? new Date(entry.at).toLocaleString() : ""}
          </span>
        </div>
        <div className="text-xs text-text-muted mt-0.5">
          by{" "}
          <span className="font-semibold text-text">
            {entry.by_user_name ?? "—"}
          </span>
          {entry.by_role && (
            <span className="ml-1.5 text-[10px] uppercase tracking-wider font-bold text-text-subtle">
              ({entry.by_role})
            </span>
          )}
        </div>
        {entry.comment && (
          <div className="mt-2 px-3 py-2 rounded border-l-2 border-warning bg-warning-soft/30 text-xs italic text-text">
            “{entry.comment}”
          </div>
        )}
      </div>
    </li>
  );
}

export default function PaymentDetailPage() {
  const { number } = useParams();
  const nav = useNavigate();
  const inStore = usePaymentStore((s) => s.byNumber(number));
  const markPaid = usePaymentStore((s) => s.markPaid);
  const updateStatus = usePaymentStore((s) => s.updateStatus);
  const remove = usePaymentStore((s) => s.remove);
  const user = useAuthStore((s) => s.user);
  const toast = useToast();

  const [fetched, setFetched] = useState(null);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [chainModalOpen, setChainModalOpen] = useState(false);

  const payment = inStore ?? fetched;
  const loading = !payment && !fetchFailed;

  useEffect(() => {
    if (inStore) return;
    let cancelled = false;
    paymentApi
      .get(number)
      .then((d) => {
        if (!cancelled) setFetched(d);
      })
      .catch(() => {
        if (!cancelled) setFetchFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [number, inStore]);

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto flex items-center justify-center py-24 text-text-muted">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading {number}…
      </div>
    );
  }
  if (!payment) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <h2 className="text-2xl font-bold text-text mb-2">Payment not found</h2>
        <Link to="/app/payments" className="text-primary font-bold hover:underline">
          Back to list
        </Link>
      </div>
    );
  }

  const isAdmin = user?.role === "admin";
  const chainStage = payment.chain_stage ?? "cleared_to_pay";
  const isCleared = chainStage === "cleared_to_pay";
  const showMarkPaid =
    canMarkPaid(user) && payment.status === "pending" && isCleared;

  // Build the visualizable chain (rule stages + terminal cleared_to_pay)
  const chain = chainFor(payment);
  const stageIndex = chain.findIndex((s) => s.key === chainStage);
  const currentStageObj = chain[stageIndex];
  const tierLabel = chain.length === 1
    ? "Auto-cleared"
    : chain.length === 2
      ? "Single-approver chain"
      : `${chain.length - 1}-stage approval`;

  const canActOnChain =
    payment.status === "pending" &&
    !isCleared &&
    chainStage !== "done" &&
    userActsOnPaymentStage(user, currentStageObj);

  const doMarkPaid = async () => {
    setSubmitting(true);
    try {
      const updated = await markPaid(payment.number, {
        reference_no: reference.trim() || undefined,
      });
      setFetched(updated);
      setConfirmOpen(false);
      toast.success(`${payment.number} marked as paid.`);
    } catch (err) {
      toast.error(
        err?.response?.data?.message ?? err?.message ?? "Could not mark paid",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onChainSubmit = async ({ action, comments }) => {
    setSubmitting(true);
    try {
      const updated = await updateStatus(payment.number, { action, comments });
      setFetched(updated);
      setChainModalOpen(false);
      toast.success(
        `Payment ${
          action === "approve"
            ? "approved"
            : action === "reject"
              ? "rejected"
              : "held"
        }.`,
      );
    } catch (err) {
      toast.error(
        err?.response?.data?.message ??
          err?.message ??
          "Could not update status",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const doDelete = async () => {
    if (!window.confirm(`Permanently delete ${payment.number}?`)) return;
    try {
      await remove(payment.number);
      toast.success(`${payment.number} deleted`);
      nav("/app/payments");
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Could not delete");
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-20 sm:pb-0">
      <PrintLetterhead
        docType="Payment Voucher"
        docNumber={payment.number}
        subtitle={payment.vendor ? `Vendor: ${payment.vendor}` : null}
      />

      <div className="flex items-center justify-between gap-2 mb-3 print:hidden">
        <nav className="text-sm font-medium text-text-muted flex items-center gap-2">
          <Link to="/app/payments" className="hover:text-primary">
            Payments
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-text">{payment.number}</span>
        </nav>
        <PrintActions
          pdfFetcher={() => paymentApi.downloadPdf(payment.number)}
          pdfFilename={`${payment.number}.pdf`}
          onError={(msg) => toast.error(msg)}
          onPdfHint={(msg) => toast.info(msg)}
        />
      </div>

      {/* Hero */}
      <div className="mb-6 rounded-xl bg-surface-container-lowest border border-border overflow-hidden">
        <div className="p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <StatusPill status={payment.status} />
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border bg-info-soft text-info border-info/20">
              <ShieldCheck className="h-3 w-3" strokeWidth={2.5} /> {tierLabel}
            </span>
            <span className="text-xs text-text-muted">
              for{" "}
              <Link
                to={`/app/purchase-orders/${payment.po_number}`}
                className="font-mono font-bold text-primary hover:underline"
              >
                {payment.po_number}
              </Link>
            </span>
          </div>
          <div className="flex items-end flex-wrap gap-x-6 gap-y-2 mb-4">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-text font-mono break-all">
              {payment.number}
            </h1>
            <div className="text-right ml-auto">
              <div className="text-[10px] uppercase tracking-widest font-bold text-text-muted">
                Amount
              </div>
              <div className="text-2xl sm:text-3xl font-black text-primary font-mono leading-tight">
                {fmtINR(payment.amount)}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-xs pt-4 border-t border-border">
            <MetaField icon={Building2} label="Vendor" value={payment.vendor} />
            <MetaField icon={CreditCard} label="Method" value={
              payment.payment_method
                ? payment.payment_method
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())
                : "—"
            } />
            <MetaField icon={Hash} label="Reference" value={payment.reference_no} mono />
            <MetaField
              icon={Calendar}
              label="Created"
              value={formatDateTime(payment.created_at)}
            />
            {payment.paid_at && (
              <MetaField
                icon={CheckCircle2}
                label="Paid on"
                value={formatDateTime(payment.paid_at)}
              />
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-6 py-3 border-t border-border bg-surface-container-low/40">
          <div className="text-xs text-text-muted">
            {payment.status === "paid"
              ? "Funds released."
              : payment.status === "rejected"
                ? "This payment was rejected."
                : isCleared
                  ? "Cleared by approvers — Finance HOD can release funds."
                  : (currentStageObj?.label ? `Awaiting ${currentStageObj.label}` : "In review.")}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <button
                type="button"
                onClick={doDelete}
                className="px-3 py-2 text-xs font-semibold text-danger border border-danger/30 bg-danger-soft/40 rounded-md hover:bg-danger-soft inline-flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            )}
            {canActOnChain && (
              <button
                type="button"
                onClick={() => setChainModalOpen(true)}
                disabled={submitting}
                className="px-5 py-2.5 sm:py-2 text-sm font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-md disabled:opacity-60"
              >
                Update Status
              </button>
            )}
            {showMarkPaid && (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="w-full sm:w-auto px-5 py-2.5 sm:py-2 text-sm font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-md"
              >
                Mark as Paid
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Approval banner — only when payment has any chain to traverse */}
      {payment.status === "pending" && chain.length > 1 && (
        <div className="mb-6 rounded-lg bg-surface-container-lowest border border-border overflow-hidden">
          <div className="px-4 sm:px-5 py-3 flex items-center gap-2 border-b border-border bg-surface-container-low/40">
            <GitBranch className="h-4 w-4 text-text-muted" strokeWidth={2.25} />
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-text">
              Approval chain
            </h2>
            <span className="ml-auto text-[10px] uppercase tracking-widest font-bold text-text-muted">
              {tierLabel}
            </span>
          </div>
          <ol className="flex items-center gap-1 sm:gap-3 px-4 sm:px-5 py-5 overflow-x-auto">
            {chain.map((stage, i) => {
              const reached = i < stageIndex || (isCleared && stage.key === "cleared_to_pay");
              const active = (i === stageIndex && !isCleared)
                || (stage.key === "cleared_to_pay" && isCleared);
              const cls = reached
                ? "bg-success text-white"
                : active
                  ? "bg-warning text-white ring-4 ring-warning-soft animate-pulse"
                  : "bg-surface-container border border-border text-text-subtle";
              const short = stage.short ?? stage.role.toUpperCase();
              const blurb = stage.blurb ?? stage.label;
              return (
                <li key={stage.key} className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold ${cls}`}
                    >
                      {reached ? (
                        <CheckCircle2 className="h-5 w-5" strokeWidth={2.5} />
                      ) : (
                        <span className="text-sm">{i + 1}</span>
                      )}
                    </div>
                    <div className="text-center">
                      <div
                        className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
                          active
                            ? "text-warning"
                            : reached
                              ? "text-success"
                              : "text-text-subtle"
                        }`}
                      >
                        {short}
                      </div>
                      <div className="text-[9px] text-text-subtle hidden sm:block">
                        {blurb}
                      </div>
                    </div>
                  </div>
                  {i < chain.length - 1 && (
                    <div
                      className={`w-8 sm:w-16 h-[2px] -mt-5 ${
                        reached ? "bg-success" : "bg-border"
                      }`}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Two-column on lg+: history on left, notes on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {Array.isArray(payment.approval_history) && payment.approval_history.length > 0 && (
          <section className="lg:col-span-2 glass-card rounded-2xl overflow-hidden">
            <header className="px-4 sm:px-5 py-3 flex items-center gap-2 border-b border-border bg-surface-container-low/40">
              <History className="h-4 w-4 text-text-muted" strokeWidth={2.25} />
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-text">
                Activity
              </h2>
              <span className="ml-auto text-[10px] uppercase tracking-widest font-bold text-text-muted">
                {payment.approval_history.length}{" "}
                {payment.approval_history.length === 1 ? "event" : "events"}
              </span>
            </header>
            <ol className="p-4 sm:p-5">
              {payment.approval_history.map((e, i) => (
                <HistoryEntry
                  key={i}
                  entry={e}
                  isLast={i === payment.approval_history.length - 1}
                />
              ))}
            </ol>
          </section>
        )}

        {payment.notes && (
          <section className="glass-card rounded-2xl overflow-hidden">
            <header className="px-4 sm:px-5 py-3 border-b border-border bg-surface-container-low/40">
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-text">
                Notes
              </h2>
            </header>
            <div className="p-4 sm:p-5">
              <p className="text-sm text-text whitespace-pre-line leading-relaxed">
                {payment.notes}
              </p>
            </div>
          </section>
        )}
      </div>

      {chainModalOpen && (
        <ChainStatusModal
          title={`Update payment — ${payment.number}`}
          stageLabel={STAGE_LABEL[chainStage] ?? chainStage}
          onClose={() => setChainModalOpen(false)}
          onSubmit={onChainSubmit}
        />
      )}

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => !submitting && setConfirmOpen(false)}
        >
          <div
            className="bg-surface w-full sm:max-w-md rounded-t-2xl sm:rounded-xl border border-border shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-base font-bold text-text">
                Mark {payment.number} as paid?
              </h3>
              <p className="text-xs text-text-muted mt-1">
                {fmtINR(payment.amount)} to {payment.vendor}. This is the final
                step — funds are considered released.
              </p>
            </div>
            <div className="p-5">
              <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                Reference / UTR (optional)
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder={payment.reference_no ?? "Transaction ID, cheque no, etc."}
                className="w-full rounded-lg px-3.5 py-3 sm:py-2.5 text-sm bg-surface-container-lowest border border-border text-text focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-mono"
              />
              <p className="text-[11px] text-text-muted mt-2 flex items-start gap-1.5">
                <AlertCircle className="h-3 w-3 mt-0.5" />
                Leave blank to keep the existing reference.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-surface-container-low/40 rounded-b-2xl sm:rounded-b-xl">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-text border border-border rounded-md hover:bg-surface-container-low disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doMarkPaid}
                disabled={submitting}
                className="px-4 py-2 text-sm font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-md disabled:opacity-60 inline-flex items-center gap-2"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? "Marking…" : "Confirm — Mark Paid"}
              </button>
            </div>
          </div>
        </div>
      )}

      <PrintFooter
        docNumber={payment.number}
        signatures={[
          { label: "Prepared By (Finance)" },
          { label: "Authorised By", name: "Finance HOD" },
          { label: "Vendor Acknowledgement", name: payment.vendor },
        ]}
      />
    </div>
  );
}
