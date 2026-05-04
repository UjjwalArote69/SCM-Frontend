import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ChevronRight, Send, Loader2, AlertCircle, Clock, Lock } from "lucide-react";
import { useRFQStore } from "../store.js";
import { useToast } from "../../../hooks/useToast.jsx";
import { useVendorIdentity } from "../../vendor-portal/useVendorIdentity.js";
import rfqApi from "../api.js";

const GST_OPTIONS = [0, 5, 12, 18, 28];

function display(v) {
  return v === null || v === undefined || v === "" ? "—" : v;
}

function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="text-xs text-danger mt-1 font-medium flex items-center gap-1">
      <AlertCircle className="h-3 w-3" />
      {message}
    </p>
  );
}

export default function SubmitQuotePage() {
  const { id: number } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const submit = useRFQStore((s) => s.submitQuote);
  const { vendorName } = useVendorIdentity();

  const [rfq, setRfq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rates, setRates] = useState({}); // { [itemIdx]: "123.45" }
  const [gsts, setGsts] = useState({}); // { [itemIdx]: "18" }
  const [shipping, setShipping] = useState(0);
  const [eta, setEta] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let cancelled = false;
    rfqApi
      .get(number)
      .then((data) => {
        if (cancelled) return;
        setRfq(data);
        setLoading(false);
        if (!Array.isArray(data.items)) return;

        // Pre-fill from a prior submission by this vendor (if any) so
        // "Revise Quote" actually shows what was submitted last time.
        const mine =
          vendorName &&
          (data.responses ?? []).find((r) => r.vendor === vendorName);
        const seedRates = {};
        const seedGsts = {};
        data.items.forEach((_, i) => {
          seedRates[i] =
            mine && mine.prices?.[i] != null ? String(mine.prices[i]) : "";
          seedGsts[i] =
            mine && mine.gst?.[i] != null ? String(mine.gst[i]) : "18";
        });
        setRates(seedRates);
        setGsts(seedGsts);
        if (mine) {
          setShipping(mine.shipping ?? 0);
          setEta(mine.eta ?? "");
          setComment(mine.comment ?? "");
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [number, vendorName]);

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto flex items-center justify-center py-24 text-text-muted">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
      </div>
    );
  }
  if (!rfq) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <h2 className="text-2xl font-bold text-text mb-2">RFQ not found</h2>
        <p className="text-text-muted text-sm mb-4">
          Either the RFQ doesn't exist or your vendor account wasn't invited.
        </p>
        <Link to="/vendor/quotation-requests" className="text-primary font-bold hover:underline">
          Back
        </Link>
      </div>
    );
  }

  const items = Array.isArray(rfq.items) ? rfq.items : [];
  const dueDatePassed = rfq.due_date && new Date(rfq.due_date) < new Date();
  const isTerminal = rfq.status === "awarded" || rfq.status === "closed";

  // FLOW.md item 7 — rate lock during consensus.
  // Once any HOD has voted, rates are frozen for every invited vendor
  // until the voting HODs withdraw. The backend exposes a boolean
  // `rates_locked` on vendor responses (consents themselves are scrubbed
  // server-side so vendors can't see who voted or which vendor was picked).
  // For pre-scrub responses or admin requests we still derive from
  // consents.* slots so the UI works in both modes.
  const consents = rfq.consents || {};
  const ratesLocked = Boolean(
    rfq.rates_locked ||
      consents.respective ||
      consents.finance ||
      consents.purchase,
  );

  // Compute per-line and grand totals
  const lines = items.map((it, i) => {
    const qty = Number(it.qty ?? 0);
    const rate = Number(rates[i]) || 0;
    const gstPct = Number(gsts[i]) || 0;
    const taxable = qty * rate;
    const gstAmount = (taxable * gstPct) / 100;
    const total = taxable + gstAmount;
    return { qty, rate, gstPct, taxable, gstAmount, total };
  });

  const taxableSum = lines.reduce((s, l) => s + l.taxable, 0);
  const gstSum = lines.reduce((s, l) => s + l.gstAmount, 0);
  const shippingNum = Number(shipping) || 0;
  const grand = taxableSum + gstSum + shippingNum;

  const validate = () => {
    const next = {};
    items.forEach((_, i) => {
      const r = Number(rates[i]);
      if (!Number.isFinite(r) || r < 0) {
        next[`rate_${i}`] = "Enter a valid non-negative rate.";
      }
      const g = Number(gsts[i]);
      if (!Number.isFinite(g) || g < 0 || g > 100) {
        next[`gst_${i}`] = "GST must be between 0 and 100.";
      }
    });
    if (!eta) next.eta = "Please enter a delivery ETA.";
    else if (new Date(eta) < new Date(new Date().toDateString())) {
      next.eta = "ETA must be today or a future date.";
    }
    return next;
  };

  const doSubmit = async () => {
    if (isTerminal) {
      toast.error(`This RFQ is ${rfq.status} and no longer accepts quotes.`);
      return;
    }
    if (ratesLocked) {
      toast.error(
        "Rates are locked — an HOD has voted. They must withdraw before quotes can change.",
      );
      return;
    }
    if (dueDatePassed) {
      toast.error("The submission deadline has passed.");
      return;
    }
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) {
      toast.error("Please correct the highlighted fields.");
      return;
    }
    setSubmitting(true);
    try {
      await submit(rfq.number, {
        prices: items.map((_, i) => Number(rates[i]) || 0),
        gst: items.map((_, i) => Number(gsts[i]) || 0),
        shipping: shippingNum,
        eta,
        comment: comment.trim() || null,
      });
      toast.success(`Quote submitted for ${rfq.number}`);
      nav("/vendor/quotations");
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Could not submit quote");
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = isTerminal || dueDatePassed || ratesLocked;

  return (
    <div className="max-w-[1400px] mx-auto">
      <nav className="text-sm font-medium text-text-muted mb-2 flex items-center gap-2">
        <Link to="/vendor/quotation-requests" className="hover:text-primary">
          Quotation Requests
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-text">{rfq.number}</span>
      </nav>
      <h1 className="text-3xl font-bold text-text tracking-tight mb-1">{rfq.title}</h1>
      <p className="text-text-muted text-sm mb-6">
        {rfq.number}
        {rfq.due_date ? ` · Due ${rfq.due_date}` : ""}
      </p>

      {isTerminal && (
        <div className="bg-warning-soft border border-warning/30 rounded-md px-4 py-3 mb-6 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-warning" strokeWidth={2.5} />
          <div className="text-sm font-semibold text-warning capitalize">
            This RFQ is {rfq.status} — no longer accepting quotes.
          </div>
        </div>
      )}
      {!isTerminal && dueDatePassed && (
        <div className="bg-danger-soft border border-danger/30 rounded-md px-4 py-3 mb-6 flex items-center gap-3">
          <Clock className="h-5 w-5 text-danger" strokeWidth={2.5} />
          <div className="text-sm font-semibold text-danger">
            The submission deadline ({rfq.due_date}) has passed.
          </div>
        </div>
      )}
      {!isTerminal && !dueDatePassed && ratesLocked && (
        <div className="bg-warning-soft border border-warning/30 rounded-md px-4 py-3 mb-6 flex items-start gap-3">
          <Lock className="h-5 w-5 text-warning shrink-0 mt-0.5" strokeWidth={2.5} />
          <div className="min-w-0">
            <div className="text-sm font-bold text-warning">
              Rates locked — evaluation in progress
            </div>
            <div className="text-xs text-text-muted mt-1">
              The buyer has begun reviewing quotes. Rates are frozen for now;
              you'll be notified if changes are requested.
            </div>
          </div>
        </div>
      )}

      <section className="bg-surface-container-low rounded-lg p-6 mb-6">
        <h2 className="text-lg font-bold text-text mb-4">Line Items</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-[10px] font-bold text-text-muted uppercase tracking-widest text-left border-b border-border">
                <th className="py-2 px-2">Item</th>
                <th className="py-2 px-2">Code</th>
                <th className="py-2 px-2">HSN</th>
                <th className="py-2 px-2 text-right w-16">UOM</th>
                <th className="py-2 px-2 text-right w-14">Qty</th>
                <th className="py-2 px-2 text-right w-28">Rate</th>
                <th className="py-2 px-2 text-right w-24">GST %</th>
                <th className="py-2 px-2 text-right w-28">Taxable</th>
                <th className="py-2 px-2 text-right w-28">GST Amt</th>
                <th className="py-2 px-2 text-right w-28">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((it, i) => {
                const { qty, taxable, gstAmount, total } = lines[i];
                return (
                  <tr key={i}>
                    <td className="py-2 px-2 font-medium">{display(it.name)}</td>
                    <td className="py-2 px-2 text-text-muted font-mono text-xs">
                      {display(it.code)}
                    </td>
                    <td className="py-2 px-2 text-text-muted font-mono text-xs">
                      {display(it.hsn_code)}
                    </td>
                    <td className="py-2 px-2 text-right text-text-muted">
                      {display(it.uom)}
                    </td>
                    <td className="py-2 px-2 text-right font-medium">{qty}</td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={rates[i] ?? ""}
                        disabled={disabled}
                        onChange={(e) => {
                          setRates({ ...rates, [i]: e.target.value });
                          if (errors[`rate_${i}`]) {
                            setErrors((p) => {
                              const n = { ...p };
                              delete n[`rate_${i}`];
                              return n;
                            });
                          }
                        }}
                        placeholder="0.00"
                        className={`w-24 bg-surface-container-lowest border-b px-2 py-1 text-right text-sm outline-none disabled:opacity-60 ${
                          errors[`rate_${i}`]
                            ? "border-danger"
                            : "border-border focus:border-primary"
                        }`}
                      />
                      {errors[`rate_${i}`] && (
                        <div className="text-[10px] text-danger mt-0.5 text-right">
                          {errors[`rate_${i}`]}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <select
                        value={gsts[i] ?? "18"}
                        disabled={disabled}
                        onChange={(e) =>
                          setGsts({ ...gsts, [i]: e.target.value })
                        }
                        className="w-20 bg-surface-container-lowest border-b border-border focus:border-primary px-1 py-1 text-right text-sm outline-none disabled:opacity-60"
                      >
                        {GST_OPTIONS.map((g) => (
                          <option key={g} value={g}>
                            {g}%
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2 text-right text-text-muted font-mono text-xs">
                      ₹{taxable.toFixed(2)}
                    </td>
                    <td className="py-2 px-2 text-right text-text-muted font-mono text-xs">
                      ₹{gstAmount.toFixed(2)}
                    </td>
                    <td className="py-2 px-2 text-right font-bold font-mono">
                      ₹{total.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-border font-bold">
                <td colSpan={7} className="py-2 px-2 text-right uppercase text-xs text-text-muted">
                  Taxable Amount
                </td>
                <td className="py-2 px-2 text-right font-mono">₹{taxableSum.toFixed(2)}</td>
                <td colSpan={2}></td>
              </tr>
              <tr className="font-bold">
                <td colSpan={7} className="py-2 px-2 text-right uppercase text-xs text-text-muted">
                  GST Total
                </td>
                <td></td>
                <td className="py-2 px-2 text-right font-mono">₹{gstSum.toFixed(2)}</td>
                <td></td>
              </tr>
              <tr className="font-bold">
                <td colSpan={7} className="py-2 px-2 text-right uppercase text-xs text-text-muted">
                  Shipping
                </td>
                <td colSpan={3} className="py-2 px-2 text-right font-mono">
                  ₹{shippingNum.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">
            Shipping Charges
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={shipping}
            disabled={disabled}
            onChange={(e) => setShipping(e.target.value)}
            className="w-full bg-surface-container-lowest border-0 border-b-2 border-outline-variant focus:border-primary px-3 py-2 text-sm outline-none disabled:opacity-60"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">
            Delivery ETA *
          </label>
          <input
            type="date"
            value={eta}
            disabled={disabled}
            onChange={(e) => {
              setEta(e.target.value);
              if (errors.eta) setErrors(({ eta: _, ...rest }) => rest);
            }}
            className={`w-full bg-surface-container-lowest border-0 border-b-2 px-3 py-2 text-sm outline-none disabled:opacity-60 ${
              errors.eta ? "border-danger" : "border-outline-variant focus:border-primary"
            }`}
          />
          <FieldError message={errors.eta} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">
            Comment
          </label>
          <textarea
            rows={3}
            value={comment}
            disabled={disabled}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional: delivery terms, payment terms, warranty, any notes for the buyer…"
            className="w-full bg-surface-container-lowest border-0 border-b-2 border-outline-variant focus:border-primary px-3 py-2 text-sm outline-none resize-none disabled:opacity-60"
          />
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-lg p-6 border border-border mb-6 flex justify-between items-center">
        <span className="font-bold text-text">Grand Total (incl. GST + Shipping)</span>
        <span className="text-2xl font-black text-primary font-mono">₹{grand.toFixed(2)}</span>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => nav(-1)}
          className="px-5 py-2 text-sm font-medium text-text border border-border rounded-md hover:bg-surface-container-low"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={doSubmit}
          disabled={submitting || disabled}
          className="px-6 py-2 text-sm font-bold text-primary-foreground bg-primary hover:bg-primary-hover rounded-md flex items-center gap-2 disabled:bg-surface-container-high disabled:text-text-muted disabled:cursor-not-allowed"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {submitting ? "Submitting…" : "Submit Quote"}
        </button>
      </div>
    </div>
  );
}
