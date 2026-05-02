import { useEffect, useState } from "react";
import {
  MessageSquare,
  Star,
  Loader2,
  Trash2,
  Send,
  AlertCircle,
} from "lucide-react";
import { useVendorFeedbackStore } from "../store.js";
import { useAuthStore } from "../../auth/store.js";
import { useToast } from "../../../hooks/useToast.jsx";

// Stable empty array — Zustand selector trap if returned literal.
const EMPTY = Object.freeze([]);

/**
 * Vendor feedback card — embeds anywhere a vendor name is in scope (PO
 * Detail, future vendor-master detail, etc.).
 *
 * Anyone in-org can post. Vendors can't see this surface (backend returns
 * empty list for them anyway). Author or admin can delete.
 *
 * Props:
 *   vendorName  — required
 *   poNumber    — optional context tag stored with the row
 *   compact     — tighter spacing for embedding inside another card
 */
function StarPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = value && n <= value;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? null : n)}
            className={`p-1.5 rounded transition-colors ${
              active
                ? "text-warning"
                : "text-text-subtle hover:text-warning/70"
            }`}
            aria-label={`Rate ${n} star${n === 1 ? "" : "s"}`}
          >
            <Star
              className="h-5 w-5"
              fill={active ? "currentColor" : "none"}
              strokeWidth={2}
            />
          </button>
        );
      })}
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="ml-2 text-[10px] uppercase tracking-widest font-bold text-text-muted hover:text-text"
        >
          clear
        </button>
      )}
    </div>
  );
}

function StarsDisplay({ value }) {
  if (!value) return null;
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${n <= value ? "text-warning" : "text-text-subtle"}`}
          fill={n <= value ? "currentColor" : "none"}
          strokeWidth={2}
        />
      ))}
    </div>
  );
}

function fmtDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function VendorFeedbackCard({
  vendorName,
  poNumber,
  compact = false,
}) {
  const rows = useVendorFeedbackStore((s) =>
    vendorName ? (s.byVendor[vendorName] ?? EMPTY) : EMPTY,
  );
  const fetchForVendor = useVendorFeedbackStore((s) => s.fetchForVendor);
  const create = useVendorFeedbackStore((s) => s.create);
  const remove = useVendorFeedbackStore((s) => s.remove);
  const user = useAuthStore((s) => s.user);
  const toast = useToast();

  const [rating, setRating] = useState(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (vendorName) fetchForVendor(vendorName).catch(() => {});
  }, [vendorName, fetchForVendor]);

  const isInOrg = user && user.role !== "vendor";
  const isAdmin = user?.role === "admin";

  const handleSubmit = async () => {
    setError(null);
    if (comment.trim().length < 3) {
      setError("Tell us a little more — at least 3 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await create({
        vendor_name: vendorName,
        po_number: poNumber ?? null,
        rating,
        comment: comment.trim(),
      });
      toast.success("Feedback submitted");
      setRating(null);
      setComment("");
    } catch (err) {
      const msg =
        err?.response?.data?.errors?.comment?.[0] ??
        err?.response?.data?.message ??
        "Could not submit feedback";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm("Delete this feedback?")) return;
    try {
      await remove(vendorName, row.id);
      toast.success("Feedback removed");
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Could not delete");
    }
  };

  const canDeleteRow = (row) =>
    isAdmin || (user?.id != null && row.user_id === user.id);

  // For vendor sessions, the backend returns empty + posting is blocked.
  // Hide the card entirely so vendors don't see a non-functional surface.
  if (!isInOrg) return null;

  return (
    <section className="bg-surface-container-lowest border border-border rounded-lg overflow-hidden">
      <header
        className={`flex items-center justify-between gap-2 ${compact ? "px-4 py-3" : "px-5 py-4"} border-b border-border bg-surface-container-low/40`}
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-text-muted" strokeWidth={2.25} />
          <h2 className="text-sm font-bold uppercase tracking-wider text-text">
            Vendor Feedback
          </h2>
          <span className="text-[10px] uppercase tracking-widest font-bold text-text-muted">
            {rows.length} {rows.length === 1 ? "entry" : "entries"}
          </span>
        </div>
      </header>

      {/* Inline form */}
      <div className={`${compact ? "p-4" : "p-5"} border-b border-border space-y-3`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-text-muted mb-1.5">
              Overall rating (optional)
            </label>
            <StarPicker value={rating} onChange={setRating} />
          </div>
          {poNumber && (
            <div className="text-[10px] uppercase tracking-widest font-bold text-text-muted">
              For PO{" "}
              <span className="font-mono text-info normal-case tracking-normal">
                {poNumber}
              </span>
            </div>
          )}
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-widest font-bold text-text-muted mb-1.5">
            Comment
          </label>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={`Share your experience with ${vendorName}…`}
            className="w-full rounded-lg px-3.5 py-2.5 text-sm bg-surface-container-lowest border border-border text-text focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
          />
        </div>
        {error && (
          <div className="flex items-start gap-2 text-xs text-danger bg-danger-soft/40 border border-danger/30 rounded-md px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            {error}
          </div>
        )}
        <div className="flex items-center justify-end gap-2">
          {(comment || rating) && !submitting && (
            <button
              type="button"
              onClick={() => {
                setComment("");
                setRating(null);
                setError(null);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-text rounded-md hover:bg-surface-container-low"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || comment.trim().length < 3}
            className="px-4 py-2 text-sm font-bold text-primary-foreground bg-primary hover:bg-primary-hover rounded-md disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {submitting ? "Posting…" : "Post Feedback"}
          </button>
        </div>
      </div>

      {/* Existing entries */}
      <div>
        {rows.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-text-muted">
            No feedback yet for {vendorName}. Be the first to leave one.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <li
                key={row.id}
                className={`${compact ? "px-4 py-3.5" : "px-5 py-4"} hover:bg-surface-container-low/40`}
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-text text-sm">
                      {row.author?.name ?? "Someone"}
                    </span>
                    {row.author?.role && (
                      <span className="text-[10px] uppercase tracking-widest font-bold text-text-muted bg-surface-container-high px-1.5 py-0.5 rounded">
                        {row.author.role}
                      </span>
                    )}
                    {row.rating && <StarsDisplay value={row.rating} />}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-text-subtle">
                      {fmtDateTime(row.created_at)}
                    </span>
                    {canDeleteRow(row) && (
                      <button
                        type="button"
                        onClick={() => handleDelete(row)}
                        className="p-1 rounded text-text-muted hover:text-danger hover:bg-danger-soft/40"
                        title="Delete"
                        aria-label="Delete feedback"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-text whitespace-pre-line leading-relaxed">
                  {row.comment}
                </p>
                {row.po_number && (
                  <div className="text-[11px] text-text-subtle mt-1.5">
                    Tied to PO{" "}
                    <span className="font-mono">{row.po_number}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
