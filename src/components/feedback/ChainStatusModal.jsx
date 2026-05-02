import { useState } from "react";
import { X, Ban, AlertCircle } from "lucide-react";

/**
 * Generic "approve / hold / reject / …" modal used by any document with a
 * staged approval chain (PR, PO, eventually invoices). Actions are passed
 * in so each caller can express its own valid set.
 *
 * Props:
 *   open (default: true if mounted)
 *   title          — heading copy ("Update PO Status — PO-2026-8901")
 *   stageLabel     — chip text ("PURCHASE_HOD")
 *   actions        — [{ value, label, helper, danger?, requiresComment? }]
 *                    Defaults: approve / hold / reject (hold + reject require comment)
 *   onClose()
 *   onSubmit({ action, comments })
 */

const DEFAULT_ACTIONS = [
  { value: "approve", label: "Approve", helper: "Move to next stage" },
  { value: "hold", label: "Hold", helper: "Request additional info", requiresComment: true },
  {
    value: "reject",
    label: "Reject",
    helper: "Deny request permanently",
    danger: true,
    requiresComment: true,
  },
];

export default function ChainStatusModal({
  title,
  stageLabel,
  actions = DEFAULT_ACTIONS,
  onClose,
  onSubmit,
}) {
  const [action, setAction] = useState("");
  const [comments, setComments] = useState("");
  const [touched, setTouched] = useState(false);

  const selected = actions.find((a) => a.value === action);
  const needsComments = !!selected?.requiresComment;
  const commentsError = touched && needsComments && !comments.trim();
  const canSubmit = action && (!needsComments || comments.trim());

  const handleSubmit = () => {
    setTouched(true);
    if (!action) return;
    if (needsComments && !comments.trim()) return;
    onSubmit?.({ action, comments: comments.trim() });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="w-full max-w-[560px] bg-surface-container-lowest rounded-lg shadow-xl border border-border overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-border flex justify-between items-center bg-surface">
          <h2 className="text-lg font-bold text-text tracking-tight">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="text-text-muted hover:text-text transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-6 flex flex-col gap-6 overflow-y-auto">
          {stageLabel && (
            <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-md">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-info-soft text-info uppercase tracking-wider">
                {stageLabel}
              </span>
              <span className="text-xs text-text-muted">
                You're acting at this stage of the chain.
              </span>
            </div>
          )}

          <fieldset>
            <legend className="text-sm font-semibold text-text mb-3">
              Action Required
            </legend>
            <div className="space-y-3">
              {actions.map((opt) => {
                const isSelected = action === opt.value;
                const base =
                  "relative flex cursor-pointer rounded-md p-4 transition-colors border";
                const cls = opt.danger
                  ? isSelected
                    ? "bg-danger-soft border-danger"
                    : "bg-danger-soft/50 border-danger/30 hover:bg-danger-soft"
                  : isSelected
                    ? "bg-surface-container border-primary"
                    : "bg-surface-container border-border hover:bg-surface-container-high";
                return (
                  <label key={opt.value} className={`${base} ${cls}`}>
                    <div className="flex items-center h-5">
                      <input
                        type="radio"
                        name="chain_action"
                        value={opt.value}
                        checked={isSelected}
                        onChange={() => setAction(opt.value)}
                        className={`h-4 w-4 focus:ring-primary ${
                          opt.danger
                            ? "text-danger border-danger/40"
                            : "text-primary border-outline-variant"
                        }`}
                      />
                    </div>
                    <div className="ml-3 flex items-center gap-2">
                      {opt.danger && <Ban className="h-4 w-4 text-danger" />}
                      <div className="flex flex-col">
                        <span
                          className={`block text-sm font-medium ${
                            opt.danger ? "text-danger" : "text-text"
                          }`}
                        >
                          {opt.label}
                        </span>
                        <span className="block text-sm text-text-muted mt-0.5">
                          {opt.helper}
                        </span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div
            className={
              commentsError
                ? "bg-danger-soft p-4 -mx-4 rounded-lg border-l-4 border-danger"
                : ""
            }
          >
            <label
              htmlFor="chain-comments"
              className="block text-sm font-semibold text-text mb-2"
            >
              {action === "reject" ? "Rejection Reason" : "Comments"}
              {needsComments && <span className="text-danger"> *</span>}
            </label>
            <div className="relative">
              <textarea
                id="chain-comments"
                rows={3}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="Add a reason — required for reject/hold"
                className={`block w-full rounded-md px-3 py-2 text-sm text-text transition-colors resize-none bg-surface-container-lowest ${
                  commentsError
                    ? "border border-danger focus:ring-1 focus:ring-danger"
                    : "border-0 border-b-2 border-outline-variant focus:border-primary focus:ring-0"
                } outline-none`}
              />
              {commentsError && (
                <AlertCircle className="absolute top-3 right-3 h-4 w-4 text-danger pointer-events-none" />
              )}
            </div>
            {commentsError && (
              <p className="text-xs text-danger mt-1.5 font-medium">
                Reason is required for {action === "reject" ? "rejection" : "hold"}
              </p>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-surface border-t border-border flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text border border-border rounded-md hover:bg-surface-container-low transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-6 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary-hover transition-colors disabled:bg-surface-container-high disabled:text-text-muted disabled:cursor-not-allowed"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
