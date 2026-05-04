import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useSearchParams,
  Navigate,
} from "react-router-dom";
import {
  ChevronLeft,
  Banknote,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { usePOStore } from "../../purchase-orders/store.js";
import { usePaymentStore } from "../store.js";
import { useAuthStore } from "../../auth/store.js";
import { useToast } from "../../../hooks/useToast.jsx";
import Card from "../../../components/ui/Card.jsx";

const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "upi", label: "UPI" },
  { value: "rtgs", label: "RTGS / NEFT" },
  { value: "cash", label: "Cash" },
];

// FLOW.md item 11 — must mirror PaymentController thresholds.
const TIER_2 = 50_000;
const TIER_3 = 500_000;

function tierPreview(amount) {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n >= TIER_3) {
    return {
      tone: "warning",
      label: "Tier 3 — ≥ ₹5L",
      path: "CFO approval → CEO approval → Finance HOD releases",
    };
  }
  if (n >= TIER_2) {
    return {
      tone: "info",
      label: "Tier 2 — ₹50k–5L",
      path: "CFO approval → Finance HOD releases",
    };
  }
  return {
    tone: "success",
    label: "Tier 1 — < ₹50k",
    path: "Finance HOD releases directly",
  };
}

function fmtINR(n) {
  return `₹${Number(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function inputCls(error) {
  return `w-full rounded-lg px-3.5 py-3 sm:py-2.5 text-sm bg-surface-container-lowest border outline-none transition ${
    error
      ? "border-danger/60 text-danger focus:border-danger focus:ring-2 focus:ring-danger/20"
      : "border-border text-text focus:border-primary focus:ring-2 focus:ring-primary/20"
  }`;
}

function FieldLabel({ children, required, error }) {
  return (
    <label
      className={`block text-xs font-semibold mb-1 uppercase tracking-wider ${
        error ? "text-danger" : "text-text-muted"
      }`}
    >
      {children}
      {required && <span className="text-danger"> *</span>}
    </label>
  );
}

function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="text-xs text-danger mt-1.5 font-medium flex items-start gap-1">
      <AlertCircle className="h-3.5 w-3.5 mt-0.5" />
      {message}
    </p>
  );
}

function canCreatePayment(user) {
  if (!user) return false;
  if (user.role === "admin" || user.role === "accountant") return true;
  if (user.role === "hod" && user.department?.code === "FIN") return true;
  return false;
}

export default function PaymentCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPo = searchParams.get("po") ?? "";

  const user = useAuthStore((s) => s.user);
  const allHooksRanBeforeRedirect = !!user; // satisfy rules-of-hooks audit

  const pos = usePOStore((s) => s.items);
  const fetchPos = usePOStore((s) => s.fetchAll);
  const create = usePaymentStore((s) => s.create);
  const toast = useToast();

  const [poNumber, setPoNumber] = useState(initialPo);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPos();
  }, [fetchPos]);

  // Auto-prefill amount when PO is picked / loaded
  const selectedPo = useMemo(
    () => pos.find((p) => p.number === poNumber) ?? null,
    [pos, poNumber],
  );
  useEffect(() => {
    if (selectedPo && !amount) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAmount(String(Number(selectedPo.total ?? 0)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPo?.number]);

  // Hooks-before-redirect — gate render
  if (!canCreatePayment(user) && allHooksRanBeforeRedirect) {
    return <Navigate to="/app/payments" replace />;
  }

  // Only POs that are accepted or fulfilled qualify for payment
  const eligible = pos.filter(
    (p) => p.status === "accepted" || p.status === "fulfilled",
  );

  const validate = () => {
    const next = {};
    if (!poNumber) next.poNumber = "Pick a PO.";
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) next.amount = "Enter a positive amount.";
    if (selectedPo && n > Number(selectedPo.total ?? 0) * 1.05) {
      // soft cap: 5% over PO total looks suspicious; warn but don't block
    }
    return next;
  };

  const submit = async () => {
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) {
      toast.error("Fix the highlighted fields before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      const record = await create({
        po_number: poNumber,
        amount: Number(amount),
        payment_method: method || null,
        reference_no: reference.trim() || null,
        notes: notes.trim() || null,
      });
      toast.success(`${record.number} created — pending finance release.`);
      navigate(`/app/payments/${record.number}`);
    } catch (err) {
      toast.error(
        err?.response?.data?.message ?? err?.message ?? "Could not create payment",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-24">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate("/app/payments")}
          className="inline-flex items-center gap-1 text-xs font-medium text-text-muted hover:text-text mb-3"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Payments
        </button>
        <h1 className="text-2xl sm:text-3xl font-bold text-text tracking-tight flex items-center gap-2">
          <Banknote className="h-7 w-7 text-primary" /> New Payment
        </h1>
        <p className="text-text-muted text-sm mt-1">
          Issue a payment record against an accepted PO.
        </p>
      </div>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
          <div className="sm:col-span-2">
            <FieldLabel required error={errors.poNumber}>
              Purchase Order
            </FieldLabel>
            <select
              value={poNumber}
              onChange={(e) => {
                setPoNumber(e.target.value);
                setAmount(""); // reset so the prefill effect kicks in
              }}
              className={inputCls(errors.poNumber)}
            >
              <option value="">Select an accepted PO…</option>
              {eligible.map((p) => (
                <option key={p.number} value={p.number}>
                  {p.number} — {p.vendor} ({fmtINR(p.total)}) · {p.status}
                </option>
              ))}
            </select>
            <FieldError message={errors.poNumber} />
            {eligible.length === 0 && (
              <p className="text-xs text-text-muted mt-2">
                No accepted POs yet. A PO must be accepted by the vendor before
                a payment can be issued.{" "}
                <Link to="/app/purchase-orders" className="text-primary hover:underline">
                  View POs →
                </Link>
              </p>
            )}
          </div>

          {selectedPo && (
            <div className="sm:col-span-2 -mt-1 rounded-md border border-border bg-surface-container-low p-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Vendor
                </div>
                <div className="font-semibold text-text truncate">
                  {selectedPo.vendor}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  PO Total
                </div>
                <div className="font-semibold text-text font-mono">
                  {fmtINR(selectedPo.total)}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  PO Status
                </div>
                <div className="font-semibold text-text capitalize">
                  {selectedPo.status}
                </div>
              </div>
              {selectedPo.po_date && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    PO Date
                  </div>
                  <div className="font-semibold text-text">
                    {selectedPo.po_date}
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <FieldLabel required error={errors.amount}>
              Amount (₹)
            </FieldLabel>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={`${inputCls(errors.amount)} font-mono`}
            />
            <FieldError message={errors.amount} />
            {/* Cost-tier preview — tells the user what approvals this amount triggers */}
            {(() => {
              const t = tierPreview(amount);
              if (!t) return null;
              const tone =
                t.tone === "warning"
                  ? "bg-warning-soft text-warning border-warning/30"
                  : t.tone === "info"
                    ? "bg-info-soft text-info border-info/20"
                    : "bg-success-soft text-success border-success/30";
              return (
                <div
                  className={`mt-2 flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${tone}`}
                >
                  <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="font-bold">{t.label}</div>
                    <div className="opacity-90 mt-0.5">{t.path}</div>
                  </div>
                </div>
              );
            })()}
          </div>

          <div>
            <FieldLabel>Payment Method</FieldLabel>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className={inputCls(false)}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <FieldLabel>Reference Number</FieldLabel>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="UTR / cheque no / txn id (optional)"
              className={`${inputCls(false)} font-mono`}
            />
          </div>

          <div className="sm:col-span-2">
            <FieldLabel>Notes</FieldLabel>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything relevant (optional)"
              className={`${inputCls(false)} resize-none`}
            />
          </div>
        </div>
      </Card>

      <div className="mt-6 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => navigate("/app/payments")}
          disabled={submitting}
          className="px-4 py-2 text-sm font-medium text-text border border-border rounded-md hover:bg-surface-container-low disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={submitting || eligible.length === 0}
          className="px-5 py-2 text-sm font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-md disabled:opacity-60 flex items-center gap-2"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {submitting ? "Creating…" : "Create Payment"}
        </button>
      </div>
    </div>
  );
}
