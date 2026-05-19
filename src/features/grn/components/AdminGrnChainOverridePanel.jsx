import { useMemo, useState } from "react";
import {
  ShieldAlert, RotateCcw, XCircle, CheckCircle2, ChevronDown,
  MessageSquare, Loader2, AlertTriangle,
} from "lucide-react";
import VoiceRecorder from "../../../components/forms/VoiceRecorder.jsx";
import { useToast } from "../../../hooks/useToast.jsx";
import grnApi from "../api.js";

/**
 * Admin-only chain override for a GRN.
 *
 * Lets the admin flip any approve / reject decision in the chain — including
 * post-CEO ones — by either rewinding to an earlier stage or force-rejecting
 * outright. Every change is reason-required, voice-recordable, and audited
 * with admin_override=true in approval_history.
 *
 * Collapsed by default so the page stays clean for everyday viewing; opens
 * with a single click. Two-click confirm on the destructive submit.
 */

const STAGES = [
  { key: "pending_pm",                  label: "PM Inspection" },
  { key: "pending_purchase_hod",        label: "Purchase HOD Approval" },
  { key: "pending_vendor_replacement",  label: "Vendor Agreement" },
  { key: "pending_finance_hod",         label: "Finance HOD Approval" },
  { key: "pending_cfo",                 label: "CFO Approval" },
  { key: "pending_ceo",                 label: "CEO Approval" },
  { key: "done",                        label: "Finalised" },
];

// Tailwind v4 needs literal class strings — we can't interpolate the tone.
const ACTIONS = [
  {
    key: "rewind",
    label: "Rewind chain",
    desc: "Move the GRN back to an earlier stage so it can be re-approved from there. Useful when a past approval was wrong.",
    Icon: RotateCcw,
    card:       "border-warning bg-warning-soft/40 ring-2 ring-warning/30",
    icon:       "text-warning",
    submitIdle: "bg-warning/15 text-warning hover:bg-warning/25",
    submitArmed:"bg-warning text-white hover:brightness-110 ring-2 ring-warning/30",
  },
  {
    key: "force_reject",
    label: "Force reject",
    desc: "Mark the GRN as rejected regardless of current state, flagging the chosen stage as the rejecter.",
    Icon: XCircle,
    card:       "border-danger bg-danger-soft/40 ring-2 ring-danger/30",
    icon:       "text-danger",
    submitIdle: "bg-danger/15 text-danger hover:bg-danger/25",
    submitArmed:"bg-danger text-white hover:brightness-110 ring-2 ring-danger/30",
  },
  {
    key: "force_approve",
    label: "Force approve (finalise)",
    desc: "Skip remaining stages and mark the GRN fully approved. Triggers PO auto-fulfilment as usual.",
    Icon: CheckCircle2,
    card:       "border-success bg-success-soft/40 ring-2 ring-success/30",
    icon:       "text-success",
    submitIdle: "bg-success/15 text-success hover:bg-success/25",
    submitArmed:"bg-success text-white hover:brightness-110 ring-2 ring-success/30",
  },
];

export default function AdminGrnChainOverridePanel({ grn, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState("rewind");
  const [toStage, setToStage] = useState("pending_pm");
  const [comment, setComment] = useState("");
  const [voiceNote, setVoiceNote] = useState(null);
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();

  const trimmed = comment.trim();
  const reasonOk = trimmed.length >= 3;
  // For force_approve we always send to_stage='done' server-side; the picker
  // is irrelevant. For force_reject the picked stage is the rejecter.
  const needsStagePicker = action !== "force_approve";

  const meta = useMemo(() => ACTIONS.find((a) => a.key === action), [action]);

  const submit = async () => {
    if (!reasonOk || busy) return;
    if (!armed) {
      setArmed(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = {
        to_stage: action === "force_approve" ? "done" : toStage,
        action,
        comment: trimmed,
        voice_note: voiceNote || null,
      };
      const updated = await grnApi.adminChainOverride(grn.number, payload);
      onUpdated?.(updated);
      setComment("");
      setVoiceNote(null);
      setArmed(false);
      toast.success("Override applied");
    } catch (err) {
      const msg = err?.response?.data?.message ?? "Could not override";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="glass-card rounded-2xl overflow-hidden border-warning/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-5 py-3 text-left hover:bg-warning-soft/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-warning" strokeWidth={2.25} />
          <h2 className="text-sm font-bold uppercase tracking-wider text-warning">
            Admin chain override
          </h2>
          <span className="text-[10px] uppercase tracking-widest font-bold text-text-muted">
            flip any past approve / reject
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-5 py-4 space-y-4 border-t border-border bg-warning-soft/10">
          <div className="text-xs text-text-muted flex items-start gap-2 p-3 rounded-md border border-warning/30 bg-warning-soft/30">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <div>
              Every change you make here writes an{" "}
              <span className="font-bold text-warning">admin_override</span>{" "}
              audit row visible to everyone with access to this GRN. Use it
              only when the regular approver can't or shouldn't act.
            </div>
          </div>

          {/* Action picker */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {ACTIONS.map((a) => {
              const active = action === a.key;
              const Icon = a.Icon;
              return (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => { setAction(a.key); setArmed(false); }}
                  className={`text-left rounded-lg border p-3 transition-all ${
                    active
                      ? a.card
                      : "border-border bg-surface-container-low/40 hover:border-text-muted"
                  }`}
                >
                  <div className={`flex items-center gap-2 mb-1 ${active ? a.icon : "text-text"}`}>
                    <Icon className="h-4 w-4" strokeWidth={2.25} />
                    <span className="text-sm font-bold">{a.label}</span>
                  </div>
                  <div className="text-[11px] text-text-muted leading-snug">
                    {a.desc}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Stage picker (hidden for force_approve) */}
          {needsStagePicker && (
            <div>
              <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                {action === "rewind" ? "Rewind to stage" : "Mark as rejected at stage"}
              </label>
              <select
                value={toStage}
                onChange={(e) => { setToStage(e.target.value); setArmed(false); }}
                disabled={busy}
                className="w-full bg-surface-container-lowest border border-border focus:border-primary rounded-md px-3 py-2 text-sm text-text outline-none"
              >
                {STAGES.filter((s) => s.key !== "done" || action !== "rewind").map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
              <MessageSquare className="h-3 w-3" />
              Reason
              <span className="text-danger normal-case font-normal tracking-normal">*</span>
              <span className="text-text-subtle normal-case font-normal tracking-normal">(speak or type)</span>
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
              onChange={(e) => { setComment(e.target.value); setArmed(false); }}
              disabled={busy}
              placeholder="Explain why you're overriding — required for the audit log."
              className={`w-full bg-surface-container-lowest border focus:border-primary rounded-md px-3 py-2 text-sm text-text outline-none resize-none ${
                reasonOk ? "border-border" : "border-warning/60"
              }`}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-danger bg-danger-soft/40 border border-danger/30 rounded-md px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="text-[11px] text-text-subtle">
              Currently:{" "}
              <span className="font-mono font-bold text-text">{grn.chain_stage}</span>{" "}
              · status{" "}
              <span className="font-mono font-bold text-text">{grn.status}</span>
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={!reasonOk || busy}
              className={`px-4 py-2 text-sm font-bold rounded-md flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                armed ? meta.submitArmed : meta.submitIdle
              }`}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? "Applying…" : armed ? `Confirm ${meta.label}` : meta.label}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
