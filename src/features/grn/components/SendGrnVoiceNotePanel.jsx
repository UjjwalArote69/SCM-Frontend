import { useState } from "react";
import { Mic, Send, MessageSquare, Loader2, AlertCircle } from "lucide-react";
import VoiceRecorder from "../../../components/forms/VoiceRecorder.jsx";
import { useToast } from "../../../hooks/useToast.jsx";
import grnApi from "../api.js";

/**
 * Free-form voice / text note from the vendor (or admin) against a GRN.
 * Result is appended to approval_history so the VoiceNotesPanel above
 * + the activity timeline below pick it up automatically.
 */
export default function SendGrnVoiceNotePanel({ grnNumber, onSent }) {
  const [comment, setComment] = useState("");
  const [voiceNote, setVoiceNote] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();

  const trimmed = comment.trim();
  const hasContent = trimmed.length > 0 || !!voiceNote;

  const send = async () => {
    if (!hasContent || busy) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await grnApi.vendorNote(grnNumber, {
        comment: trimmed || null,
        voice_note: voiceNote || null,
      });
      setComment("");
      setVoiceNote(null);
      onSent?.(updated);
      toast.success("Voice note sent");
    } catch (err) {
      const msg = err?.response?.data?.message ?? "Could not send note";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="glass-card rounded-2xl overflow-hidden">
      <header className="flex items-center justify-between gap-2 px-5 py-4 border-b border-border bg-surface-container-low/40">
        <div className="flex items-center gap-2">
          <Mic className="h-4 w-4 text-primary" strokeWidth={2.25} />
          <h2 className="text-sm font-bold uppercase tracking-wider text-text">
            Send a voice note
          </h2>
        </div>
        <span className="text-[10px] uppercase tracking-widest font-semibold text-text-subtle">
          to site / PM
        </span>
      </header>

      <div className="p-5 space-y-3">
        <p className="text-xs text-text-muted">
          Speak or type a quick update on this delivery — useful if you'd
          rather talk than write. Site team, PM, HOD, CFO and CEO will see
          and hear it on this GRN.
        </p>

        <VoiceRecorder
          onTranscript={(text) => setComment(text)}
          onAudioChange={(b64) => setVoiceNote(b64)}
          disabled={busy}
          language="en-IN"
          maxSeconds={90}
        />

        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
          <MessageSquare className="h-3 w-3" /> Message
        </label>
        <textarea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={busy}
          placeholder="e.g. Replacement shipment dispatched today — tracking number 12345."
          className="w-full bg-surface-container-lowest border border-border focus:border-primary rounded-md px-3 py-2 text-sm text-text outline-none resize-none"
        />

        {error && (
          <div className="flex items-start gap-2 text-xs text-danger bg-danger-soft/40 border border-danger/30 rounded-md px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] text-text-subtle">
            {voiceNote && <span className="text-success font-semibold">Voice clip attached. </span>}
            {hasContent
              ? "Ready to send."
              : "Add a voice clip or some text first."}
          </div>
          <button
            type="button"
            onClick={send}
            disabled={!hasContent || busy}
            className="px-4 py-2 text-sm font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-md disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {busy ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </section>
  );
}
