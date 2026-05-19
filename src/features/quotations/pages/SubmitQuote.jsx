import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ChevronRight,
  Send,
  Loader2,
  AlertCircle,
  Clock,
  Lock,
  Package,
  CalendarDays,
  Truck,
  MessageSquare,
  CheckCircle2,
  Calendar,
  Trophy,
  XCircle,
} from "lucide-react";
import { useRFQStore } from "../store.js";
import { useToast } from "../../../hooks/useToast.jsx";
import { useVendorIdentity } from "../../vendor-portal/useVendorIdentity.js";
import { useUIStore } from "../../ui/store.js";
import { useNotificationsStore } from "../../notifications/store.js";
import VoiceRecorder from "../../../components/forms/VoiceRecorder.jsx";
import rfqApi from "../api.js";

const GST_OPTIONS = [0, 5, 12, 18, 28];

function display(v) {
  return v === null || v === undefined || v === "" ? "—" : v;
}

function fmtINR(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const pushNotification = useNotificationsStore((s) => s.push);
  const notifItems = useNotificationsStore((s) => s.items);

  const [rfq, setRfq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rates, setRates] = useState({}); // { [itemIdx]: "123.45" }
  const [gsts, setGsts] = useState({}); // { [itemIdx]: "18" }
  const [shipping, setShipping] = useState(0);
  const [eta, setEta] = useState("");
  const [comment, setComment] = useState("");
  // Vendor voice-note (base64 data URL). Sent with the quote submission so
  // an uneducated vendor who can't type a long comment can speak instead.
  const [voiceNote, setVoiceNote] = useState(null);
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
          setVoiceNote(mine.voice_note ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [number, vendorName]);

  // Fire-once notification when this vendor lands on a page where they
  // were awarded the RFQ. The dedupe key ensures we don't spam the bell
  // every render — once per RFQ-number per browser/user.
  useEffect(() => {
    if (!rfq || !vendorName) return;
    if (rfq.status !== "awarded" || rfq.awarded_vendor !== vendorName) return;
    const key = `award-${rfq.number}`;
    const already = notifItems.some((n) => n.key === key);
    if (already) return;
    pushNotification({
      key,
      tone: "success",
      icon: "check",
      title: `🎉 You won ${rfq.number}!`,
      body: `Congratulations — the buyer awarded this RFQ to ${vendorName}. A Purchase Order will be issued soon.`,
      link: `/vendor/quotations/submit/${rfq.number}`,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfq?.status, rfq?.awarded_vendor, rfq?.number, vendorName]);

  if (loading) {
    return (
      <div className="max-w-[1100px] mx-auto flex items-center justify-center py-24 text-text-muted">
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
        <Link
          to="/vendor/quotation-requests"
          className="text-primary font-bold hover:underline"
        >
          Back
        </Link>
      </div>
    );
  }

  const items = Array.isArray(rfq.items) ? rfq.items : [];
  const dueDatePassed = rfq.due_date && new Date(rfq.due_date) < new Date();
  const isTerminal = rfq.status === "awarded" || rfq.status === "closed";

  // FLOW.md item 7 — rate lock during consensus.
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

  const filledLines = lines.filter((l) => l.rate > 0).length;
  const allLinesFilled = filledLines === items.length;

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
        voice_note: voiceNote || null,
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

  // Has this vendor already submitted? Used to flip CTA copy from
  // "Submit Quote" to "Revise Quote".
  const mineExisting =
    vendorName && (rfq.responses ?? []).find((r) => r.vendor === vendorName);
  const isRevise = Boolean(mineExisting);

  return (
    <div className="max-w-[1100px] mx-auto pb-24 sm:pb-28">
      {/* Breadcrumb + Title */}
      <nav className="text-[12px] font-medium text-text-muted mb-3 flex items-center gap-1.5">
        <Link to="/vendor/quotation-requests" className="hover:text-primary">
          Quotation Requests
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-text">{rfq.number}</span>
      </nav>

      <div className="mb-6">
        <div className="flex items-center gap-1.5 text-text-muted mb-1">
          <Package className="h-3 w-3" strokeWidth={2} />
          <span className="text-[10px] font-semibold tracking-[0.22em] uppercase">
            Quote Request
          </span>
        </div>
        <h1 className="text-[24px] sm:text-[32px] font-bold text-text leading-tight tracking-tight">
          {rfq.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-text-muted">
          <span className="font-mono font-semibold text-primary">{rfq.number}</span>
          {rfq.due_date && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              Due {rfq.due_date}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" />
            {items.length} item{items.length === 1 ? "" : "s"}
          </span>
          {isRevise && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-info-soft text-info text-[10px] font-bold uppercase tracking-widest border border-info/20">
              Revising
            </span>
          )}
        </div>
      </div>

      {/* Status banners */}
      {/* Vendor-WON celebration — only when THIS vendor was awarded */}
      {rfq.status === "awarded" && rfq.awarded_vendor === vendorName && (
        <div className="bg-gradient-to-br from-success-soft via-success-soft to-success/10 border-2 border-success/40 rounded-2xl px-5 py-5 mb-5 flex items-start gap-4 shadow-[0_8px_24px_-8px_color-mix(in_srgb,var(--color-success)_45%,transparent)]">
          <div className="w-12 h-12 rounded-full bg-success text-white flex items-center justify-center shrink-0 shadow-md">
            <Trophy className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-success bg-success/15 px-2 py-0.5 rounded-full">
                Congratulations
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-success-foreground bg-success px-2 py-0.5 rounded-full">
                Awarded
              </span>
            </div>
            <h2 className="text-lg font-bold text-text">
              You won this RFQ
            </h2>
            <p className="text-sm text-text-muted mt-1 leading-relaxed">
              The buyer has awarded {rfq.number} to{" "}
              <span className="font-semibold text-text">{vendorName}</span>.
              A Purchase Order will be issued shortly — watch the{" "}
              <Link to="/vendor/purchase-orders" className="text-primary font-semibold hover:underline">
                Purchase Orders
              </Link>{" "}
              page for it.
            </p>
          </div>
        </div>
      )}
      {/* Vendor-LOST notice — RFQ awarded to someone else */}
      {rfq.status === "awarded" && rfq.awarded_vendor && rfq.awarded_vendor !== vendorName && (
        <div className="bg-surface-container-low border border-border rounded-xl px-4 py-3 mb-5 flex items-start gap-3">
          <XCircle className="h-5 w-5 text-text-muted shrink-0 mt-0.5" strokeWidth={2.25} />
          <div className="text-sm">
            <div className="font-semibold text-text">
              Awarded to another vendor
            </div>
            <div className="text-text-muted text-xs mt-0.5">
              The buyer chose a different bid for {rfq.number}. Thank you for
              participating — keep an eye on the Quotation Requests page for
              new opportunities.
            </div>
          </div>
        </div>
      )}
      {/* Generic terminal banner — only for closed RFQs or awarded RFQs the
          vendor isn't directly part of */}
      {isTerminal && rfq.status !== "awarded" && (
        <div className="bg-warning-soft border border-warning/30 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-warning" strokeWidth={2.5} />
          <div className="text-sm font-semibold text-warning capitalize">
            This RFQ is {rfq.status} — no longer accepting quotes.
          </div>
        </div>
      )}
      {!isTerminal && dueDatePassed && (
        <div className="bg-danger-soft border border-danger/30 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
          <Clock className="h-5 w-5 text-danger" strokeWidth={2.5} />
          <div className="text-sm font-semibold text-danger">
            The submission deadline ({rfq.due_date}) has passed.
          </div>
        </div>
      )}
      {!isTerminal && !dueDatePassed && ratesLocked && (
        <div className="bg-warning-soft border border-warning/30 rounded-xl px-4 py-3 mb-5 flex items-start gap-3">
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

      {/* Quick guidance — sets expectations before they start filling */}
      {!disabled && (
        <div className="bg-info-soft/40 border border-info/20 rounded-xl px-4 py-3 mb-5 flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-info text-white flex items-center justify-center shrink-0 text-[11px] font-black">
            {filledLines}/{items.length}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-text">
              {allLinesFilled
                ? "All items priced — review and submit when ready."
                : "Enter your rate per unit for each item."}
            </div>
            <div className="text-[11.5px] text-text-muted mt-0.5">
              GST defaults to 18%. Totals update as you type. Add shipping + ETA below.
            </div>
          </div>
        </div>
      )}

      {/* Line items — card stack instead of a wide table */}
      <section className="mb-6">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-text-muted mb-3 px-1">
          Items to quote
        </h2>
        <div className="space-y-2.5">
          {items.map((it, i) => {
            const { qty, taxable, total } = lines[i];
            const rateError = errors[`rate_${i}`];
            const hasRate = lines[i].rate > 0;
            return (
              <div
                key={i}
                className={`bg-surface rounded-xl border transition-colors ${
                  rateError
                    ? "border-danger/40"
                    : hasRate
                      ? "border-success/30"
                      : "border-border"
                }`}
              >
                {/* Top section: identity */}
                <div className="px-4 sm:px-5 pt-4 pb-2 flex items-start gap-3">
                  <div
                    className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center font-bold text-[13px] ${
                      hasRate
                        ? "bg-success text-white"
                        : "bg-surface-container-low text-text-muted"
                    }`}
                  >
                    {hasRate ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-semibold text-text leading-snug">
                      {display(it.name)}
                    </div>
                    <div className="text-[11.5px] text-text-muted mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                      {it.code && (
                        <span className="font-mono">
                          <span className="text-text-subtle">Code:</span>{" "}
                          {it.code}
                        </span>
                      )}
                      {it.hsn_code && (
                        <span className="font-mono">
                          <span className="text-text-subtle">HSN:</span>{" "}
                          {it.hsn_code}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-text-subtle">
                      Quantity
                    </div>
                    <div className="text-[15px] font-bold text-text tabular-nums">
                      {qty}
                      <span className="text-[11px] text-text-muted font-normal ml-1">
                        {display(it.uom)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom section: pricing controls */}
                <div className="px-4 sm:px-5 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end border-t border-border/40 mt-2 pt-3">
                  {/* Rate input — hero of the row */}
                  <div className="min-w-0">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">
                      Your rate per {display(it.uom)}{" "}
                      <span className="text-danger">*</span>
                    </label>
                    <div
                      className={`flex items-center gap-2 rounded-lg border bg-surface-container-lowest px-3 py-2 transition-colors ${
                        rateError
                          ? "border-danger"
                          : "border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15"
                      }`}
                    >
                      <span className="text-text-muted text-sm font-bold">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
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
                        className="flex-1 bg-transparent text-base font-semibold text-text outline-none disabled:opacity-60 tabular-nums"
                      />
                    </div>
                    {rateError && (
                      <p className="text-[11px] text-danger mt-1 font-medium">
                        {rateError}
                      </p>
                    )}
                  </div>

                  {/* GST */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">
                      GST
                    </label>
                    <select
                      value={gsts[i] ?? "18"}
                      disabled={disabled}
                      onChange={(e) =>
                        setGsts({ ...gsts, [i]: e.target.value })
                      }
                      className="bg-surface-container-lowest border border-border rounded-lg px-3 py-2 text-sm font-semibold text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60 cursor-pointer"
                    >
                      {GST_OPTIONS.map((g) => (
                        <option key={g} value={g}>
                          {g}%
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Computed line total */}
                  <div className="sm:text-right">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">
                      Line total
                    </div>
                    <div className="text-[17px] font-bold text-text tabular-nums font-mono">
                      {fmtINR(total)}
                    </div>
                    {taxable > 0 && (
                      <div className="text-[10.5px] text-text-subtle font-mono tabular-nums mt-0.5">
                        {fmtINR(taxable)} + GST
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Delivery + Shipping + Comment — clean strip */}
      <section className="mb-6">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-text-muted mb-3 px-1">
          Delivery & terms
        </h2>
        <div className="bg-surface rounded-xl border border-border p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5 inline-flex items-center gap-1.5">
              <Calendar className="h-3 w-3" style={{ color: "var(--text)" }} strokeWidth={2.5} />
              Delivery ETA <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <Calendar
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                style={{ color: "var(--text)" }}
                strokeWidth={2.5}
              />
              <input
                type="date"
                required
                value={eta}
                disabled={disabled}
                onChange={(e) => {
                  setEta(e.target.value);
                  if (errors.eta) setErrors(({ eta: _, ...rest }) => rest);
                }}
                className={`w-full bg-surface-container-lowest border rounded-lg pl-10 pr-3 py-2 text-sm text-text outline-none disabled:opacity-60 transition-colors ${
                  errors.eta
                    ? "border-danger"
                    : "border-border focus:border-primary focus:ring-2 focus:ring-primary/15"
                }`}
              />
            </div>
            <FieldError message={errors.eta} />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5 inline-flex items-center gap-1.5">
              <Truck className="h-3 w-3" strokeWidth={2.5} />
              Shipping charges{" "}
              <span className="text-text-subtle font-normal normal-case tracking-normal">
                — optional
              </span>
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-container-lowest px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-colors">
              <span className="text-text-muted text-sm font-bold">₹</span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={shipping}
                disabled={disabled}
                onChange={(e) => setShipping(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-transparent text-sm font-medium text-text outline-none disabled:opacity-60 tabular-nums"
              />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5 inline-flex items-center gap-1.5">
              <MessageSquare className="h-3 w-3" strokeWidth={2.5} />
              Notes to buyer{" "}
              <span className="text-text-subtle font-normal normal-case tracking-normal">
                — optional
              </span>
            </label>

            {/* Voice → text helper. Vendor taps Record, speaks freely, and
                their words appear in the textarea below as they speak. The
                audio itself is also captured and shipped with the quote so
                the buyer can play it back if they need to verify intent.
                Built for vendors with limited literacy. */}
            <div className="mb-2">
              <VoiceRecorder
                onTranscript={(text) => setComment(text)}
                onAudioChange={(b64) => setVoiceNote(b64)}
                disabled={disabled}
                language="en-IN"
                maxSeconds={90}
              />
              <p className="text-[11px] text-text-muted mt-1 inline-flex items-center gap-1.5">
                Tap{" "}
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary-soft text-primary font-semibold text-[10px]">
                  Record voice
                </span>{" "}
                to speak instead of typing — your words fill the box and the
                audio is saved for the buyer to review.
              </p>
            </div>

            <textarea
              rows={3}
              value={comment}
              disabled={disabled}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Type or use the voice recorder above…"
              className="w-full bg-surface-container-lowest border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-subtle outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none disabled:opacity-60"
            />
          </div>
        </div>
      </section>

      {/* Totals breakdown — compact card before the sticky bar */}
      <section className="bg-surface rounded-xl border border-border p-4 sm:p-5 mb-6">
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center justify-between text-text-muted">
            <span>Taxable amount</span>
            <span className="font-mono tabular-nums">{fmtINR(taxableSum)}</span>
          </div>
          <div className="flex items-center justify-between text-text-muted">
            <span>GST total</span>
            <span className="font-mono tabular-nums">{fmtINR(gstSum)}</span>
          </div>
          <div className="flex items-center justify-between text-text-muted">
            <span>Shipping</span>
            <span className="font-mono tabular-nums">{fmtINR(shippingNum)}</span>
          </div>
          <div className="pt-2 mt-2 border-t border-border flex items-center justify-between">
            <span className="text-sm font-bold text-text">Grand total</span>
            <span className="text-2xl font-black text-primary font-mono tabular-nums">
              {fmtINR(grand)}
            </span>
          </div>
        </div>
      </section>

      {/* Sticky submit bar — keeps grand total + CTA visible while scrolling.
          Left edge tracks the sidebar width on desktop. On mobile the bar is
          a single tight row: total flex-1 on the left, Submit pill on the
          right. Cancel is removed on mobile (the in-page "Back" button at
          the top handles that). */}
      <div
        className={`fixed bottom-0 right-0 left-0 z-30 bg-surface/95 backdrop-blur-xl border-t border-border shadow-[0_-4px_16px_-6px_rgba(0,0,0,0.08)] transition-[left] duration-200 ${
          sidebarCollapsed ? "md:left-16" : "md:left-64"
        }`}
      >
        <div className="w-full px-3 sm:px-6 md:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3">
          {/* Total — always visible, scales by viewport */}
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-text-muted">
              Grand total
              {!disabled && !allLinesFilled && (
                <span className="ml-1.5 text-warning normal-case tracking-normal font-medium">
                  · {items.length - filledLines} unpriced
                </span>
              )}
            </span>
            <span className="text-[16px] sm:text-[20px] font-black text-primary font-mono tabular-nums truncate">
              {fmtINR(grand)}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => nav(-1)}
              disabled={submitting}
              className="hidden sm:inline-flex px-4 py-2 text-[12px] font-semibold text-text-muted border border-border bg-surface-container-low/60 rounded-full hover:text-text hover:border-white/20 transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={doSubmit}
              disabled={submitting || disabled}
              className="px-4 sm:px-6 py-2 text-[12px] sm:text-[13px] font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-full transition-all shadow-sm inline-flex items-center gap-1.5 sm:gap-2 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 whitespace-nowrap"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              )}
              <span className="hidden sm:inline">
                {submitting
                  ? "Submitting…"
                  : isRevise
                    ? "Revise quote"
                    : "Submit quote"}
              </span>
              <span className="sm:hidden">
                {submitting ? "…" : isRevise ? "Revise" : "Submit"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
