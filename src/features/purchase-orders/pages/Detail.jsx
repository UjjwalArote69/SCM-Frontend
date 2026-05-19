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
  Banknote,
  FileText,
  Info,
  ListChecks,
} from "lucide-react";
import AcceptPOModal from "../components/AcceptPOModal.jsx";
import RejectPOModal from "../components/RejectPOModal.jsx";
import AdminVendorOverridePanel from "../components/AdminVendorOverridePanel.jsx";
import SendVoiceNotePanel from "../components/SendVoiceNotePanel.jsx";
import StatusPill from "../../../components/data/StatusPill.jsx";
import ChainStatusModal from "../../../components/feedback/ChainStatusModal.jsx";
import ReopenRejectedButton from "../../../components/admin/ReopenRejectedButton.jsx";
import PoDocumentsCard from "../../po-documents/components/PoDocumentsCard.jsx";
import VendorFeedbackCard from "../../vendor-feedback/components/VendorFeedbackCard.jsx";
import VendorRatingCard from "../../vendor-rating/components/VendorRatingCard.jsx";
import VoiceNotesPanel from "../../../components/data/VoiceNotesPanel.jsx";
import PrintLetterhead from "../../../components/print/PrintLetterhead.jsx";
import PrintFooter from "../../../components/print/PrintFooter.jsx";
import { usePOStore } from "../store.js";
import { useGRNStore } from "../../grn/store.js";
import { usePoDocumentsStore } from "../../po-documents/store.js";
import { useToast } from "../../../hooks/useToast.jsx";
import { useAuthStore } from "../../auth/store.js";
import poApi from "../api.js";
import client from "../../../api/client.js";

// PO chain stages now come from po.chain_stages (resolved server-side from
// the matching approval rule). Legacy fallback covers POs created before
// the rule engine landed — they keep the original 5-stage chain.
const LEGACY_CHAIN_STAGES = [
  { key: "purchase_hod", label: "Purchase HOD", role: "hod", department_code: "PURCH" },
  { key: "finance_hod", label: "Finance HOD", role: "hod", department_code: "FIN" },
  { key: "respective_hod", label: "Respective Dept HOD", role: "hod", department_code: ":requester_dept" },
  { key: "cfo", label: "CFO", role: "cfo" },
  { key: "ceo", label: "CEO", role: "ceo" },
];

