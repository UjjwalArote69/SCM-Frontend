import { useEffect, useState } from "react";
import { Loader2, UserCheck, X } from "lucide-react";
import { userApi } from "../../features/purchase-requests/api.js";

/**
 * Modal used by the Purchase HOD to assign a purchase officer as the
 * RFQ-author (on a PR) or PO-author (on an RFQ). The modal owns its own
 * fetch of the purchase officer roster — caller just supplies the submit
 * handler and a label.
 *
 * Props:
 *   open                 — whether to render
 *   title                — heading copy ("Assign RFQ author")
 *   description          — optional secondary copy
 *   currentAssigneeId    — id of the currently assigned user (preselects)
 *   onClose()            — dismiss
 *   onSubmit(userId)     — async; the modal awaits, shows spinner, closes on resolve
 */
export default function AssignAuthorModal({
  open,
  title = "Assign author",
  description,
  currentAssigneeId,
  onClose,
  onSubmit,
}) {
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(currentAssigneeId ?? "");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    userApi
      .listPurchaseOfficers()
      .then((data) => {
        if (cancelled) return;
        setOfficers(data || []);
        // Preselect: existing assignee, else the first officer in the list
        const initial =
          currentAssigneeId &&
          (data || []).some((o) => o.id === currentAssigneeId)
            ? currentAssigneeId
            : data?.[0]?.id ?? "";
        setSelected(initial);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.response?.data?.message ?? "Could not load officers.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, currentAssigneeId]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await onSubmit(Number(selected));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface w-full sm:max-w-md rounded-t-2xl sm:rounded-xl border border-border shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-text flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" />
              {title}
            </h3>
            {description && (
              <p className="text-xs text-text-muted mt-1">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text p-1 rounded"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {loading ? (
            <div className="py-8 flex items-center justify-center text-text-muted">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading officers…
            </div>
          ) : error ? (
            <div className="text-sm text-danger bg-danger-soft/40 border border-danger/30 rounded-md px-3 py-2">
              {error}
            </div>
          ) : officers.length === 0 ? (
            <div className="text-sm text-text-muted text-center py-6">
              No purchase officers found. Ask an admin to create one.
            </div>
          ) : (
            <label className="block">
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5 block">
                Purchase Officer
              </span>
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="w-full rounded-lg px-3.5 py-3 sm:py-2.5 text-sm bg-surface-container-lowest border border-border text-text focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              >
                {officers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                    {o.department?.code ? ` · ${o.department.code}` : ""}
                    {" — "}
                    {o.email}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-surface-container-low/40 rounded-b-2xl sm:rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-text border border-border rounded-md hover:bg-surface-container-low disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || loading || !selected || officers.length === 0}
            className="px-4 py-2 text-sm font-bold text-primary-foreground bg-primary hover:bg-primary-hover rounded-md disabled:opacity-60 flex items-center gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Assigning…" : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );
}
