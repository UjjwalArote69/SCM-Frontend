import { useState } from "react";
import { X, Package, MessageSquare } from "lucide-react";
import VoiceRecorder from "../../../components/forms/VoiceRecorder.jsx";

export default function AcceptPOModal({ poNumber, onClose, onAccept, busy = false }) {
  const [terms, setTerms] = useState(false);
  const [comment, setComment] = useState("");
  const [voiceNote, setVoiceNote] = useState(null);

  const handleAccept = () => {
    if (!terms) return;
    onAccept?.({
      comment: comment.trim() || null,
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
          <h2 className="text-lg font-bold text-text">Accept {poNumber}</h2>
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
          <div className="flex items-start gap-3 p-3 bg-info-soft text-info rounded">
            <Package className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-sm leading-relaxed">
              Confirm acceptance of this purchase order. Once accepted you
              commit to fulfilling it on the terms shown on the PO. The buyer
              is notified immediately.
            </p>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              <MessageSquare className="h-3.5 w-3.5" />
              Note to buyer
              <span className="text-text-subtle normal-case font-normal tracking-normal">
                (optional — speak or type)
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
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={busy}
              placeholder="e.g. Delivery in 5 working days, batch packed and ready for dispatch."
              className="w-full bg-surface-container-low border border-border focus:border-primary rounded-md px-3 py-2 text-sm text-text outline-none resize-none"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="h-4 w-4 mt-0.5 rounded text-primary border-outline-variant"
            />
            <span className="text-sm text-text">
              I have reviewed and accept the terms &amp; conditions of this
              purchase order.
            </span>
          </label>
        </div>
        <div className="px-6 py-4 bg-surface border-t border-border flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text border border-border rounded-md hover:bg-surface-container-low"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={!terms || busy}
            className="px-6 py-2 text-sm font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-md disabled:bg-surface-container-high disabled:text-text-muted disabled:cursor-not-allowed"
          >
            {busy ? "Accepting…" : "Accept PO"}
          </button>
        </div>
      </div>
    </div>
  );
}
