import { useState } from "react";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useAuthStore } from "../../auth/store.js";
import { useToast } from "../../../hooks/useToast.jsx";
import client from "../../../api/client.js";

/**
 * Admin-only panel on the PO Detail page that lets an admin overrule the
 * vendor's accept / reject decision (or reset it back to pending). Posts to
 * `POST /api/pos/{number}/admin-vendor-override` which is admin-gated on
 * the backend and tags every entry with `admin_override: true` in the
 * approval_history audit trail.
 *
 * Renders nothing for non-admin users OR when the PO is fulfilled (delivered
 * POs aren't candidates for vendor-decision override — use GRN flow for that).
 *
 * UX:
 *   1. Three action buttons surface relevant to the current status — e.g.
 *      a rejected PO shows "Force Accept" + "Reset to Pending".
 *   2. Clicking any button reveals an inline confirm row with a REQUIRED
 *      reason textarea (audit-trail value is zero if the comment is empty).
 *   3. Submit fires the API, calls `onUpdated(updatedPo)` so the parent
 *      page state refreshes.
 */
export default function AdminVendorOverridePanel({ po, onUpdated }) {
  const user = useAuthStore((s) => s.user);
  const toast = useToast();
  const [pendingAction, setPendingAction] = useState(null); // 'accept' | 'reject' | 'reset'
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!po) return null;
  if (user?.role !== "admin") return null;
  // Fulfilled POs are post-delivery — vendor decision is moot. Don't render.
  if (po.status === "fulfilled") return null;

  const canForceAccept = po.status !== "accepted";
  const canForceReject = po.status !== "rejected";
  const canReset = po.status === "accepted" || po.status === "rejected";

  const ACTION_META = {
    accept: {
      label: "Force Accept",
      Icon: CheckCircle2,
      tone: "success",
      title: "Force-accept the PO on behalf of the vendor",
      confirmLabel: "Force Accept",
    },
    reject: {
      label: "Force Reject",
      Icon: XCircle,
      tone: "danger",
      title: "Force-reject the PO on behalf of the vendor",
      confirmLabel: "Force Reject",
    },
    reset: {
      label: "Reset to Pending",
      Icon: RotateCcw,
      tone: "warning",
      title: "Clear the vendor decision so they can act again",
      confirmLabel: "Reset",
    },
  };

  const submit = async () => {
    if (!pendingAction || !reason.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await client.post(
        `/pos/${po.number}/admin-vendor-override`,
        { action: pendingAction, comment: reason.trim() },
      );
      const updated = res.data?.data ?? res.data;
      toast.success(`Vendor decision overridden`);
      setPendingAction(null);
      setReason("");
      onUpdated?.(updated);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Override failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm view
  if (pendingAction) {
    const meta = ACTION_META[pendingAction];
    const ToneIcon = meta.Icon;
    const toneCls = {
      success: "border-success/30 bg-success-soft/50",
      danger: "border-danger/30 bg-danger-soft/50",
      warning: "border-warning/30 bg-warning-soft/50",
    }[meta.tone];
    const btnCls = {
      success: "bg-success hover:brightness-110 text-white",
      danger: "bg-danger hover:brightness-110 text-white",
      warning: "bg-warning hover:brightness-110 text-white",
    }[meta.tone];

    return (
      <div className={`rounded-2xl border p-4 ${toneCls}`}>
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-surface-container-lowest flex items-center justify-center shrink-0">
            <ToneIcon className={`h-4 w-4 ${meta.tone === "success" ? "text-success" : meta.tone === "danger" ? "text-danger" : "text-warning"}`} strokeWidth={2.25} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-text">
              {meta.label} — confirm with a reason
            </div>
            <div className="text-[11px] text-text-muted mt-0.5 inline-flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" />
              This is an admin override. The reason will be saved to the
              audit trail and visible to every reviewer.
            </div>
          </div>
        </div>
        <textarea
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder={
            pendingAction === "accept"
              ? "Why are you accepting on the vendor's behalf?"
              : pendingAction === "reject"
                ? "Why are you rejecting on the vendor's behalf?"
                : "Why are you resetting the vendor decision?"
          }
          className="w-full bg-surface-container-lowest border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-text-subtle outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none"
        />
        {!reason.trim() && (
          <p className="text-[11px] text-text-muted mt-1.5 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            A reason is required.
          </p>
        )}
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setPendingAction(null);
              setReason("");
            }}
            disabled={submitting}
            className="px-4 py-2 text-[12px] font-semibold text-text-muted border border-border bg-surface-container-low/60 rounded-full hover:text-text disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!reason.trim() || submitting}
            className={`px-5 py-2 text-[12px] font-bold rounded-full transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${btnCls}`}
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ToneIcon className="h-3.5 w-3.5" />
            )}
            {submitting ? "Saving…" : meta.confirmLabel}
          </button>
        </div>
      </div>
    );
  }

  // Default view — three action buttons depending on current status
  return (
    <div className="rounded-2xl border border-warning/30 bg-warning-soft/30 p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-warning-soft text-warning flex items-center justify-center shrink-0">
          <ShieldAlert className="h-4 w-4" strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-text inline-flex items-center gap-2 flex-wrap">
            Admin override — vendor decision
            <span className="text-[9px] uppercase tracking-[0.18em] font-bold text-warning bg-warning-soft px-1.5 py-0.5 rounded border border-warning/30">
              Admin only
            </span>
          </div>
          <p className="text-[11.5px] text-text-muted mt-0.5">
            Overrule what the vendor said (or didn't say). All overrides are
            tagged in the audit history. Current status:{" "}
            <span className="font-bold text-text capitalize">{po.status}</span>.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 ml-12">
        {canForceAccept && (
          <button
            type="button"
            onClick={() => setPendingAction("accept")}
            className="px-3 py-1.5 text-[12px] font-semibold rounded-full border border-success/30 bg-success-soft text-success hover:bg-success/15 transition-colors inline-flex items-center gap-1.5"
            title={ACTION_META.accept.title}
          >
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />
            Force Accept
          </button>
        )}
        {canForceReject && (
          <button
            type="button"
            onClick={() => setPendingAction("reject")}
            className="px-3 py-1.5 text-[12px] font-semibold rounded-full border border-danger/30 bg-danger-soft text-danger hover:bg-danger/15 transition-colors inline-flex items-center gap-1.5"
            title={ACTION_META.reject.title}
          >
            <XCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
            Force Reject
          </button>
        )}
        {canReset && (
          <button
            type="button"
            onClick={() => setPendingAction("reset")}
            className="px-3 py-1.5 text-[12px] font-semibold rounded-full border border-border bg-surface-container-low/60 text-text-muted hover:text-text hover:border-white/20 transition-colors inline-flex items-center gap-1.5"
            title={ACTION_META.reset.title}
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.5} />
            Reset to Pending
          </button>
        )}
      </div>
    </div>
  );
}
