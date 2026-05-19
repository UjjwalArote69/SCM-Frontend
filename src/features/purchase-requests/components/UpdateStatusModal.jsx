import { useState } from "react";
import { X, Ban, AlertCircle, User, AlertTriangle, ShieldAlert } from "lucide-react";

const ACTIONS = [
  { value: "approve", label: "Approve", helper: "Move to next stage" },
  { value: "hold", label: "Hold", helper: "Request additional info" },
  { value: "reject", label: "Reject", helper: "Deny request permanently", danger: true },
  { value: "cancel", label: "Cancel", helper: "Close request as void" },
];

const COMMENTS_REQUIRED_FOR = new Set(["reject", "hold"]);
// Actions that get a confirm step before they fire. Approve / reject / cancel
// all flip the PR into a different state, so the second click prevents
// mis-clicks. Hold is non-destructive (PR stays pending) so it submits
// directly.
const CONFIRM_REQUIRED_FOR = new Set(["approve", "reject", "cancel"]);

export default function UpdateStatusModal({
  prNumber,
  stage = "CFO REVIEW",
  requester = "Sarah Jenkins",
  isOverride = false,
  currentStatus = "pending",
  onClose,
  onSubmit,
}) {
  const [action, setAction] = useState("");
  const [comments, setComments] = useState("");
  const [notify, setNotify] = useState(true);
  const [touched, setTouched] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const needsComments = COMMENTS_REQUIRED_FOR.has(action);
  const needsConfirm = CONFIRM_REQUIRED_FOR.has(action);
  const commentsError = touched && needsComments && !comments.trim();
  const canSubmit = action && !commentsError && (!needsComments || comments.trim());

  const handleSubmit = () => {
    setTouched(true);
    if (!action) return;
    if (needsComments && !comments.trim()) return;
    // First click on a confirm-required action arms it. Second click fires.
    // Hold is non-destructive so it submits directly.
    if (needsConfirm && !confirming) {
      setConfirming(true);
      return;
    }
    onSubmit?.({ action, comments: comments.trim(), notify });
  };

  // Resetting the action also resets the confirming state so users don't
  // get stuck with a confirm-armed state for a different action.
  const handleActionChange = (value) => {
    setAction(value);
    setConfirming(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-status-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="w-full max-w-[560px] bg-surface-container-lowest rounded-lg shadow-xl border border-border overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-border flex justify-between items-center bg-surface">
          <div className="min-w-0">
            <h2
              id="update-status-title"
              className="text-lg font-bold text-text tracking-tight"
            >
              {isOverride ? "Admin override" : "Update PR Status"} — {prNumber}
            </h2>
            {isOverride && (
              <p className="text-[11px] text-warning font-medium mt-0.5 inline-flex items-center gap-1">
                <ShieldAlert className="h-3 w-3" />
                This PR is currently {currentStatus}. Your action will be
                logged as an admin override.
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="text-text-muted hover:text-text transition-colors shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-6 flex flex-col gap-6 overflow-y-auto">
          <div className="flex items-center gap-4 p-4 bg-surface-container-low rounded-md">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-info-soft text-info uppercase tracking-wider">
              {stage}
            </span>
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <User className="h-4 w-4" />
              <span>
                Requester:{" "}
                <strong className="text-text font-medium">{requester}</strong>
              </span>
            </div>
          </div>

          <fieldset>
            <legend className="text-sm font-semibold text-text mb-3">
              Action Required
            </legend>
            <div className="space-y-3">
              {ACTIONS.map((opt) => {
                const selected = action === opt.value;
                const base =
                  "relative flex cursor-pointer rounded-md p-4 transition-colors border";
                const cls = opt.danger
                  ? selected
                    ? "bg-danger-soft border-danger"
                    : "bg-danger-soft/50 border-danger/30 hover:bg-danger-soft"
                  : selected
                    ? "bg-surface-container border-primary"
                    : "bg-surface-container border-border hover:bg-surface-container-high";
                return (
                  <label key={opt.value} className={`${base} ${cls}`}>
                    <div className="flex items-center h-5">
                      <input
                        type="radio"
                        name="pr_action"
                        value={opt.value}
                        checked={selected}
                        onChange={() => handleActionChange(opt.value)}
                        className={`h-4 w-4 focus:ring-primary ${
                          opt.danger
                            ? "text-danger border-danger/40"
                            : "text-primary border-outline-variant"
                        }`}
                      />
                    </div>
                    <div className="ml-3 flex items-center gap-2">
                      {opt.danger && (
                        <Ban className="h-4 w-4 text-danger" />
                      )}
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
              htmlFor="pr-comments"
              className="block text-sm font-semibold text-text mb-2"
            >
              {action === "reject" ? "Rejection Reason" : "Comments"}
              {needsComments && <span className="text-danger"> *</span>}
            </label>
            {commentsError && (
              <p className="text-xs text-text-muted mb-3">
                Provide detailed justification for this decision.
              </p>
            )}
            <div className="relative">
              <textarea
                id="pr-comments"
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

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              className="h-4 w-4 rounded text-primary border-outline-variant focus:ring-primary"
            />
            <span className="text-sm font-medium text-text">
              Notify next approver
            </span>
          </label>
        </div>

        <div className="px-6 py-4 bg-surface border-t border-border flex justify-end gap-3 items-center">
          {confirming && (
            <span className="text-[11px] font-medium text-warning inline-flex items-center gap-1 mr-auto">
              <AlertTriangle className="h-3.5 w-3.5" />
              Click again to confirm this {action} action
            </span>
          )}
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
            className={`px-6 py-2 text-sm font-semibold text-primary-foreground rounded-md transition-colors disabled:bg-surface-container-high disabled:text-text-muted disabled:cursor-not-allowed inline-flex items-center gap-1.5 ${
              confirming
                ? "bg-warning hover:brightness-110 ring-2 ring-warning/30"
                : "bg-primary hover:bg-primary-hover"
            }`}
          >
            {confirming && <AlertTriangle className="h-3.5 w-3.5" />}
            {confirming ? `Confirm ${action}` : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
