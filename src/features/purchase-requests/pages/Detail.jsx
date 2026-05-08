import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ChevronRight,
  CheckCircle2,
  Clock,
  XCircle,
  Printer,
  Download,
  Mail,
  Info,
  ListChecks,
  GitBranch,
  Loader2,
  UserPlus,
  UserCheck,
  Trash2,
} from "lucide-react";
import {
  Users,
  Banknote,
  Crown,
} from "lucide-react";
import UpdateStatusModal from "../components/UpdateStatusModal.jsx";
import AssignAuthorModal from "../../../components/feedback/AssignAuthorModal.jsx";
import { usePRStore } from "../store.js";
import prApi from "../api.js";
import prDocumentsApi from "../documents/api.js";
import { useToast } from "../../../hooks/useToast.jsx";
import { useAuthStore } from "../../auth/store.js";
import { DocumentPreviewModal } from "../../../components/misc/DocumentPreview.jsx";
import {
  Paperclip, Image as ImageIcon, Eye, FileWarning,
} from "lucide-react";

/**
 * Role-based gate for acting on a PR — now rule-driven.
 *
 * The backend appends pr.chain_stages — the resolved chain for THIS PR
 * (e.g. [{ key: "hod_purch", role: "hod", department_code: "PURCH", label: "Purchase HOD" }, ...]).
 *
 * The user can act if:
 *   - they're admin, OR
 *   - their role matches the current stage's role AND
 *   - the stage's department_code is empty OR equals their department.code.
 *
 * Creator can always cancel their own pending PR.
 */
function canActOnPr(user, pr) {
  if (!user || !pr) return { canAct: false, canCancel: false };
  if (pr.status !== "pending" || pr.chain_stage === "done") {
    return { canAct: false, canCancel: false };
  }

  const isCreator = pr.created_by && pr.created_by === user.id;
  if (user.role === "admin") return { canAct: true, canCancel: true };

  const stages = Array.isArray(pr.chain_stages) ? pr.chain_stages : null;
  const current = stages?.find((s) => s.key === pr.chain_stage);

  // Fallback for older records without chain_stages (legacy hod/cfo/ceo)
  if (!current) {
    const isApprover = user.role === pr.chain_stage;
    return { canAct: isApprover, canCancel: isApprover || isCreator };
  }

  const roleMatch = user.role === current.role;
  const deptMatch = !current.department_code
    || user.department?.code === current.department_code;

  const canAct = roleMatch && deptMatch;
  return { canAct, canCancel: canAct || isCreator };
}

/** Map a stage's role to an icon for the timeline. */
const ROLE_ICON = {
  hod: Users,
  cfo: Banknote,
  ceo: Crown,
  director: Crown,
  manager: Users,
  purchase_officer: Users,
  accountant: Banknote,
};

/** Roles that get to see private comments / per-stage attribution.
 *  Anyone whose role appears in the resolved chain is an approver. */
function isApproverFor(user, pr) {
  if (!user) return false;
  if (user.role === "admin") return true;
  const stages = Array.isArray(pr?.chain_stages) ? pr.chain_stages : [];
  return stages.some((s) => s.role === user.role);
}

const APPROVER_ROLES = new Set(["admin", "hod", "cfo", "ceo", "director", "manager", "purchase_officer", "accountant"]);

const STATUS_TONE = {
  pending: {
    cls: "bg-warning-soft text-warning border-warning/30",
    label: "Pending",
    Icon: Clock,
  },
  approved: {
    cls: "bg-success-soft text-success border-success/30",
    label: "Approved",
    Icon: CheckCircle2,
  },
  rejected: {
    cls: "bg-danger-soft text-danger border-danger/30",
    label: "Rejected",
    Icon: XCircle,
  },
  cancelled: {
    cls: "bg-surface-container-high text-text-muted border-border",
    label: "Cancelled",
    Icon: XCircle,
  },
};

function daysSince(value) {
  if (isEmpty(value)) return 0;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
}

function isEmpty(v) {
  return (
    v === null ||
    v === undefined ||
    v === "" ||
    v === "null" ||
    v === "undefined"
  );
}

function display(v) {
  return isEmpty(v) ? "—" : v;
}

