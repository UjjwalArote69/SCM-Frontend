import { useEffect, useState } from "react";
import {
  X as XIcon,
  Banknote,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Building2,
  Package,
  ShoppingBag,
} from "lucide-react";
import { usePaymentStore } from "../store.js";
import { useToast } from "../../../hooks/useToast.jsx";

const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "rtgs",          label: "RTGS / NEFT" },
  { value: "cheque",        label: "Cheque" },
  { value: "upi",           label: "UPI" },
  { value: "cash",          label: "Cash" },
];

function fmtINR(n) {
  return `₹${Number(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Quick-pay modal — fires `POST /payments/quick-pay`, which creates a
 * fully-paid Payment record bypassing the cost-tier approval chain.
 * Admin / Finance HOD only on the backend; frontend should hide the
 * trigger for other roles.
 *
 * Props:
 *   row       — the Outstanding row (carries po, grn, grnValue)
 *   onClose   — fires on cancel
 *   onPaid    — fires with the new payment record after success; the
 *               parent can use it to refresh stores / counts.
 */
export default function QuickPayModal({ row, onClose, onPaid }) {
  const quickPay = usePaymentStore((s) => s.quickPay);
  const toast = useToast();

  const [amount, setAmount] = useState(String(row.grnValue.toFixed(2)));
  const [method, setMethod] = useState("bank_transfer");
  const [reference, setReference] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Auto-disarm 5s after first click
  useEffect(() => {
    if (!armed) return undefined;
    const t = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(t);
  }, [armed]);

  const amountNum = Number(amount);
  const amountValid = Number.isFinite(amountNum) && amountNum > 0;
  const largeAmount = amountNum >= 500_000;
  const notesValid = !largeAmount || notes.trim().length >= 3;
  const canSubmit = amountValid && method && notesValid;

  const submit = async () => {
    if (!canSubmit || busy) return;
    if (!armed) {
      setArmed(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const record = await quickPay({
        po_number: row.po.number,
        amount: amountNum,
        payment_method: method,
        reference_no: reference.trim() || null,
        notes: notes.trim() || null,
        paid_at: paidAt || null,
      });
      toast.success(`Payment ${record.number} recorded — ${fmtINR(amountNum)} paid`);
      onPaid?.(record);
    } catch (err) {
      const msg = err?.response?.data?.message ?? "Could not record payment";
      setError(msg);
      toast.error(msg);
      setArmed(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && !busy && onClose?.()}
    >
      <div className="w-full max-w-[560px] glass-card rounded-2xl overflow-hidden shadow-2xl border border-border max-h-[92vh] flex flex-col">
        <header className="px-5 py-4 border-b border-border flex items-center justify-between gap-2 bg-success-soft/30">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-success text-white flex items-center justify-center shadow-sm">
              <Banknote className="h-4 w-4" strokeWidth={2.25} />
            </div>
            <div>
              <h2 className="text-base font-bold text-text leading-tight">
                Record Payment
              </h2>
              <p className="text-[11px] text-text-muted leading-tight mt-0.5">
                Marks the GRN as paid · skips the approval chain
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="text-text-muted hover:text-text p-1.5 rounded-lg hover:bg-surface-container-low disabled:opacity-50"
            aria-label="Close"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </header>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Context strip — what we're paying */}
          <div className="bg-surface-container-low/60 border border-border rounded-xl p-3 space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-text">
              <Building2 className="h-3.5 w-3.5 text-text-muted shrink-0" />
              <span className="font-semibold truncate">{row.po.vendor}</span>
            </div>
            <div className="flex items-center gap-2 text-text-muted flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Package className="h-3 w-3" />
                <span className="font-mono">{row.grn.number}</span>
              </span>
              <span className="text-text-subtle">·</span>
              <span className="inline-flex items-center gap-1">
                <ShoppingBag className="h-3 w-3" />
                <span className="font-mono">{row.po.number}</span>
              </span>
              <span className="text-text-subtle">·</span>
              <span>Open balance {fmtINR(row.grnValue)}</span>
            </div>
          </div>

          {/* Amount */}
          <Field label="Amount" required error={!amountValid && amount !== ""}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-bold text-sm">₹</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setArmed(false);
                }}
                disabled={busy}
                className={`w-full pl-7 pr-3 py-2.5 text-sm font-mono font-bold tabular-nums bg-surface-container-lowest border rounded-lg outline-none transition ${
                  !amountValid && amount !== ""
                    ? "border-danger/60 text-danger focus:border-danger focus:ring-2 focus:ring-danger/20"
                    : "border-border text-text focus:border-primary focus:ring-2 focus:ring-primary/20"
                }`}
              />
            </div>
            {amountNum > row.grnValue && (
              <p className="mt-1 text-[11px] text-warning flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Amount exceeds the GRN's open balance of {fmtINR(row.grnValue)}.
              </p>
            )}
            {largeAmount && (
              <p className="mt-1 text-[11px] text-warning flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                ≥ ₹5L — notes required for the audit trail.
              </p>
            )}
          </Field>

          {/* Method + Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Payment method" required>
              <select
                value={method}
                onChange={(e) => { setMethod(e.target.value); setArmed(false); }}
                disabled={busy}
                className="w-full px-3 py-2.5 text-sm bg-surface-container-lowest border border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Reference no">
              <input
                type="text"
                value={reference}
                onChange={(e) => { setReference(e.target.value); setArmed(false); }}
                disabled={busy}
                placeholder="UTR / Cheque #"
                className="w-full px-3 py-2.5 text-sm bg-surface-container-lowest border border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
              />
            </Field>
          </div>

          {/* Paid at */}
          <Field label="Paid on">
            <input
              type="date"
              value={paidAt}
              onChange={(e) => { setPaidAt(e.target.value); setArmed(false); }}
              disabled={busy}
              className="w-full px-3 py-2.5 text-sm bg-surface-container-lowest border border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
              style={{ colorScheme: "var(--color-scheme)" }}
            />
          </Field>

          {/* Notes */}
          <Field label="Notes" required={largeAmount} error={largeAmount && !notesValid}>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setArmed(false); }}
              disabled={busy}
              placeholder={largeAmount
                ? "Required — short note explaining why the chain was bypassed (e.g. authorised by CFO offline)."
                : "Optional context for finance audit."}
              className={`w-full px-3 py-2.5 text-sm bg-surface-container-lowest border rounded-lg outline-none resize-none transition ${
                largeAmount && !notesValid
                  ? "border-danger/60 text-danger focus:border-danger focus:ring-2 focus:ring-danger/20"
                  : "border-border text-text focus:border-primary focus:ring-2 focus:ring-primary/20"
              }`}
            />
          </Field>

          {error && (
            <div className="flex items-start gap-2 text-xs text-danger bg-danger-soft/40 border border-danger/30 rounded-lg px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <footer className="px-5 py-3 border-t border-border bg-surface-container-low/40 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 text-sm font-medium text-text border border-border rounded-full hover:bg-surface-container-low disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || busy}
            className={`px-5 py-2 text-sm font-bold rounded-full flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              armed
                ? "bg-success text-white hover:brightness-110 ring-2 ring-success/30"
                : "bg-primary text-primary-foreground hover:brightness-110 shadow-sm"
            }`}
          >
            {busy
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <CheckCircle2 className="h-4 w-4" />}
            {busy
              ? "Recording…"
              : armed
                ? `Confirm — pay ${fmtINR(amountNum)}`
                : `Pay ${fmtINR(amountNum)}`}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className={`block text-[11px] font-semibold mb-1.5 uppercase tracking-wider ${
        error ? "text-danger" : "text-text-muted"
      }`}>
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
    </div>
  );
}