function userActsOnStage(user, stageObj) {
  if (!user || !stageObj) return false;
  if (user.role === "admin") return true;
  if (user.role !== stageObj.role) return false;
  if (!stageObj.department_code) return true;
  return user.department?.code === stageObj.department_code;
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

function isEmpty(v) {
  if (v === null || v === undefined) return true;
  const s = String(v).trim();
  return s === "" || s === "null" || s === "—";
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

/**
 * Compact key/value fact shown in the hero card facts strip. Matches the
 * PR Detail's FactItem visual pattern so the two detail pages read as a
 * pair. `accent` highlights the value in primary color — used for Grand
 * Total so the number pops.
 */
function PoFact({ label, value, accent = false }) {
  return (
    <div className="flex flex-col min-w-0">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-subtle">
        {label}
      </span>
      <span
        className={`text-[13px] font-semibold truncate ${
          accent ? "text-primary font-mono" : "text-text"
        }`}
      >
        {value}
      </span>
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

  // Distinguish internal rejection from vendor rejection by walking the
  // approval_history. Internal rejects (CFO/CEO/HOD/admin via updateStatus)
  // append a row with action="reject"; vendor rejects via vendorAction()
  // don't touch history at all, so absence of a reject row = vendor said no.
  const rejectInfo = (() => {
    if (!isRejected) return null;
    const hist = Array.isArray(po.approval_history) ? po.approval_history : [];
    for (let i = hist.length - 1; i >= 0; i--) {
      if (hist[i]?.action === "reject") {
        return {
          internal: true,
          role: hist[i].by_role ?? null,
          stage: hist[i].stage ?? null,
          actor: hist[i].by_user_name ?? null,
        };
      }
    }
    return { internal: false, role: null, stage: null, actor: null };
  })();

  const steps = [
    {
      label: "PO issued",
      sublabel: po.po_date ?? null,
      state: "done",
    },
    {
      label: isRejected
        ? rejectInfo?.internal
          ? `Rejected at ${rejectInfo.stage ? rejectInfo.stage.replace(/_/g, " ").toUpperCase() : (rejectInfo.role ? rejectInfo.role.toUpperCase() : "approval")}`
          : "Vendor rejected"
        : "Vendor acceptance",
      sublabel: isAccepted
        ? `Accepted by ${po.vendor}`
        : isRejected
          ? rejectInfo?.internal
            ? `Blocked${rejectInfo.actor ? ` by ${rejectInfo.actor}` : ""}`
            : "PO will not proceed"
          : `Awaiting ${po.vendor}`,
      state: isAccepted ? "done" : isRejected ? "rejected" : "active",
    },
    {
      // As soon as the site person creates ANY GRN against this PO, this
      // step flips to "done" — the goods have been received at the gate,
      // even if PM hasn't approved the GRN yet (PM approval gates payment,
      // not goods receipt).
      label: "Goods received",
      sublabel: poGrns.length > 0
        ? grnDone
          ? `Fully received (${poGrns.length} GRN${poGrns.length === 1 ? "" : "s"})`
          : grnPartial
            ? `Partial — ${totalReceived} of ${totalOrdered} (${poGrns.length} GRN${poGrns.length === 1 ? "" : "s"})`
            : `${poGrns.length} GRN${poGrns.length === 1 ? "" : "s"} on file`
        : isAccepted
          ? "Pending delivery"
          : "Awaits acceptance",
      state: poGrns.length > 0
        ? "done"
        : isAccepted
          ? "active"
          : "waiting",
    },
    {
      label: "Paid",
      sublabel: "Coming soon",
      state: "waiting",
      muted: true,
    },
  ];

  return (
    <section className="glass-card rounded-2xl p-3 sm:p-6 print:hidden">
      <h2 className="text-sm font-semibold text-text mb-4 sm:mb-5 flex items-center gap-2">
        <Truck className="h-4 w-4 text-text-muted" strokeWidth={2} />
        Procure-to-pay
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
  const poDocs = usePoDocumentsStore((s) =>
    number ? (s.byPo[number] ?? null) : null,
  );
  const fetchPoDocs = usePoDocumentsStore((s) => s.fetchForPo);

  const [fetched, setFetched] = useState(null);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [modal, setModal] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
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

  // The PoDocumentsCard below also fetches these, but we need them in this
  // scope to build the consolidated voice-notes panel. Calling fetchForPo
  // twice is safe — the store de-dupes by overwriting byPo[number].
  useEffect(() => {
    if (number) fetchPoDocs(number).catch(() => {});
  }, [number, fetchPoDocs]);

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
  // GRNs for this PO — used to gate vendor feedback / rating sections so
  // they only surface once goods have been received. (FulfilmentTracker
  // re-derives its own copy from `grns` to stay self-contained.)
  const poGrns = (grns ?? []).filter((g) => g.po_number === po.number);
  const isAdmin = user?.role === "admin";
  const isBackoffice = BACKOFFICE_ROLES.has(user?.role);

  // Internal approval chain state — chain_stages comes from the rule engine.
  const chainStage = po.chain_stage ?? "done"; // legacy POs default to done
  const chainDone = chainStage === "done";
  const visibleChainSteps = (Array.isArray(po.chain_stages) && po.chain_stages.length > 0)
    ? po.chain_stages
    : LEGACY_CHAIN_STAGES.filter(
        (s) => s.key !== "respective_hod" || po.respective_dept_code,
      );
  const stageIndex = visibleChainSteps.findIndex((s) => s.key === chainStage);
  const currentStage = visibleChainSteps[stageIndex];
  const canActOnChain = !chainDone && !isTerminal && userActsOnStage(user, currentStage);

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

  const doAccept = async (payload = {}) => {
    setActing(true);
    try {
      const updated = await accept(po.number, payload);
      setFetched(updated);
      setModal(false);
      toast.success(`${po.number} accepted — buyer has been notified`);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Could not accept PO");
    } finally {
      setActing(false);
    }
  };

  const doReject = async (payload = {}) => {
    setActing(true);
    try {
      const updated = await reject(po.number, payload);
      setFetched(updated);
      setRejectModal(false);
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

      <nav className="text-[11px] sm:text-[12px] font-medium text-text-muted mb-3 sm:mb-4 flex items-center gap-1.5 print:hidden">
        <Link
          to={isVendorView ? "/vendor/purchase-orders" : "/app/purchase-orders"}
          className="hover:text-primary transition-colors"
        >
          <span className="hidden sm:inline">Purchase Orders</span>
          <span className="sm:hidden">POs</span>
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-text-subtle" />
        <span className="text-text font-mono truncate">{po.number}</span>
      </nav>

      {/* Hero card — mirrors PR Detail's glass-card hero so the two detail
          pages feel visually unified. Top section: status + title + facts.
          Bottom action bar: pill buttons (print/pdf/email) + primary CTAs. */}
      <div className="mb-4 sm:mb-6 glass-card rounded-2xl overflow-hidden print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3 sm:gap-6 p-3 sm:p-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <StatusPill tone={TONE[po.status] ?? "neutral"}>
                {po.status}
              </StatusPill>
              {!chainDone && po.status === "pending" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-info-soft text-info border border-info/20">
                  <Clock className="h-3 w-3" strokeWidth={2.25} />
                  {isVendorView ? "Buyer review" : "Internal review"}
                </span>
              )}
            </div>
            <h1 className="text-[20px] sm:text-[28px] font-bold tracking-tight text-text font-mono break-all leading-tight">
              {po.number}
            </h1>
            {po.pr_number && (
              <p className="text-text-muted text-[12px] sm:text-[13px] mt-1 inline-flex items-center gap-1.5">
                <span className="text-text-subtle">from</span>
                <span className="font-mono font-semibold">{po.pr_number}</span>
              </p>
            )}
            {/* Facts strip — 2-col grid on mobile, free-flowing on sm+ */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 sm:flex sm:flex-wrap sm:gap-x-6 sm:gap-y-2 mt-3 sm:mt-4 text-xs">
              <PoFact label="Vendor" value={display(po.vendor)} />
              <PoFact label="PO Date" value={display(po.po_date)} />
              <PoFact label="Expected" value={display(po.expected_delivery)} />
              <PoFact label="Company" value={display(po.business_unit)} />
              <PoFact
                label="Grand Total"
                value={currency(po.total)}
                accent
              />
            </div>
          </div>
        </div>

        {/* Bottom action bar */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3 px-3 sm:px-6 py-3 border-t border-border">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 text-[12px] font-semibold text-text-muted border border-border rounded-full bg-surface-container-low/60 hover:text-text hover:border-white/20 transition-colors flex items-center gap-1.5"
              aria-label="Print"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await poApi.downloadPdf(po.number);
                  const url = URL.createObjectURL(res);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${po.number}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                } catch (err) {
                  toast.error(err?.response?.data?.message ?? "Could not download PDF");
                }
              }}
              className="px-3 py-1.5 text-[12px] font-semibold text-text-muted border border-border rounded-full bg-surface-container-low/60 hover:text-text hover:border-white/20 transition-colors flex items-center gap-1.5"
              aria-label="Download PDF"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </button>
            {isBackoffice && (
              <button
                type="button"
                onClick={() => {
                  const subject = `Purchase Order ${po.number}`;
                  const body = encodeURIComponent(
                    `Please find PO ${po.number} for your review.\n\nOpen in Suppliers First: ${window.location.href}`,
                  );
                  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${body}`;
                }}
                className="px-3 py-1.5 text-[12px] font-semibold text-text-muted border border-border rounded-full bg-surface-container-low/60 hover:text-text hover:border-white/20 transition-colors flex items-center gap-1.5"
                aria-label="Email"
              >
                <Mail className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Email</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Internal approval chain — Update Status for the role at this stage */}
            {canActOnChain && (
              <button
                type="button"
                onClick={() => setChainModalOpen(true)}
                disabled={acting}
                className="px-5 py-2 text-[12px] font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-full transition-all shadow-sm disabled:opacity-60"
              >
                Update Status
              </button>
            )}

            {/* Accept/Reject — vendor view only, while pending AND chain done */}
            {isVendorView && po.status === "pending" && (
              <>
                <button
                  type="button"
                  onClick={() => setRejectModal(true)}
                  disabled={acting || !chainDone}
                  title={!chainDone ? "Awaiting buyer approval" : undefined}
                  className="px-4 py-2 text-[12px] font-bold text-danger border border-danger/30 bg-danger-soft/40 hover:bg-danger-soft rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </button>
                <button
                  type="button"
                  onClick={() => setModal(true)}
                  disabled={acting || !chainDone}
                  title={!chainDone ? "Awaiting buyer approval" : undefined}
                  className="px-5 py-2 text-[12px] font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-full transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="px-3 py-1.5 text-[12px] font-bold text-danger border border-danger/30 bg-danger-soft/40 hover:bg-danger-soft rounded-full transition-colors disabled:opacity-60 flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Admin reopen — undo an INTERNAL-chain rejection so the chain can
          re-flow (chain-stage rewind, status → pending). Distinct from
          AdminVendorOverridePanel below, which overrides the VENDOR-side
          accept/reject decision after the chain has reached `done`. */}
      {!isVendorView && (
        <div className="mb-4 print:hidden">
          <ReopenRejectedButton
            endpoint={`/pos/${po.number}/reopen`}
            entityLabel="PO"
            status={po.status}
            onReopened={(updated) => setFetched(updated)}
          />
        </div>
      )}

      {/* Admin override of the vendor's accept/reject decision. Only
          surfaces on the buyer/admin view (not /vendor/...), only renders
          for admin role, and bypasses both terminal-state + chain-done
          guards on the backend. Every override is tagged admin_override
          in approval_history. */}
      {!isVendorView && (
        <div className="mb-4 print:hidden">
          <AdminVendorOverridePanel
            po={po}
            onUpdated={(updated) => setFetched(updated)}
          />
        </div>
      )}

      {/* Internal-chain banner — only for in-org users. Vendors get a
          neutral "awaiting buyer approval" notice (see below) so they
          don't see internal stage / role detail. */}
      {!chainDone && po.status === "pending" && !isVendorView && (
        <div className="bg-info-soft border border-info/30 rounded-2xl px-4 py-3 mb-6 flex flex-col sm:flex-row sm:items-center gap-3 print:hidden">
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

      {/* Vendor-facing chain banner — identical visual structure to the
          buyer's chain banner (same icon, same layout, same step-rail
          shape). Content is sanitized so internal stages/roles never leak,
          but the page reads visually identical to what an internal user
          sees on the same PO. */}
      {!chainDone && po.status === "pending" && isVendorView && (
        <div className="bg-info-soft border border-info/30 rounded-2xl px-4 py-3 mb-6 flex flex-col sm:flex-row sm:items-center gap-3 print:hidden">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <GitBranch className="h-5 w-5 text-info shrink-0 mt-0.5" strokeWidth={2.5} />
            <div className="min-w-0">
              <div className="text-sm font-bold text-info">
                Approval in progress — stage:{" "}
                <span className="capitalize">Buyer review</span>
              </div>
              <div className="text-xs text-text-muted mt-0.5">
                Step 2 of 3 · You'll be able to Accept once the buyer
                releases this PO.
              </div>
            </div>
          </div>
          {/* Compact step rail — same chip pattern as the buyer's banner,
              just with sanitized labels (no CFO/CEO/HOD role names). */}
          <div className="flex items-center gap-1 flex-wrap shrink-0">
            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-success-soft text-success">
              Issued
            </span>
            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-warning-soft text-warning">
              Review
            </span>
            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-surface-container text-text-subtle">
              Released
            </span>
          </div>
        </div>
      )}

      {/* Terminal-state banners */}
      {po.status === "accepted" && (() => {
        // Surface the vendor's accept note + voice recording (if any) to the
        // buyer. Vendor portal hides approval_history via scrubForVendor, so
        // this block only renders for in-org viewers.
        const hist = Array.isArray(po.approval_history) ? po.approval_history : [];
        let accept = null;
        for (let i = hist.length - 1; i >= 0; i--) {
          if (hist[i]?.stage === "vendor_decision" && hist[i]?.action === "accepted") {
            accept = hist[i];
            break;
          }
        }
        return (
          <div className="bg-success-soft border border-success/30 rounded-lg px-4 py-3 mb-6 print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-success" strokeWidth={2.5} />
                <div className="text-sm font-bold text-success">
                  Vendor accepted — goods can now be received.
                </div>
              </div>
              {!isVendorView && (() => {
                const isFinHod = user?.role === "hod" && user.department?.code === "FIN";
                const isAdmin = user?.role === "admin";
                const isAssignedAccountant =
                  user?.role === "accountant" && po.payment_creator_id === user.id;
                return isAdmin || isFinHod || isAssignedAccountant ? (
                  <Link
                    to={`/app/payments/new?po=${po.number}`}
                    className="px-3 py-2 text-xs font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-md whitespace-nowrap inline-flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    Create Payment →
                  </Link>
                ) : null;
              })()}
            </div>
            {!isVendorView && (accept?.comment || accept?.voice_note) && (
              <div className="mt-3 pt-3 border-t border-success/20">
                {accept.comment && (
                  <div className="text-xs italic text-text mb-2">
                    <span className="font-semibold not-italic text-success">
                      {accept.by_user_name ?? "Vendor"}:
                    </span>{" "}
                    &ldquo;{accept.comment}&rdquo;
                  </div>
                )}
                {accept.voice_note && (
                  <div className="bg-success-soft/40 border border-success/20 rounded-md px-2 py-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-success mb-1">
                      Voice note
                    </div>
                    <audio
                      src={accept.voice_note}
                      controls
                      preload="metadata"
                      className="w-full h-8"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Item 39: Finance HOD / admin assigns an accountant to draft the
         payment. Only visible after the PO is accepted (otherwise nothing
         to draft). Accountants viewing the same PO can see who's been
         assigned but can't change it. */}
      {!isVendorView && (po.status === "accepted" || po.status === "fulfilled") && (
        <PaymentCreatorAssignment
          po={po}
          user={user}
          onAssigned={(updated) => setFetched(updated)}
        />
      )}
      {po.status === "rejected" && (() => {
        // Find the most recent reject entry in approval_history to figure
        // out WHO rejected — internal chain (CFO/CEO/HOD/admin) writes
        // action='reject'; vendor reject now writes stage='vendor_decision'
        // action='rejected'. We pick the most-recent of either to drive the
        // banner so admin overrides and re-rejects are picked up too.
        const hist = Array.isArray(po.approval_history) ? po.approval_history : [];
        let lastInternal = null;
        let lastVendor = null;
        for (let i = hist.length - 1; i >= 0; i--) {
          const h = hist[i];
          if (!lastInternal && h?.action === "reject") lastInternal = h;
          if (!lastVendor && h?.stage === "vendor_decision" && h?.action === "rejected") lastVendor = h;
          if (lastInternal && lastVendor) break;
        }
        // Prefer whichever came later (timestamps are ISO).
        const pickInternal = lastInternal && (!lastVendor || (lastInternal.at ?? "") >= (lastVendor.at ?? ""));
        const lastReject = pickInternal ? lastInternal : (lastVendor ?? lastInternal);
        const isInternal = !!pickInternal;
        const rejectorLabel = lastReject
          ? (lastReject.by_user_name
              ? `${lastReject.by_user_name}${lastReject.by_role ? ` (${lastReject.by_role.toUpperCase()})` : ""}`
              : (lastReject.by_role
                  ? lastReject.by_role.toUpperCase()
                  : (lastReject.stage ? lastReject.stage.replace(/_/g, " ").toUpperCase() : "Approver")))
          : "The vendor";
        const headline = isInternal
          ? `${rejectorLabel} rejected this PO`
          : `${rejectorLabel} rejected this PO`;
        const sub = isInternal
          ? "Internal approval was blocked. See the comment + audit history below for the reason."
          : "Contact procurement to renegotiate.";
        return (
          <div className="bg-danger-soft border border-danger/30 rounded-2xl px-4 py-3 flex items-start gap-3 mb-6 print:hidden">
            <XCircle className="h-5 w-5 text-danger shrink-0 mt-0.5" strokeWidth={2.5} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-danger">{headline}</div>
              <div className="text-xs text-text-muted mt-0.5">{sub}</div>
              {lastReject?.comment && (
                <div className="mt-2 px-3 py-2 rounded border-l-2 border-danger bg-danger-soft/40 text-xs text-text italic">
                  &ldquo;{lastReject.comment}&rdquo;
                </div>
              )}
              {lastReject?.voice_note && (
                <div className="mt-2 bg-danger-soft/40 border border-danger/20 rounded-md px-2 py-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-danger mb-1">
                    Voice note
                  </div>
                  <audio
                    src={lastReject.voice_note}
                    controls
                    preload="metadata"
                    className="w-full h-8"
                  />
                </div>
              )}
            </div>
          </div>
        );
      })()}
      {po.status === "pending" && isVendorView && chainDone && (
        <div className="bg-warning-soft border border-warning/30 rounded-2xl px-4 py-3 flex items-center gap-3 mb-6 print:hidden">
          <Clock className="h-5 w-5 text-warning" strokeWidth={2.5} />
          <div className="text-sm font-semibold text-warning">
            Action needed — please Accept or Reject this PO.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6 print:block">
        <div className="xl:col-span-8 space-y-4 sm:space-y-6">
          <section className="glass-card rounded-2xl p-3 sm:p-6 print-reset print:bg-surface-container-lowest print:border print:border-border print:rounded-md">
            <h2 className="text-sm font-semibold text-text mb-4 sm:mb-5 flex items-center gap-2">
              <Info className="h-4 w-4 text-text-muted print:hidden" strokeWidth={2} />
              Vendor &amp; References
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 sm:gap-x-8 gap-y-4 sm:gap-y-6 print-meta-grid">
              <Meta label="Vendor" value={po.vendor} />
              <Meta label="PR Reference" value={po.pr_number} />
              <Meta label="Business Unit" value={po.business_unit} />
              <Meta label="PO Date" value={po.po_date} />
              <Meta label="Expected Delivery" value={po.expected_delivery} />
              <Meta
                label="Transport arranged by"
                value={
                  po.transport_arranged_by === "buyer"
                    ? `Buyer${po.transport_vendor?.vendor_name ? ` · ${po.transport_vendor.vendor_name}` : ""}`
                    : "Vendor (FOR)"
                }
              />
              {po.notes && (
                <div className="md:col-span-2 pt-2 border-t border-border">
                  <Meta label="Notes / Terms" value={po.notes} />
                </div>
              )}
            </div>
          </section>

          <section className="glass-card rounded-2xl overflow-hidden print-reset print:bg-surface-container-lowest print:border print:border-border print:rounded-md">
            <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-border flex justify-between items-center print:p-0 print:border-0 print:mb-2">
              <h2 className="text-sm font-semibold text-text flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-text-muted print:hidden" strokeWidth={2} />
                Line Items
              </h2>
              <span className="text-xs text-text-muted print:text-[8pt]">
                {items.length} line{items.length === 1 ? "" : "s"}
              </span>
            </div>

            {items.length === 0 ? (
              <div className="px-6 py-12 text-center text-text-muted text-sm">
                No items on this PO.
              </div>
            ) : (
              <>
                {/* Mobile cards — cleaner than horizontal-scroll on phones */}
                <div className="md:hidden divide-y divide-border print:hidden">
                  {items.map((it, i) => {
                    const qty = Number(it.qty) || 0;
                    const rate = Number(it.rate) || Number(it.price) || 0;
                    const gstPct = Number(it.gst) || 0;
                    const taxable = qty * rate;
                    const lineTotal = taxable + (taxable * gstPct) / 100;
                    return (
                      <div key={i} className="px-4 py-3.5">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-text-muted">
                                #{i + 1}
                              </span>
                              <span className="font-semibold text-text text-sm truncate">
                                {display(it.name)}
                              </span>
                            </div>
                            {!isEmpty(it.code) && (
                              <div className="text-xs text-info font-mono mt-0.5">
                                {it.code}
                                {!isEmpty(it.hsn_code) && (
                                  <span className="text-text-muted">
                                    {" "}· HSN {it.hsn_code}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-base font-bold text-text tabular-nums leading-tight">
                              {qty}
                            </div>
                            <div className="text-[10px] uppercase tracking-wider text-text-muted">
                              {display(it.uom)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/40 text-xs">
                          <div className="text-text-muted">
                            <span className="font-mono text-text">
                              {currency(rate)}
                            </span>{" "}
                            ×{" "}
                            <span className="font-mono">{qty}</span>
                            <span className="text-text-subtle">
                              {" "}+ {gstPct}% GST
                            </span>
                          </div>
                          <div className="font-mono font-bold text-text tabular-nums text-sm">
                            {currency(lineTotal)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-surface-container-low/40 text-[10px] font-bold text-text-muted uppercase tracking-[0.16em] border-b border-border">
                        <th className="px-5 py-3 text-left">Item</th>
                        <th className="px-3 py-3 text-left">Code / HSN</th>
                        <th className="px-3 py-3 text-right">UOM</th>
                        <th className="px-3 py-3 text-right">Qty</th>
                        <th className="px-3 py-3 text-right">Rate</th>
                        <th className="px-3 py-3 text-right">GST</th>
                        <th className="px-5 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {items.map((it, i) => {
                        const qty = Number(it.qty) || 0;
                        const rate = Number(it.rate) || Number(it.price) || 0;
                        const gstPct = Number(it.gst) || 0;
                        const taxable = qty * rate;
                        const lineTotal = taxable + (taxable * gstPct) / 100;
                        return (
                          <tr
                            key={i}
                            className="hover:bg-surface-container-low/40 transition-colors"
                          >
                            <td className="px-5 py-3.5 font-medium text-text">
                              {display(it.name)}
                            </td>
                            <td className="px-3 py-3.5 font-mono text-xs">
                              {!isEmpty(it.code) ? (
                                <span className="text-info">{it.code}</span>
                              ) : (
                                <span className="text-text-subtle">—</span>
                              )}
                              {!isEmpty(it.hsn_code) && (
                                <div className="text-text-subtle mt-0.5">
                                  HSN {it.hsn_code}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-3.5 text-right text-text-muted">
                              {display(it.uom)}
                            </td>
                            <td className="px-3 py-3.5 text-right font-medium tabular-nums">
                              {qty}
                            </td>
                            <td className="px-3 py-3.5 text-right font-mono tabular-nums text-text">
                              {currency(rate)}
                            </td>
                            <td className="px-3 py-3.5 text-right text-text-muted text-xs tabular-nums">
                              {gstPct}%
                            </td>
                            <td className="px-5 py-3.5 text-right font-mono font-bold tabular-nums text-text">
                              {currency(lineTotal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </div>

        <div className="xl:col-span-4 space-y-4 sm:space-y-6 print:mt-6">
          <section className="glass-card rounded-2xl p-3 sm:p-6 print-reset print:bg-surface-container-lowest print:border print:border-border print:rounded-md">
            <h2 className="text-sm font-semibold text-text mb-4 sm:mb-5 flex items-center gap-2">
              <Banknote className="h-4 w-4 text-text-muted print:hidden" strokeWidth={2} />
              Summary
            </h2>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Taxable subtotal</span>
                <span className="font-mono tabular-nums text-text">{currency(po.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">GST total</span>
                <span className="font-mono tabular-nums text-text">{currency(po.tax)}</span>
              </div>
              <div className="pt-3 mt-2 border-t border-border flex justify-between items-baseline">
                <span className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
                  Grand total
                </span>
                <span className="text-2xl font-black text-primary font-mono tabular-nums">
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

      {/* Standalone send-voice-note panel. Vendor + admin can leave a
          free-form text + voice message any time on the PO; the result is
          appended to approval_history server-side so the consolidated
          VoiceNotesPanel below + the activity feed pick it up
          automatically. Other in-org roles can listen but not post — they
          have their own channels (chain comments, vendor feedback). */}
      {(isVendorView || isAdmin) && (
        <div className="mt-6 print:hidden">
          <SendVoiceNotePanel
            poNumber={po.number}
            onSent={(updated) => setFetched(updated)}
          />
        </div>
      )}

      {/* Consolidated voice notes — every recording attached to this PO,
          in one place. Pulls from:
            * approval_history entries with voice_note (vendor accept/reject,
              admin override, free-form vendor_note). Buyer view reads the
              full history; vendor view reads `vendor_visible_notes` which
              the backend builds from a vendor-safe subset of history (their
              own decisions + free-form notes + admin overrides on those —
              chain-stage approver comments stay hidden).
            * app_po_document rows with voice_note (dispatch-doc captions) —
              same data for both audiences; vendor uploaded them.
          Hidden from employees + customers — they don't see vendor docs. */}
      {!["employee", "customer"].includes(user?.role) && (() => {
        const hist = isVendorView
          ? (Array.isArray(po.vendor_visible_notes) ? po.vendor_visible_notes : [])
          : (Array.isArray(po.approval_history) ? po.approval_history : []);
        const docs = Array.isArray(poDocs) ? poDocs : [];
        const histNotes = hist
          .filter((h) => h?.voice_note)
          .map((h) => ({
            audio: h.voice_note,
            by: h.by_user_name ?? "Vendor",
            role: h.by_role ?? null,
            source: h.stage === "vendor_decision"
              ? (h.action === "accepted"
                  ? "Vendor accepted PO"
                  : h.action === "rejected"
                    ? "Vendor rejected PO"
                    : h.admin_override
                      ? `Admin override (${h.action})`
                      : `Vendor ${h.action}`)
              : h.stage === "vendor_note"
                ? "Voice message"
                : `Stage: ${(h.stage ?? "").replace(/_/g, " ")}`,
            at: h.at ?? null,
            comment: h.comment ?? null,
          }));
        const docNotes = docs
          .filter((d) => d?.voice_note)
          .map((d) => ({
            audio: d.voice_note,
            by: d.uploaded_by?.name ?? "Vendor",
            role: "vendor",
            source: `${
              d.doc_type === "e_way_bill" ? "E-Way Bill"
                : d.doc_type === "invoice" ? "Invoice"
                : d.doc_type === "delivery_note" ? "Delivery Note"
                : "Document"
            } upload · ${d.original_name}`,
            at: d.uploaded_at ?? null,
            comment: d.caption ?? null,
          }));
        const notes = [...histNotes, ...docNotes];
        if (notes.length === 0) return null;
        return (
          <div className="mt-6 print:hidden">
            <VoiceNotesPanel
              title={isVendorView ? "Your voice notes" : "Voice notes from vendor"}
              notes={notes}
            />
          </div>
        );
      })()}

      {/* Dispatch documents (FLOW.md item 15) — visible once PO is in a
          state where the vendor would be expected to dispatch. Hidden from
          employees and customers (sensitive vendor invoices / E-way bills).
          Per-doc delete eligibility is decided inside the card (admin OR uploader). */}
      {(po.status === "accepted" || po.status === "fulfilled")
        && !["employee", "customer"].includes(user?.role) && (
        <div className="mt-6 print:hidden">
          <PoDocumentsCard
            poNumber={po.number}
            canUpload={isVendorView || isAdmin}
          />
        </div>
      )}

      {/* Vendor feedback — any in-org viewer can leave one against the PO's
          vendor. Hidden in vendor portal view (vendors don't see feedback
          against themselves yet). Only unlocked once goods have actually
          been received against this PO (at least one GRN exists) — there's
          nothing meaningful to score before then. */}
      {!isVendorView && po.vendor && poGrns.length > 0 && (
        <div className="mt-6 print:hidden">
          <VendorFeedbackCard
            vendorName={po.vendor}
            poNumber={po.number}
          />
        </div>
      )}

      {/* Vendor rating — multi-dimensional scorecard. Each in-org user has
          one row per vendor (upserted). Aggregate is computed server-side
          and shown at the top of the card. Same gate as the feedback card:
          unlocked only after the first GRN against this PO. */}
      {!isVendorView && po.vendor && poGrns.length > 0 && (
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

      {rejectModal && (
        <RejectPOModal
          poNumber={po.number}
          onClose={() => setRejectModal(false)}
          onReject={doReject}
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

/**
 * Finance HOD / admin assigns an accountant to draft the payment for this PO
 * (FLOW.md item 39). Accountants only see who's currently assigned; the
 * payment-creator gate itself is enforced server-side in PaymentController.
 */
function PaymentCreatorAssignment({ po, user, onAssigned }) {
  // Hooks must run unconditionally — visibility gates are applied below.
  const [accountants, setAccountants] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const isFinHod = user?.role === "hod" && user.department?.code === "FIN";
  const isAdmin = user?.role === "admin";
  const canAssign = isFinHod || isAdmin;
  // Accountants don't need to see the section unless they're assigned (or no
  // one is, in which case it's irrelevant to them) — keep the rail clean.
  const isAccountant = user?.role === "accountant";
  if (!canAssign && !isAccountant) return null;
  if (isAccountant && !po.payment_creator_id) return null;

  const openPicker = async () => {
    setOpen(true);
    if (accountants === null) {
      try {
        const r = await client.get("/users/accountants");
        setAccountants(r.data?.data ?? []);
      } catch {
        setAccountants([]);
        toast.error("Couldn't load accountants list.");
      }
    }
  };

  const assign = async (userId) => {
    setSaving(true);
    try {
      const r = await client.post(`/pos/${po.number}/assign-payment-creator`, { user_id: userId });
      onAssigned?.(r.data?.data ?? po);
      setOpen(false);
      toast.success(userId ? "Payment creator assigned." : "Assignment cleared.");
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Could not assign.");
    } finally {
      setSaving(false);
    }
  };

  const currentName = po.payment_creator?.name ?? null;

  return (
    <div className="bg-surface-container-lowest border border-border rounded-lg px-4 py-3 mb-6 print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <Banknote className="h-5 w-5 text-info shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-text">Payment creator</div>
          <div className="text-xs text-text-muted truncate">
            {currentName
              ? <>Assigned to <span className="font-semibold text-text">{currentName}</span></>
              : <>No accountant assigned — only Finance HOD / admin can draft this PO's payment.</>}
          </div>
        </div>
      </div>
      {canAssign && (
        <button
          type="button"
          onClick={openPicker}
          disabled={saving}
          className="px-3 py-2 text-xs font-bold text-info border border-info/30 hover:bg-info-soft rounded-md whitespace-nowrap inline-flex items-center gap-1.5 self-start sm:self-auto disabled:opacity-60"
        >
          {currentName ? "Change" : "Assign accountant"}
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !saving && setOpen(false)}>
          <div className="bg-surface-container-lowest border border-border rounded-lg w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-lg font-bold text-text">Assign payment creator</h3>
              <p className="text-xs text-text-muted">
                Pick an accountant to draft the payment for {po.number}. Only they (or the Finance HOD) will be able to create the payment.
              </p>
            </div>
            <div className="p-3 max-h-[50vh] overflow-y-auto">
              {accountants === null ? (
                <div className="py-6 flex items-center justify-center text-text-muted text-sm">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
                </div>
              ) : accountants.length === 0 ? (
                <p className="text-sm text-text-muted px-3 py-4">No accountants in this org yet.</p>
              ) : (
                <ul className="space-y-1">
                  {accountants.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => assign(a.id)}
                        disabled={saving}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                          po.payment_creator_id === a.id
                            ? "bg-info-soft text-info"
                            : "hover:bg-surface-container-low text-text"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">{a.name}</div>
                          <div className="text-xs text-text-muted truncate">{a.email}</div>
                        </div>
                        {po.payment_creator_id === a.id && (
                          <CheckCircle2 className="h-4 w-4 text-info shrink-0" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="px-5 py-3 border-t border-border flex justify-between gap-2 bg-surface-container-low">
              {po.payment_creator_id ? (
                <button
                  onClick={() => assign(null)}
                  disabled={saving}
                  className="text-xs font-bold text-danger hover:underline"
                >
                  Clear assignment
                </button>
              ) : <span />}
              <button
                onClick={() => setOpen(false)}
                disabled={saving}
                className="px-4 py-2 text-sm border border-border rounded-md hover:bg-surface-container-lowest"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