/** Plain-language description of a resolved stage. */
function describeStageRole(stage) {
  if (!stage) return "";
  if (stage.role === "hod") {
    if (!stage.department_code) return "Any HOD can approve";
    if (stage.department_code === ":requester_dept") return "HOD of the requesting department";
    return `HOD of the ${stage.department_code} department`;
  }
  if (stage.role === "cfo") return "Confirms budget and financial fit";
  if (stage.role === "ceo") return "Final executive sign-off";
  if (stage.role === "director") return "Board-level director sign-off";
  return stage.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(value) {
  if (isEmpty(value)) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ApprovalSummary({ pr }) {
  const stages = Array.isArray(pr.chain_stages) ? pr.chain_stages : [];
  if (stages.length === 0) return null;

  // Find current stage index; everything before it is approved (assuming no hold/reject)
  const currentIdx = stages.findIndex((s) => s.key === pr.chain_stage);
  const isDone = pr.chain_stage === "done" || pr.status === "approved";
  const isRejected = pr.status === "rejected";

  // Read approval_history to compute per-stage state precisely
  const history = Array.isArray(pr.approval_history) ? pr.approval_history : [];
  const stageState = (stage, idx) => {
    const last = [...history].reverse().find((h) => h?.stage === stage.key);
    if (last?.action === "reject") return "rejected";
    if (last?.action === "approve") return "approved";
    if (isDone && idx <= (currentIdx === -1 ? stages.length : currentIdx)) return "approved";
    if (isRejected) return "rejected";
    if (idx === currentIdx) return "pending";
    if (currentIdx === -1) return "waiting";
    return idx < currentIdx ? "approved" : "waiting";
  };

  return (
    <div className="flex items-center bg-surface-container-low rounded-md px-2 py-1 max-w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <span className="hidden sm:inline text-xs font-medium text-text-muted mr-3 uppercase tracking-wider shrink-0">
        Approvals:
      </span>
      <div className="flex items-center gap-1.5 sm:gap-2">
        {stages.map((s, idx) => {
          const state = stageState(s, idx);
          const cls = state === "approved"
            ? "text-success bg-success-soft border-success/30"
            : state === "rejected"
              ? "text-danger bg-danger-soft border-danger/30"
              : state === "pending"
                ? "text-warning bg-warning-soft border-warning/30"
                : "text-text-subtle bg-surface-container border-border";
          const Icon = state === "approved" ? CheckCircle2 : state === "rejected" ? XCircle : Clock;
          // Compact label: prefer role short, fall back to first 4 chars
          const short = s.role === "hod" && s.department_code
            ? s.department_code
            : s.role.toUpperCase().slice(0, 4);
          return (
            <span
              key={s.key}
              title={`${s.label}: ${state}`}
              className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded border uppercase ${cls}`}
            >
              {short}
              <Icon className="h-3.5 w-3.5" />
            </span>
          );
        })}
      </div>
    </div>
  );
}

function MetaField({ label, value }) {
  return (
    <div>
      <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-base font-medium text-text">{display(value)}</div>
    </div>
  );
}

/* ============================================================
   Approval timeline — vertical stepper with per-step connector
   that auto-aligns to the node above (no absolute positioning).
   ============================================================ */
function ApprovalTree({ pr, canSeeComment }) {
  // chain_stages comes from the backend (resolved from the matching rule).
  // For old records that predate this field, fall back to the legacy 3-step
  // hod/cfo/ceo chain so the page still renders.
  const stages = useMemo(() => {
    if (Array.isArray(pr.chain_stages) && pr.chain_stages.length > 0) {
      return pr.chain_stages;
    }
    return [
      { key: "hod", role: "hod", label: "Department HOD" },
      { key: "cfo", role: "cfo", label: "CFO Review" },
      { key: "ceo", role: "ceo", label: "CEO Review" },
    ];
  }, [pr.chain_stages]);

  const isComplete = pr.status === "approved";
  const isCancelled = pr.status === "cancelled";
  const isRejected = pr.status === "rejected";
  const currentIdx = stages.findIndex((s) => s.key === pr.chain_stage);

  // History per stage key
  const history = Array.isArray(pr.approval_history) ? pr.approval_history : [];
  const lastEntryAtKey = (key) => {
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i]?.stage === key) return history[i];
    }
    return null;
  };

  // Compute per-stage state
  const stageState = (stage, idx) => {
    const last = lastEntryAtKey(stage.key);
    if (last?.action === "reject") return "rejected";
    if (last?.action === "approve") return "approved";
    if (isComplete) return "approved";
    if (isRejected) return idx === currentIdx ? "rejected" : "waiting";
    if (idx === currentIdx) return last?.action === "hold" ? "hold" : "pending";
    if (currentIdx === -1) return "waiting";
    return idx < currentIdx ? "approved" : "waiting";
  };

  const approvedCount = stages.filter((s, i) => stageState(s, i) === "approved").length;

  const summary = isComplete
    ? { text: "Fully approved", cls: "bg-success-soft text-success" }
    : isRejected
      ? { text: "Rejected", cls: "bg-danger-soft text-danger" }
      : isCancelled
        ? { text: "Cancelled", cls: "bg-surface-container-high text-text-muted" }
        : {
            text: `${approvedCount} of ${stages.length} approved`,
            cls: "bg-warning-soft text-warning",
          };

  return (
    <section className="glass-card rounded-2xl overflow-hidden print-reset">
      <header className="px-4 sm:px-5 py-3 sm:py-4 border-b border-border flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-text-muted print:hidden" />
          Approval Timeline
        </h2>
        <span
          className={`text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full shrink-0 ${summary.cls}`}
        >
          {summary.text}
        </span>
      </header>

      <ol className="p-4 sm:p-5 pt-2">
        {stages.map((stage, idx) => {
          const state = stageState(stage, idx);
          const approved = state === "approved";
          const stepRejected = state === "rejected";
          const active = state === "pending" || state === "hold";
          const isLast = idx === stages.length - 1;
          const RoleIcon = ROLE_ICON[stage.role] ?? Users;
          // Construct title + description from the stage object
          const step = {
            shortLabel: stage.label?.replace(/ Review$/, "") ?? stage.role.toUpperCase(),
            title: stage.label ?? stage.role,
            description: describeStageRole(stage),
            Icon: RoleIcon,
          };

          // Node colour
          const nodeCls = approved
            ? "bg-success text-white"
            : stepRejected
              ? "bg-danger text-white"
              : active
                ? "bg-warning text-white ring-4 ring-warning-soft"
                : "bg-surface-container border border-border text-text-subtle";

          const NodeIcon = approved
            ? CheckCircle2
            : stepRejected
              ? XCircle
              : RoleIcon;

          // Connector colour reflects "what state crossed FROM this node TO
          // the next" — green if this step is approved, red if rejected,
          // muted otherwise (still waiting / in review).
          const connectorCls = approved
            ? "bg-success"
            : stepRejected
              ? "bg-danger"
              : "bg-border";

          const badge = approved
            ? { text: "Approved", tone: "text-success" }
            : stepRejected
              ? { text: "Rejected", tone: "text-danger" }
              : active
                ? { text: "In Review", tone: "text-warning" }
                : { text: "Waiting", tone: "text-text-subtle" };

          // Comment to show against THIS step. Drawn from the latest history
          // entry whose stage matches this role, never leaking from another
          // stage. For very old PRs predating approval_history, fall back to
          // pr.last_comment but ONLY on the currently-active step (so we don't
          // synthesize a comment against the wrong stage).
          const lastAtThis = lastEntryAtKey(stage.key);
          let stageComment = lastAtThis?.comment ?? null;
          let stageAction = lastAtThis?.action ?? null;
          if (!stageComment && active && history.length === 0) {
            stageComment = pr.last_comment;
          }
          const showComment = canSeeComment && !isEmpty(stageComment);
          // Hold-style chip: yellow border for hold/active comments, red for
          // rejected. Approved-with-comment uses a neutral muted treatment.
          const commentTone = stepRejected
            ? "bg-danger-soft/40 border-danger text-danger"
            : stageAction === "hold"
              ? "bg-warning-soft/40 border-warning text-text"
              : approved
                ? "bg-surface-container/40 border-success text-text-muted"
                : "bg-warning-soft/40 border-warning text-text";

          return (
            <li
              key={stage.key}
              className="flex gap-3 sm:gap-4 print-timeline-item"
            >
              {/* Left column: node circle + connector that fills remaining height */}
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${nodeCls}`}
                >
                  <NodeIcon className="h-[18px] w-[18px]" strokeWidth={2.25} />
                </div>
                {!isLast && (
                  <div
                    className={`w-[2px] flex-1 my-1 rounded-full transition-colors print:hidden ${connectorCls}`}
                    aria-hidden
                  />
                )}
              </div>

              {/* Right column: text content */}
              <div className={`flex-1 min-w-0 pt-1.5 ${isLast ? "" : "pb-5 sm:pb-6"}`}>
                <div className="flex items-baseline justify-between gap-2 sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-bold text-text">
                      {step.shortLabel}
                    </span>
                    <span className="hidden sm:inline ml-2 text-xs text-text-muted truncate">
                      {step.title}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] uppercase tracking-widest font-bold shrink-0 ${badge.tone}`}
                  >
                    {badge.text}
                  </span>
                </div>
                <p className="text-xs text-text-subtle mt-0.5 sm:hidden">
                  {step.title}
                </p>
                <p className="text-xs text-text-subtle mt-0.5 hidden sm:block">
                  {step.description}
                </p>
                {showComment && (
                  <div
                    className={`text-xs mt-2 px-3 py-2 rounded border-l-2 italic ${commentTone}`}
                  >
                    {stageAction === "hold" && (
                      <span className="not-italic font-bold uppercase tracking-wider text-[10px] mr-1.5 text-warning">
                        On hold:
                      </span>
                    )}
                    &ldquo;{stageComment}&rdquo;
                    {lastAtThis?.by_user_name && (
                      <span className="not-italic block text-[10px] text-text-subtle mt-1 font-medium">
                        — {lastAtThis.by_user_name}
                        {lastAtThis.by_role ? ` (${lastAtThis.by_role.toUpperCase()})` : ""}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function RequesterStatusPanel({ pr }) {
  const config = {
    pending: {
      cls: "bg-warning-soft text-warning border-warning/30",
      Icon: Clock,
      title: "Pending review",
      blurb:
        "Your request is being reviewed by the approval team. You'll be notified when a decision is made.",
    },
    approved: {
      cls: "bg-success-soft text-success border-success/30",
      Icon: CheckCircle2,
      title: "Approved",
      blurb: "Your request has been approved and will move to procurement.",
    },
    rejected: {
      cls: "bg-danger-soft text-danger border-danger/30",
      Icon: XCircle,
      title: "Rejected",
      blurb:
        "Your request was not approved. Contact your manager for details.",
    },
    cancelled: {
      cls: "bg-surface-container-high text-text-muted border-border",
      Icon: XCircle,
      title: "Cancelled",
      blurb: "This request was cancelled and will not proceed.",
    },
  };
  const c = config[pr.status] ?? config.pending;
  const Icon = c.Icon;
  return (
    <section className="glass-card rounded-2xl p-4 sm:p-6 print-reset">
      <h2 className="text-base sm:text-lg font-bold text-text mb-3 sm:mb-4">Request Status</h2>
      <div
        className={`rounded-md border ${c.cls} p-4 sm:p-5 flex items-start gap-3 sm:gap-4`}
      >
        <div className="w-10 h-10 rounded-full bg-surface-container-lowest/60 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5" strokeWidth={2.25} />
        </div>
        <div className="min-w-0">
          <div className="text-base font-bold">{c.title}</div>
          <p className="text-xs mt-1 leading-relaxed opacity-90">{c.blurb}</p>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-border text-[11px] text-text-subtle">
        Approval routing and reviewer details are confidential.
      </div>
    </section>
  );
}

function FactItem({ label, value, capitalize: cap = false }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-widest font-bold text-text-subtle">
        {label}
      </span>
      <span
        className={`text-sm font-semibold text-text ${cap ? "capitalize" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

export default function PurchaseRequestDetailPage() {
  const { id: number } = useParams();
  const nav = useNavigate();
  const inStore = usePRStore((s) =>
    s.items.find((p) => p.number === number),
  );
  const updateStatus = usePRStore((s) => s.updateStatus);
  const assignRfqAuthorAction = usePRStore((s) => s.assignRfqAuthor);
  const removeAction = usePRStore((s) => s.remove);
  const user = useAuthStore((s) => s.user);
  const [fetched, setFetched] = useState(null);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  // Prefer the freshly-fetched record over the store copy: the list endpoint
  // doesn't bundle `documents` / `approval_history`, so a store-only PR would
  // hide attachments and the timeline. Always fetch by number to pick up the
  // bundled relations; fall back to store only for the first paint.
  const pr = fetched ?? inStore;
  const loading = !pr && !fetchFailed;

  useEffect(() => {
    let cancelled = false;
    prApi
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
  }, [number]);

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto flex items-center justify-center py-24 text-text-muted">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading {number}…
      </div>
    );
  }

  if (!pr) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <h2 className="text-2xl font-bold text-text mb-2">
          Purchase Request not found
        </h2>
        <Link
          to="/app/purchase-requests"
          className="text-primary font-bold hover:underline"
        >
          Back to list
        </Link>
      </div>
    );
  }

  const currentStage = (Array.isArray(pr.chain_stages) ? pr.chain_stages : []).find(
    (s) => s.key === pr.chain_stage,
  );
  const stageLabel = currentStage?.label?.toUpperCase()
    ?? (pr.chain_stage === "done" ? "COMPLETED" : "REVIEW");
  const statusTone = STATUS_TONE[pr.status] ?? STATUS_TONE.pending;
  const items = Array.isArray(pr.items) ? pr.items : [];
  const ageInDays = daysSince(pr.created_at);

  const onStatusSubmit = async ({ action, comments }) => {
    setSubmitting(true);
    try {
      const updated = await updateStatus(pr.number, { action, comments });
      setFetched(updated);
      setModalOpen(false);
      toast.success(`Status updated — ${action}.`);
    } catch (err) {
      toast.error(err?.message ?? "Could not update status");
    } finally {
      setSubmitting(false);
    }
  };

  const onAssignSubmit = async (userId) => {
    try {
      const updated = await assignRfqAuthorAction(pr.number, userId);
      setFetched(updated);
      setAssignOpen(false);
      toast.success(
        `RFQ author assigned${updated.assigned_rfq_author?.name ? ` to ${updated.assigned_rfq_author.name}` : ""}.`,
      );
    } catch (err) {
      toast.error(
        err?.response?.data?.message ?? err?.message ?? "Could not assign.",
      );
    }
  };

  const { canAct, canCancel } = canActOnPr(user, pr);
  const userRole = user?.role;
  const stageRole = currentStage?.label ?? "approver";
  const isApproverRole = APPROVER_ROLES.has(userRole);

  // Assignment surface — only Purchase HOD (PURCH dept) and admin can assign
  // an RFQ author, and only once the PR is fully approved.
  const isPurchaseHod =
    userRole === "hod" && user?.department?.code === "PURCH";
  const canAssignRfqAuthor =
    (userRole === "admin" || isPurchaseHod) &&
    pr.status === "approved" &&
    pr.chain_stage === "done";
  const assignedAuthor = pr.assigned_rfq_author ?? null;

  // Backend (`PrController::destroy`) lets the creator delete their own PR
  // when it's been rejected by HOD/CFO/CEO so they can clear the dead
  // record. Surface the button here when those conditions are met.
  const isCreator = pr.created_by != null && pr.created_by === user?.id;
  const canDeleteRejected =
    isCreator && pr.status === "rejected";

  const onDelete = async () => {
    if (
      !window.confirm(
        `Permanently delete ${pr.number}? This cannot be undone.`,
      )
    ) {
      return;
    }
    setSubmitting(true);
    try {
      await removeAction(pr.number);
      toast.success(`${pr.number} deleted.`);
      nav("/app/purchase-requests");
    } catch (err) {
      toast.error(
        err?.response?.data?.message ?? err?.message ?? "Could not delete.",
      );
      setSubmitting(false);
    }
  };

  // Print uses a hidden iframe so we don't trip popup blockers and don't
  // open a separate tab. The iframe loads the same DomPDF, then we trigger
  // the browser's print dialog on its content window.
  const handlePrint = async () => {
    try {
      const blob = await prApi.downloadPdf(pr.number);
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement("iframe");
      iframe.style.cssText =
        "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
      iframe.src = url;
      iframe.onload = () => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch {
          toast.info("Press Ctrl+P to print the PDF preview.");
        }
      };
      document.body.appendChild(iframe);
      setTimeout(() => {
        URL.revokeObjectURL(url);
        iframe.remove();
      }, 60_000);
    } catch {
      toast.error("Could not open print preview");
    }
  };

  const handlePdf = async () => {
    try {
      const blob = await prApi.downloadPdf(pr.number);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${pr.number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Could not download PDF");
    }
  };

  const handleEmail = () => {
    const subject = `Purchase Request ${pr.number} — ${pr.status ?? "pending"}`;
    const url = typeof window !== "undefined" ? window.location.href : "";
    const lines = [
      `Purchase Request: ${pr.number}`,
      pr.title ? `Title: ${pr.title}` : null,
      pr.requester_name ? `Requester: ${pr.requester_name}` : null,
      pr.department ? `Department: ${pr.department}` : null,
      pr.business_unit ? `Company: ${pr.business_unit}` : null,
      `Status: ${pr.status}`,
      `Stage: ${stageRole}`,
      "",
      `Open in Suppliers First: ${url}`,
    ].filter(Boolean);
    const body = encodeURIComponent(lines.join("\n"));
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${body}`;
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Print-only letterhead — rendered only when printing */}
      <div className="print-only mb-6">
        <div className="flex items-start justify-between pb-4 border-b-2 border-black">
          <div>
            <div className="text-[10pt] font-bold tracking-[0.2em] uppercase">
              Suppliers First · Meka Group
            </div>
            <div className="text-[8pt] text-gray-600 mt-0.5">
              Supply Chain Management
            </div>
          </div>
          <div className="text-right">
            <div className="text-[8pt] uppercase tracking-[0.1em] font-bold text-gray-600">
              Purchase Request
            </div>
            <div className="text-[13pt] font-bold tracking-tight">
              {pr.number}
            </div>
            <div className="text-[8pt] text-gray-600 mt-0.5">
              Printed: {new Date().toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <nav className="text-[11px] sm:text-[12px] font-medium text-text-muted mb-3 sm:mb-4 flex items-center gap-1.5 print:hidden">
        <Link
          to="/app/purchase-requests"
          className="hover:text-primary transition-colors"
        >
          <span className="hidden sm:inline">Purchase Requests</span>
          <span className="sm:hidden">PRs</span>
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-text-subtle" />
        <span className="text-text font-mono truncate">{pr.number}</span>
      </nav>

      {/* Hero card */}
      <div className="mb-4 sm:mb-6 glass-card rounded-2xl overflow-hidden print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3 sm:gap-6 p-3 sm:p-6">
          {/* Left: PR number + status + facts */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${statusTone.cls}`}
              >
                <statusTone.Icon className="h-3 w-3" strokeWidth={2.25} />
                {statusTone.label}
              </span>
              {isApproverRole &&
                pr.status === "pending" &&
                pr.chain_stage !== "done" && (
                  <span className="text-xs text-text-muted">
                    Stage{" "}
                    <span className="font-medium text-text">{stageRole}</span>
                  </span>
                )}
              {ageInDays > 0 && (
                <span className="text-xs text-text-muted">
                  Created {ageInDays} day{ageInDays === 1 ? "" : "s"} ago
                </span>
              )}
              {assignedAuthor && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-info-soft text-info border border-info/20"
                  title={`RFQ author assigned: ${assignedAuthor.name}`}
                >
                  <UserCheck className="h-3 w-3" strokeWidth={2.25} />
                  RFQ author: {assignedAuthor.name}
                </span>
              )}
              {pr.status === "approved" &&
                pr.chain_stage === "done" &&
                !assignedAuthor && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning-soft text-warning border border-warning/20">
                    Awaiting RFQ author
                  </span>
                )}
            </div>
            <h1 className="text-[20px] sm:text-[28px] font-bold tracking-tight text-text font-mono break-all leading-tight">
              {pr.number}
            </h1>
            {!isEmpty(pr.title) && (
              <p className="text-text-muted text-[13px] sm:text-[14px] mt-1 sm:mt-1.5">{pr.title}</p>
            )}
            {/* Quick facts strip — 2-col grid on mobile, free-flowing on sm+ */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 sm:flex sm:flex-wrap sm:gap-x-6 sm:gap-y-2 mt-3 sm:mt-4 text-xs">
              <FactItem
                label="Requester"
                value={display(pr.requester_name)}
              />
              <FactItem label="Department" value={display(pr.department)} />
              <FactItem label="Company" value={display(pr.business_unit)} />
              <FactItem label="Created" value={formatDate(pr.created_at)} />
              <FactItem
                label="Expected"
                value={formatDate(pr.expected_date)}
              />
              <FactItem
                label="Priority"
                value={display(pr.priority)}
                capitalize
              />
            </div>
          </div>

          {/* Right: approval chain summary — approvers/admin only */}
          {isApproverRole && (
            <div className="shrink-0">
              <ApprovalSummary pr={pr} />
            </div>
          )}
        </div>

        {/* Bottom action bar */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3 px-3 sm:px-6 py-3 border-t border-border">
          {/* Print/PDF/Email — pill buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 text-[12px] font-semibold text-text-muted border border-border rounded-full bg-surface-container-low/60 hover:text-text hover:border-white/20 transition-colors flex items-center gap-1.5"
              aria-label="Print"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              type="button"
              onClick={handlePdf}
              title="Opens the browser print dialog — select 'Save as PDF'"
              className="px-3 py-1.5 text-[12px] font-semibold text-text-muted border border-border rounded-full bg-surface-container-low/60 hover:text-text hover:border-white/20 transition-colors flex items-center gap-1.5"
              aria-label="Save as PDF"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              type="button"
              onClick={handleEmail}
              title="Opens your email client with PR details prefilled"
              className="px-3 py-1.5 text-[12px] font-semibold text-text-muted border border-border rounded-full bg-surface-container-low/60 hover:text-text hover:border-white/20 transition-colors flex items-center gap-1.5"
              aria-label="Email"
            >
              <Mail className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Email</span>
            </button>
          </div>
          <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
          {canDeleteRejected && (
            <button
              type="button"
              onClick={onDelete}
              disabled={submitting}
              className="w-full sm:w-auto px-4 py-2 text-[12px] font-bold text-danger border border-danger/30 bg-danger-soft/40 hover:bg-danger-soft rounded-full transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete PR
            </button>
          )}
          {canAssignRfqAuthor && (
            <button
              type="button"
              onClick={() => setAssignOpen(true)}
              className="w-full sm:w-auto px-4 py-2 text-[12px] font-bold text-text border border-border rounded-full bg-surface-container-low/60 hover:border-white/20 transition-colors flex items-center justify-center gap-1.5"
            >
              <UserPlus className="h-3.5 w-3.5" />
              {assignedAuthor ? "Reassign RFQ author" : "Assign RFQ author"}
            </button>
          )}
          {canAct ? (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              disabled={submitting}
              className="w-full sm:w-auto px-5 py-2 text-[12px] font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-full transition-all shadow-sm disabled:opacity-60"
            >
              Update Status
            </button>
          ) : pr.status === "pending" && pr.chain_stage !== "done" ? (
            <div
              className="px-3 py-2 text-[11px] font-semibold text-text-muted bg-surface-container-low/60 border border-border rounded-full text-center sm:text-left"
              title={
                isApproverRole
                  ? `Waiting on ${stageRole} approval. Your role (${userRole ?? "guest"}) cannot act on this stage.`
                  : "Your request is pending approval"
              }
            >
              {isApproverRole ? (
                <>
                  Awaiting{" "}
                  <span className="text-warning font-bold">{stageRole}</span>
                  {canCancel && " — you may cancel"}
                </>
              ) : (
                <>
                  <span className="text-warning font-bold">Pending review</span>
                  {canCancel && " — you may cancel"}
                </>
              )}
            </div>
          ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6 print:block">
        <div className="xl:col-span-8 space-y-4 sm:space-y-6">
          <section className="glass-card rounded-2xl p-3 sm:p-6 print-reset">
            <h2 className="text-sm font-semibold text-text mb-4 sm:mb-5 flex items-center gap-2">
              <Info className="h-4 w-4 text-text-muted print:hidden" strokeWidth={2} />
              Request Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 sm:gap-x-8 gap-y-4 sm:gap-y-6 print-meta-grid">
              <MetaField label="Requester" value={pr.requester_name} />
              <MetaField label="Region" value={pr.region} />
              <MetaField label="Company" value={pr.business_unit} />
              <MetaField label="Customer" value={pr.customer} />
              <MetaField label="Department" value={pr.department} />
              <MetaField label="Project" value={pr.project} />
              <MetaField label="Delivery Location" value={pr.delivery_location} />
              <MetaField label="Site Name" value={pr.site_name} />
              <MetaField label="Priority" value={pr.priority} />
              <div>
                <MetaField
                  label="PR Date"
                  value={formatDate(pr.created_at)}
                />
              </div>
              <div>
                <MetaField
                  label="Expected Date"
                  value={formatDate(pr.expected_date)}
                />
              </div>
              {!isEmpty(pr.justification) && (
                <div className="md:col-span-2 pt-2 border-t border-border">
                  <MetaField label="Justification" value={pr.justification} />
                </div>
              )}
            </div>
          </section>

          <section className="glass-card rounded-2xl overflow-hidden print-reset">
            <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-border flex justify-between items-center print:p-0 print:border-0 print:mb-2">
              <h2 className="text-sm font-semibold text-text flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-text-muted print:hidden" strokeWidth={2} />
                Items
              </h2>
              <span className="text-xs text-text-muted print:text-[8pt]">
                {items.length} line{items.length === 1 ? "" : "s"}
              </span>
            </div>
            {items.length === 0 ? (
              <div className="px-6 py-12 text-center text-text-muted text-sm">
                No items recorded on this PR.
              </div>
            ) : (
              <>
              {/* Mobile cards — cleaner than horizontal-scroll table on phones */}
              <div className="md:hidden divide-y divide-border print:hidden">
                {items.map((it, idx) => {
                  const specEntries = it.specs && typeof it.specs === "object"
                    ? Object.entries(it.specs).filter(
                        ([, v]) => v != null && String(v).trim() !== "",
                      )
                    : [];
                  const hasSpecs = specEntries.length > 0 || (it.specs_text && it.specs_text.trim());
                  const rowKey = it.id ?? it.code ?? idx;
                  return (
                    <div key={rowKey} className="px-4 py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-text-muted">#{idx + 1}</span>
                            <span className="font-semibold text-text text-sm truncate">
                              {display(it.name)}
                            </span>
                          </div>
                          {!isEmpty(it.code) && (
                            <div className="text-xs text-info font-mono mt-0.5">
                              {it.code}
                              {!isEmpty(it.hsn_code) && (
                                <span className="text-text-muted"> · HSN {it.hsn_code}</span>
                              )}
                            </div>
                          )}
                          {!isEmpty(it.description) && (
                            <div className="text-xs text-text-muted mt-1 line-clamp-2">
                              {it.description}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-base font-bold text-text tabular-nums">
                            {Number(it.qty ?? 0)}
                          </div>
                          <div className="text-[10px] uppercase tracking-wider text-text-muted">
                            {display(it.uom)}
                          </div>
                        </div>
                      </div>
                      {hasSpecs && (
                        <details className="mt-2 group">
                          <summary className="text-[10px] font-bold text-info uppercase tracking-wider cursor-pointer select-none flex items-center gap-1 list-none [&::-webkit-details-marker]:hidden">
                            Specs
                            <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                          </summary>
                          <div className="mt-2 pl-2 border-l-2 border-info/30 space-y-1">
                            {specEntries.map(([k, v]) => (
                              <div key={k} className="text-xs flex gap-2">
                                <span className="text-text-muted font-semibold w-20 shrink-0">{k}</span>
                                <span className="text-text">{v}</span>
                              </div>
                            ))}
                            {it.specs_text && it.specs_text.trim() && (
                              <p className="text-xs text-text-muted italic">{it.specs_text}</p>
                            )}
                          </div>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto print:block">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low text-xs font-semibold text-text-muted uppercase tracking-wider">
                      <th className="px-6 py-4 w-12">#</th>
                      <th className="px-6 py-4">Item Name</th>
                      <th className="px-6 py-4">Item Code</th>
                      <th className="px-6 py-4">HSN</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4 text-right">UOM</th>
                      <th className="px-6 py-4 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {items.map((it, idx) => {
                      const specEntries = it.specs && typeof it.specs === "object"
                        ? Object.entries(it.specs).filter(
                            ([, v]) => v != null && String(v).trim() !== "",
                          )
                        : [];
                      const hasSpecs = specEntries.length > 0 || (it.specs_text && it.specs_text.trim());
                      const rowKey = it.id ?? it.code ?? idx;
                      return (
                        <Fragment key={rowKey}>
                          <tr className="border-b border-border hover:bg-surface-container-low">
                            <td className="px-6 py-4 text-text-muted align-top">{idx + 1}</td>
                            <td className="px-6 py-4 font-medium text-text align-top">
                              {display(it.name)}
                            </td>
                            <td className="px-6 py-4 font-medium text-info align-top">
                              {display(it.code)}
                            </td>
                            <td className="px-6 py-4 text-text-muted font-mono align-top">
                              {display(it.hsn_code)}
                            </td>
                            <td className="px-6 py-4 text-text-muted align-top">
                              {display(it.description)}
                            </td>
                            <td className="px-6 py-4 text-right text-text-muted align-top">
                              {display(it.uom)}
                            </td>
                            <td className="px-6 py-4 text-right font-medium text-text align-top">
                              {Number(it.qty ?? 0)}
                            </td>
                          </tr>
                          {hasSpecs && (
                            <tr className="border-b border-border bg-surface-container/30">
                              <td colSpan={7} className="px-6 py-3">
                                <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
                                  Specifications
                                </div>
                                {specEntries.length > 0 && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5 mb-2">
                                    {specEntries.map(([k, v]) => (
                                      <div key={k} className="text-xs flex">
                                        <span className="text-text-muted font-semibold w-32 shrink-0">
                                          {k}
                                        </span>
                                        <span className="text-text">{v}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {it.specs_text && it.specs_text.trim() && (
                                  <p className="text-xs text-text-muted italic">
                                    {it.specs_text}
                                  </p>
                                )}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </section>

          {/* PR attachments — embedded in the show response now (no extra
              round-trip on page load). New uploads still hit the API. */}
          <PrAttachmentsSection prNumber={pr.number} initialDocs={pr.documents ?? []} />
        </div>

        <div className="xl:col-span-4 space-y-4 sm:space-y-6 print:mt-6">
          {!isApproverRole ? (
            <RequesterStatusPanel pr={pr} />
          ) : (
          <ApprovalTree
            pr={pr}
            canSeeComment={APPROVER_ROLES.has(user?.role)}
          />
          )}
        </div>
      </div>

      {/* Print-only footer with signature blocks */}
      <div className="print-only mt-8 pt-6 border-t border-gray-300">
        <div className="grid grid-cols-3 gap-8 mb-8">
          <div>
            <div className="border-b border-black pb-8"></div>
            <div className="text-[8pt] uppercase tracking-[0.1em] font-bold text-gray-600 mt-1">
              Prepared By
            </div>
            <div className="text-[9pt] mt-0.5">
              {pr.requester_name ?? "—"}
            </div>
          </div>
          <div>
            <div className="border-b border-black pb-8"></div>
            <div className="text-[8pt] uppercase tracking-[0.1em] font-bold text-gray-600 mt-1">
              Approved By ({stageRole})
            </div>
            <div className="text-[9pt] text-gray-500 mt-0.5">Signature &amp; Date</div>
          </div>
          <div>
            <div className="border-b border-black pb-8"></div>
            <div className="text-[8pt] uppercase tracking-[0.1em] font-bold text-gray-600 mt-1">
              Finance / Stamp
            </div>
            <div className="text-[9pt] text-gray-500 mt-0.5">Signature &amp; Date</div>
          </div>
        </div>
        <div className="flex items-center justify-between text-[7pt] text-gray-500 uppercase tracking-[0.1em]">
          <span>Generated by Suppliers First · Meka Group</span>
          <span>Document: {pr.number}</span>
        </div>
      </div>

      {modalOpen && (
        <UpdateStatusModal
          prNumber={pr.number}
          stage={stageLabel}
          requester={pr.requester_name ?? "—"}
          onClose={() => setModalOpen(false)}
          onSubmit={onStatusSubmit}
        />
      )}

      <AssignAuthorModal
        open={assignOpen}
        title="Assign RFQ author"
        description={`Pick a purchase officer to draft the RFQ for ${pr.number}.`}
        currentAssigneeId={assignedAuthor?.id}
        onClose={() => setAssignOpen(false)}
        onSubmit={onAssignSubmit}
      />
    </div>
  );
}

// Quick kind hint from name + mime type — used to show the right icon
// while the blob is still loading.
function detectKindByName(doc) {
  const m = doc.mime_type ?? "";
  const n = (doc.original_name ?? "").toLowerCase();
  if (m.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg|bmp)$/.test(n)) return "image";
  if (m === "application/pdf" || /\.pdf$/.test(n)) return "pdf";
  return "other";
}

// ── PR attachments — inline thumbnails + click-to-preview + upload ──────────
// `initialDocs` comes from the bundled /api/prs/{n} response, so the section
// renders with zero extra round-trips on page load. We refetch only after
// uploads (when the doc list legitimately changed).
function PrAttachmentsSection({ prNumber, initialDocs }) {
  const toast = useToast();
  const [docs, setDocs] = useState(() => Array.isArray(initialDocs) ? initialDocs : []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewing, setPreviewing] = useState(null);
  const fileInputRef = useRef(null);

  const reload = async () => {
    setLoading(true);
    try {
      const d = await prDocumentsApi.list(prNumber);
      setDocs(Array.isArray(d) ? d : []);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message ?? "Couldn't load attachments");
    } finally { setLoading(false); }
  };

  // Sync when the parent's pr.documents changes (e.g. on refetch). Skip the
  // separate /api/pr-documents fetch — the bundled response already has them.
  useEffect(() => {
    if (Array.isArray(initialDocs)) setDocs(initialDocs);
  }, [initialDocs]);

  const openPreview = async (doc) => {
    // Open modal immediately with a loading state so the user gets feedback,
    // then swap in the blob URL when the fetch completes.
    setPreviewing({ url: null, name: doc.original_name, kind: detectKindByName(doc) });
    try {
      const blob = await prDocumentsApi.getBlob(doc.id);
      const url = URL.createObjectURL(blob);
      const kind = blob.type === "application/pdf" ? "pdf"
        : blob.type?.startsWith("image/") ? "image" : "other";
      setPreviewing({ url, name: doc.original_name, kind });
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Couldn't open preview");
      setPreviewing(null);
    }
  };
  const closePreview = () => {
    if (previewing?.url) URL.revokeObjectURL(previewing.url);
    setPreviewing(null);
  };
  const downloadDoc = (doc) => prDocumentsApi.download(doc.id, doc.original_name);

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("File must be ≤ 10 MB"); return; }
    setUploading(true);
    try {
      await prDocumentsApi.upload({ pr_number: prNumber, file });
      toast.success(`${file.name} uploaded`);
      await reload();
    } catch (err) {
      const msg = err?.response?.data?.message
        ?? Object.values(err?.response?.data?.errors ?? {}).flat().join(", ")
        ?? "Upload failed";
      toast.error(msg);
    } finally { setUploading(false); }
  };

  return (
    <section className="glass-card rounded-2xl overflow-hidden">
      <header className="px-4 sm:px-5 py-3 sm:py-4 border-b border-border flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-text-muted" />
          Attachments
          <span className="text-xs font-normal text-text-muted">
            {loading ? "…" : `(${docs.length})`}
          </span>
        </h2>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv"
          onChange={onPick}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-border rounded-md hover:border-primary hover:text-primary disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
          {uploading ? "Uploading…" : "Add file"}
        </button>
      </header>

      {loading ? (
        <div className="p-8 text-center text-text-muted text-sm flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading attachments…
        </div>
      ) : error ? (
        <div className="p-6 text-sm text-danger bg-danger-soft/40 border-t border-danger/30">
          {error}
        </div>
      ) : docs.length === 0 ? (
        <div className="p-8 text-center text-sm text-text-muted">
          No files attached yet. Use <span className="font-semibold text-text">Add file</span> above to attach an image, PDF, or spreadsheet.
        </div>
      ) : (
        <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {docs.map((d) => (
            <PrAttachmentCard
              key={d.id}
              doc={d}
              onPreview={() => openPreview(d)}
              onDownload={() => downloadDoc(d)}
            />
          ))}
        </div>
      )}

      {previewing && (
        <DocumentPreviewModal
          url={previewing.url}
          name={previewing.name}
          kind={previewing.kind}
          onClose={closePreview}
        />
      )}
    </section>
  );
}

function PrAttachmentCard({ doc, onPreview, onDownload }) {
  const isImage = doc.mime_type?.startsWith("image/")
    || /\.(png|jpe?g|webp|gif|svg)$/i.test(doc.original_name ?? "");
  const isPdf   = doc.mime_type === "application/pdf"
    || /\.pdf$/i.test(doc.original_name ?? "");

  // Thumbnails are LAZY now — we don't pre-fetch the blob just to show a
  // small preview tile (one round-trip per attachment was the source of
  // the "page feels slow" complaint). Render a typed placeholder; the full
  // file is only fetched when the user actually opens the Preview modal.
  return (
    <div className="rounded-lg border border-border bg-surface-container-low/40 overflow-hidden flex flex-col">
      <button
        type="button"
        onClick={onPreview}
        className="group relative h-36 bg-surface-container-low overflow-hidden flex flex-col items-center justify-center cursor-pointer gap-2"
      >
        {isImage ? (
          <ImageIcon className="h-10 w-10 text-text-subtle" />
        ) : isPdf ? (
          <FileText className="h-10 w-10 text-danger/70" />
        ) : (
          <FileWarning className="h-10 w-10 text-text-subtle" />
        )}
        <span className="text-[10px] font-bold uppercase tracking-widest text-text-subtle">
          {isImage ? "Image" : isPdf ? "PDF" : "File"}
        </span>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-bg/95 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 shadow-lg">
            <Eye className="h-3.5 w-3.5" /> Preview
          </div>
        </div>
      </button>
      <div className="p-3 border-t border-border flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-text truncate">{doc.original_name}</div>
          <div className="text-[10px] text-text-muted">
            {(Number(doc.size_bytes) / 1024).toFixed(1)} KB
            {doc.uploaded_at && <> · {new Date(doc.uploaded_at).toLocaleDateString()}</>}
          </div>
        </div>
        <button
          type="button"
          onClick={onDownload}
          className="p-1.5 rounded-md text-text-muted hover:text-primary hover:bg-surface-container-low"
          title="Download"
          aria-label="Download"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
