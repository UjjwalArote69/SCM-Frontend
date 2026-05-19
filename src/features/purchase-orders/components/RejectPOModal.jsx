import { useState } from "react";
import { X, AlertTriangle, MessageSquare, Loader2 } from "lucide-react";
import VoiceRecorder from "../../../components/forms/VoiceRecorder.jsx";

/**
 * Two-step reject confirmation for a PO. Vendor (or admin) must give a
 * reason — typed, spoken, or both. The blank-submit path is intentionally
 * blocked, matching the same pattern used on RFQ Hold/Reject.
 */
export default function RejectPOModal({ poNumber, onClose, onReject, busy = false }) {
  const [comment, setComment] = useState("");
  const [voiceNote, setVoiceNote] = useState(null);
  const [armed, setArmed] = useState(false);

  const trimmed = comment.trim();
  const hasReason = trimmed.length >= 3 || !!voiceNote;

  const handleSubmit = () => {
    if (!hasReason) return;
    if (!armed) {
      setArmed(true);
      return;
    }
    onReject?.({
      comment: trimmed || null,
      voice_note: voiceNote ?? null,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="w-full max-w-[560px] bg-surface-container-lowest rounded-lg shadow-xl border border-border overflow-hidden">
        <div className="px-6 py-5 border-b border-border flex justify-between items-center bg-surface">
          <h2 className="text-lg font-bold text-text">Reject {poNumber}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          <div className="flex items-start gap-3 p-3 bg-danger/10 text-danger rounded">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-sm leading-relaxed">
              Rejecting this PO is final — the buyer will need to issue a fresh
              order if they want to proceed. Please share a clear reason so they
              can fix it.
            </p>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              <MessageSquare className="h-3.5 w-3.5" />
              Reason for rejection
              <span className="text-danger normal-case font-normal tracking-normal">
                *
              </span>
              <span className="text-text-subtle normal-case font-normal tracking-normal">
                (speak or type)
              </span>
            </label>
            <VoiceRecorder
              onTranscript={(text) => setComment(text)}
              onAudioChange={(b64) => setVoiceNote(b64)}
              disabled={busy}
              language="en-IN"
              maxSeconds={90}
              className="mb-2"
            />
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={busy}
              placeholder="e.g. Item rate quoted is below our cost — please revise and reissue."
              className={`w-full bg-surface-container-low border focus:border-primary rounded-md px-3 py-2 text-sm text-text outline-none resize-none ${
                hasReason ? "border-border" : "border-warning/60"
              }`}
            />
            {!hasReason && (
              <p className="mt-1.5 text-[11.5px] text-warning flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Please add a short reason — at least a few words, or a voice note.
              </p>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-surface border-t border-border flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 text-sm font-medium text-text border border-border rounded-md hover:bg-surface-container-low"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!hasReason || busy}
            className={`px-6 py-2 text-sm font-bold rounded-md flex items-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
              armed
                ? "bg-danger text-white hover:brightness-110 ring-2 ring-danger/30"
                : "bg-danger/15 text-danger hover:bg-danger/25"
            }`}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy
              ? "Rejecting…"
              : armed
                ? "Confirm reject"
                : "Reject PO"}
          </button>
        </div>
      </div>
    </div>
  );
}
