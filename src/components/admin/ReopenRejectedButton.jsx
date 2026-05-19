import { useState } from "react";
import { RotateCcw, Loader2, AlertCircle } from "lucide-react";
import { useAuthStore } from "../../features/auth/store.js";
import { useToast } from "../../hooks/useToast.jsx";
import client from "../../api/client.js";

/**
 * Admin-only "Reopen" action — undoes a rejection on a PR / PO / GRN /
 * Invoice / Payment / RFQ so the chain can re-flow. Renders nothing unless
 * the current user is admin AND the record is in its rejected terminal
 * state. PR/PO/GRN/Invoice/Payment use status='rejected'; RFQs use
 * status='closed' — pass `rejectedStatus="closed"` for those.
 *
 * Props
 *   endpoint        — e.g. `/prs/PR-2026-0001/reopen` (passed to axios client)
 *   entityLabel     — human label for confirm/toast copy ("PR", "PO", "RFQ")
 *   onReopened      — callback invoked with the API's returned record on success
 *   status          — current record status
 *   rejectedStatus  — the status string that means "rejected" (default "rejected")
 *   className       — optional extra classes
 */
export default function ReopenRejectedButton({
  endpoint,
  entityLabel = "record",
  onReopened,
  status,
  rejectedStatus = "rejected",
  className = "",
}) {
  const user = useAuthStore((s) => s.user);
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState("");

  const isAdmin = user?.role === "admin";
  if (!isAdmin || status !== rejectedStatus) return null;

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await client.post(endpoint, { comments: comment.trim() || null });
      toast.success(`${entityLabel} reopened`);
      setOpen(false);
      setComment("");
      onReopened?.(res.data?.data ?? res.data);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Reopen failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-semibold border border-warning/30 bg-warning-soft text-warning hover:bg-warning/15 transition-colors ${className}`}
        title={`Undo this rejection so the ${entityLabel} chain can flow again`}
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reopen {entityLabel}
      </button>
    );
  }

  return (
    <div
      className={`flex flex-col gap-2 p-3 rounded-xl border border-warning/30 bg-warning-soft/40 ${className}`}
    >
      <div className="flex items-start gap-2 text-[12px] text-text">
        <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold">Reopen this {entityLabel}?</div>
          <div className="text-text-muted text-[11px] mt-0.5">
            It returns to the stage that rejected it. The reject + this reopen
            both stay in the audit history.
          </div>
        </div>
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Reason for reopening (optional but recommended)…"
        rows={2}
        className="w-full bg-surface-container-lowest border border-border rounded-md px-3 py-2 text-sm text-text placeholder:text-text-subtle outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
      />
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => { setOpen(false); setComment(""); }}
          disabled={submitting}
          className="px-3 py-1.5 text-[12px] font-semibold text-text-muted rounded-full border border-border bg-surface-container-low/60 hover:text-text disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="px-4 py-1.5 text-[12px] font-bold text-primary-foreground bg-warning hover:brightness-110 rounded-full transition-all flex items-center gap-1.5 disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" />
          )}
          {submitting ? "Reopening…" : "Reopen"}
        </button>
      </div>
    </div>
  );
}
