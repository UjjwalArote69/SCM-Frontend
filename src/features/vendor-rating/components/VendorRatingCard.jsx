import { useEffect, useMemo, useState } from "react";
import {
  Award,
  Star,
  Loader2,
  CheckCircle2,
  Trash2,
  Calendar,
  CreditCard,
  Wallet,
} from "lucide-react";
import { useVendorRatingStore } from "../store.js";
import { useAuthStore } from "../../auth/store.js";
import { useToast } from "../../../hooks/useToast.jsx";

/* =============================================================================
   Vendor multi-dimensional rating — sibling to feedback.

   - 5 subjective dimensions (1-5 stars each, optional)
   - Behavioral attributes: years working, late-payment tolerance, advance pmt
   - Optional notes
   - Aggregate summary (computed server-side) with avg per dimension + modal
     values for behavioral attributes
   - Each in-org user has at most ONE row per vendor (upserted)
============================================================================= */

const DIMENSIONS = [
  { key: "rating_quality",       label: "Quality" },
  { key: "rating_delivery",      label: "Delivery" },
  { key: "rating_pricing",       label: "Pricing" },
  { key: "rating_communication", label: "Communication" },
  { key: "rating_documentation", label: "Documentation" },
];

const TOLERANCE_OPTIONS = [
  { value: "low",    label: "Strict",   helper: "Chases as soon as due" },
  { value: "medium", label: "Flexible", helper: "Mild reminders only" },
  { value: "high",   label: "Lenient",  helper: "Tolerates extended delays" },
];

const ADVANCE_OPTIONS = [
  { value: "none",    label: "None",    helper: "Will work on credit" },
  { value: "partial", label: "Partial", helper: "Some advance required" },
  { value: "full",    label: "Full",    helper: "100% advance required" },
];

// Stable references — Zustand selectors that return a new literal every
// render trip `useSyncExternalStore` into an infinite loop.
const EMPTY_ROWS = Object.freeze([]);
const EMPTY_SUMMARY = Object.freeze({ count: 0 });

const RATING_KEYS = DIMENSIONS.map((d) => d.key);

function avg(arr) {
  const xs = arr.filter((v) => v != null && Number.isFinite(Number(v)));
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + Number(b), 0) / xs.length;
}

function mode(arr) {
  const xs = arr.filter(Boolean);
  if (xs.length === 0) return null;
  const counts = {};
  for (const v of xs) counts[v] = (counts[v] ?? 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * Recompute the aggregate locally from a set of rows. Mirrors
 * VendorRatingController::index summary logic.
 *
 * Key rule: a row's **overall** is the sum of its 5 dimensions divided by
 * 5, with **unrated dimensions counted as zero** — so leaving a dimension
 * blank actively pulls your overall down. This matches the user's mental
 * model: "I scored vendor 5 on quality, didn't rate the rest → my
 * contribution should be 1/5, not 5/5". `avg_overall` is then the mean
 * of those per-row overalls across all rows that rated at least one
 * dimension.
 *
 * Per-dimension averages (`avg_quality`, etc.) stay null-aware — they
 * answer "what's the average score *among reviewers who rated this
 * dimension*" — that's still the right question for those.
 */
function computeSummary(rows) {
  if (!rows || rows.length === 0) return { count: 0 };
  const summary = { count: rows.length };

  // Per-dimension averages — only consider non-null values per dim.
  for (const k of RATING_KEYS) {
    const a = avg(rows.map((r) => r[k]));
    summary["avg_" + k.replace("rating_", "")] = a == null ? null : Number(a.toFixed(2));
  }

  const years = avg(rows.map((r) => r.years_working));
  summary.avg_years_working = years == null ? null : Number(years.toFixed(1));
  summary.modal_late_payment_tolerance = mode(
    rows.map((r) => r.late_payment_tolerance),
  );
  summary.modal_advance_payment = mode(rows.map((r) => r.advance_payment));

  // Overall — null = 0 in the row's score; only rows with at least one
  // rated dim contribute.
  const rowOveralls = rows
    .filter((r) => RATING_KEYS.some((k) => r[k] != null))
    .map(
      (r) =>
        RATING_KEYS.reduce((s, k) => s + (Number(r[k]) || 0), 0) /
        RATING_KEYS.length,
    );
  summary.avg_overall =
    rowOveralls.length === 0
      ? null
      : Number(
          (
            rowOveralls.reduce((a, b) => a + b, 0) / rowOveralls.length
          ).toFixed(2),
        );

  return summary;
}

function StarRow({ value, onChange, label }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
      <span className="text-sm font-medium text-text">{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = value && n <= value;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(value === n ? null : n)}
              className={`p-1 rounded transition-colors ${
                active ? "text-warning" : "text-text-subtle hover:text-warning/60"
              }`}
              aria-label={`${label}: ${n} star${n === 1 ? "" : "s"}`}
            >
              <Star
                className="h-4 w-4"
                fill={active ? "currentColor" : "none"}
                strokeWidth={2.25}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StarsDisplay({ value, size = "sm" }) {
  const cls = size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5";
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${cls} ${
            value && n <= Math.round(value) ? "text-warning" : "text-text-subtle"
          }`}
          fill={value && n <= Math.round(value) ? "currentColor" : "none"}
          strokeWidth={2}
        />
      ))}
    </div>
  );
}

function PillPicker({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(value === opt.value ? null : opt.value)}
            title={opt.helper}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
              active
                ? "bg-info text-white border-info"
                : "bg-surface-container-lowest border-border text-text-muted hover:border-info/50 hover:text-info"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function fmtDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function SummaryStrip({ summary }) {
  if (!summary || summary.count === 0) {
    return (
      <div className="text-xs text-text-muted">
        No ratings yet. Be the first to score this vendor.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-3 text-xs">
      {summary.avg_overall != null && (
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-warning" />
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-text-muted">
              Overall
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black text-text tabular-nums">
                {summary.avg_overall.toFixed(1)}
              </span>
              <StarsDisplay value={summary.avg_overall} />
            </div>
          </div>
        </div>
      )}
      {summary.avg_years_working != null && (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-info" />
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-text-muted">
              Avg years
            </div>
            <div className="text-base font-black text-text tabular-nums">
              {summary.avg_years_working}
            </div>
          </div>
        </div>
      )}
      {summary.modal_late_payment_tolerance && (
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-success" />
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-text-muted">
              Late-pay tolerance
            </div>
            <div className="text-sm font-bold text-text capitalize">
              {summary.modal_late_payment_tolerance}
            </div>
          </div>
        </div>
      )}
      {summary.modal_advance_payment && (
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-warning" />
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-text-muted">
              Advance pmt
            </div>
            <div className="text-sm font-bold text-text capitalize">
              {summary.modal_advance_payment}
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Star className="h-4 w-4 text-text-muted" />
        <div>
          <div className="text-[10px] uppercase tracking-widest font-bold text-text-muted">
            Reviewers
          </div>
          <div className="text-base font-black text-text tabular-nums">
            {summary.count}
          </div>
        </div>
      </div>
    </div>
  );
}

const initialForm = (mine) => ({
  rating_quality: mine?.rating_quality ?? null,
  rating_delivery: mine?.rating_delivery ?? null,
  rating_pricing: mine?.rating_pricing ?? null,
  rating_communication: mine?.rating_communication ?? null,
  rating_documentation: mine?.rating_documentation ?? null,
  years_working: mine?.years_working ?? "",
  late_payment_tolerance: mine?.late_payment_tolerance ?? null,
  advance_payment: mine?.advance_payment ?? null,
  notes: mine?.notes ?? "",
});

export default function VendorRatingCard({ vendorName, compact = false }) {
  const rows = useVendorRatingStore((s) =>
    vendorName ? s.byVendor[vendorName]?.rows ?? EMPTY_ROWS : EMPTY_ROWS,
  );
  const summary = useVendorRatingStore((s) =>
    vendorName
      ? s.byVendor[vendorName]?.summary ?? EMPTY_SUMMARY
      : EMPTY_SUMMARY,
  );
  const mine = useVendorRatingStore((s) =>
    vendorName ? s.byVendor[vendorName]?.mine ?? null : null,
  );
  const fetchForVendor = useVendorRatingStore((s) => s.fetchForVendor);
  const upsert = useVendorRatingStore((s) => s.upsert);
  const remove = useVendorRatingStore((s) => s.remove);
  const user = useAuthStore((s) => s.user);
  const toast = useToast();

  const [form, setForm] = useState(initialForm(null));
  const [submitting, setSubmitting] = useState(false);
  const [showOthers, setShowOthers] = useState(false);

  useEffect(() => {
    if (vendorName) fetchForVendor(vendorName).catch(() => {});
  }, [vendorName, fetchForVendor]);

  // Sync the form with the user's existing row when it lands.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(initialForm(mine));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine?.id, mine?.updated_at]);

  const isInOrg = user && user.role !== "vendor";
  const isAdmin = user?.role === "admin";

  // Live preview — replace the caller's row in the dataset with their
  // current form values and recompute the aggregate locally. This way the
  // Overall / Quality avg / etc. update on every keystroke, not just after
  // the user clicks Save. The server's summary is still the source of
  // truth on first load and after a successful save (we re-fetch).
  // Note: hooks must run unconditionally — placed BEFORE the `isInOrg`
  // early return below to satisfy rules-of-hooks.
  const liveSummary = useMemo(() => {
    const liveRow = {
      user_id: user?.id,
      rating_quality: form.rating_quality ?? null,
      rating_delivery: form.rating_delivery ?? null,
      rating_pricing: form.rating_pricing ?? null,
      rating_communication: form.rating_communication ?? null,
      rating_documentation: form.rating_documentation ?? null,
      years_working:
        form.years_working === "" || form.years_working == null
          ? null
          : Number(form.years_working),
      late_payment_tolerance: form.late_payment_tolerance ?? null,
      advance_payment: form.advance_payment ?? null,
    };
    const formHasInput =
      RATING_KEYS.some((k) => liveRow[k] != null) ||
      liveRow.years_working != null ||
      liveRow.late_payment_tolerance != null ||
      liveRow.advance_payment != null;
    if (!formHasInput && !mine) return summary;
    const liveRows = mine
      ? rows.map((r) => (r.id === mine.id ? { ...r, ...liveRow } : r))
      : [...rows, liveRow];
    return computeSummary(liveRows);
  }, [rows, form, mine, summary, user?.id]);

  if (!isInOrg) return null;

  const otherRows = rows.filter((r) => r.user_id !== user?.id);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        vendor_name: vendorName,
        ...form,
        years_working:
          form.years_working === "" || form.years_working == null
            ? null
            : Number(form.years_working),
        notes: form.notes?.trim() || null,
      };
      await upsert(payload);
      toast.success(mine ? "Rating updated" : "Rating saved");
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Could not save rating");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMine = async () => {
    if (!mine || !window.confirm("Delete your rating for this vendor?")) return;
    try {
      await remove(vendorName, mine.id);
      toast.success("Your rating was removed");
      setForm(initialForm(null));
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Could not delete");
    }
  };

  const handleDeleteOther = async (row) => {
    if (!isAdmin) return;
    if (!window.confirm("Delete this rating?")) return;
    try {
      await remove(vendorName, row.id);
      toast.success("Rating removed");
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Could not delete");
    }
  };

  return (
    <section className="glass-card rounded-2xl overflow-hidden">
      <header
        className={`flex items-center justify-between gap-2 ${compact ? "px-4 py-3" : "px-5 py-4"} border-b border-border bg-surface-container-low/40`}
      >
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-text-muted" strokeWidth={2.25} />
          <h2 className="text-sm font-bold uppercase tracking-wider text-text">
            Vendor Rating
          </h2>
          {summary?.count > 0 && (
            <span className="text-[10px] uppercase tracking-widest font-bold text-text-muted">
              {summary.count} {summary.count === 1 ? "reviewer" : "reviewers"}
            </span>
          )}
        </div>
      </header>

      {/* Aggregate summary — uses the LIVE computation so the user can see
          their in-progress edits affect the overall in real time. Reverts
          to the server-baked summary once the form matches the saved row. */}
      <div className={`${compact ? "px-4 py-3" : "px-5 py-4"} border-b border-border bg-surface-container-low/20`}>
        <SummaryStrip summary={liveSummary} />
      </div>

      {/* My rating form */}
      <div className={compact ? "p-4" : "p-5"}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted">
            {mine ? "Your rating" : "Rate this vendor"}
          </h3>
          {mine && (
            <button
              type="button"
              onClick={handleDeleteMine}
              className="text-[10px] uppercase tracking-widest font-bold text-text-muted hover:text-danger inline-flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" /> Delete mine
            </button>
          )}
        </div>

        {/* Star dimensions */}
        <div className="bg-surface-container-low/30 rounded-md px-3 py-1 mb-4">
          {DIMENSIONS.map((d) => (
            <StarRow
              key={d.key}
              label={d.label}
              value={form[d.key]}
              onChange={set(d.key)}
            />
          ))}
        </div>

        {/* Behavioral grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-text-muted mb-1.5">
              Years working with vendor
            </label>
            <input
              type="number"
              min="0"
              max="99"
              value={form.years_working}
              onChange={(e) => set("years_working")(e.target.value)}
              placeholder="e.g. 3"
              className="w-full rounded-lg px-3 py-2 text-sm bg-surface-container-lowest border border-border text-text focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-text-muted mb-1.5">
              Late-payment tolerance
            </label>
            <PillPicker
              options={TOLERANCE_OPTIONS}
              value={form.late_payment_tolerance}
              onChange={set("late_payment_tolerance")}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[10px] uppercase tracking-widest font-bold text-text-muted mb-1.5">
              Advance payment requirement
            </label>
            <PillPicker
              options={ADVANCE_OPTIONS}
              value={form.advance_payment}
              onChange={set("advance_payment")}
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-[10px] uppercase tracking-widest font-bold text-text-muted mb-1.5">
            Notes (optional)
          </label>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => set("notes")(e.target.value)}
            placeholder="Anything else about this vendor that future reviewers should know"
            className="w-full rounded-lg px-3 py-2 text-sm bg-surface-container-lowest border border-border text-text focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
          />
        </div>

        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 text-sm font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-md disabled:opacity-50 inline-flex items-center gap-2"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {submitting
              ? "Saving…"
              : mine
                ? "Update rating"
                : "Save rating"}
          </button>
        </div>
      </div>

      {/* Other ratings */}
      {otherRows.length > 0 && (
        <div className="border-t border-border">
          <button
            type="button"
            onClick={() => setShowOthers((v) => !v)}
            className="w-full px-5 py-3 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-text-muted hover:text-text hover:bg-surface-container-low/40 transition-colors"
          >
            <span>{showOthers ? "Hide" : "Show"} other reviewers ({otherRows.length})</span>
            <span className="text-text-subtle">{showOthers ? "−" : "+"}</span>
          </button>
          {showOthers && (
            <ul className="divide-y divide-border">
              {otherRows.map((row) => {
                const dims = DIMENSIONS.filter((d) => row[d.key] != null);
                return (
                  <li key={row.id} className={`${compact ? "px-4 py-3.5" : "px-5 py-4"}`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-text text-sm">
                          {row.author?.name ?? "Someone"}
                        </span>
                        {row.author?.role && (
                          <span className="text-[10px] uppercase tracking-widest font-bold text-text-muted bg-surface-container-high px-1.5 py-0.5 rounded">
                            {row.author.role}
                          </span>
                        )}
                        {row.years_working != null && (
                          <span className="text-[11px] text-text-muted">
                            · worked {row.years_working}y
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-text-subtle">
                          {fmtDateTime(row.updated_at)}
                        </span>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteOther(row)}
                            className="p-1 rounded text-text-muted hover:text-danger hover:bg-danger-soft/40"
                            aria-label="Delete rating"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {dims.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mb-2">
                        {dims.map((d) => (
                          <div
                            key={d.key}
                            className="flex items-center justify-between gap-2 text-xs"
                          >
                            <span className="text-text-muted">{d.label}</span>
                            <StarsDisplay value={row[d.key]} />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-text-muted flex-wrap">
                      {row.late_payment_tolerance && (
                        <span>
                          Late-pay:{" "}
                          <span className="font-semibold text-text capitalize">
                            {row.late_payment_tolerance}
                          </span>
                        </span>
                      )}
                      {row.advance_payment && (
                        <span>
                          Advance:{" "}
                          <span className="font-semibold text-text capitalize">
                            {row.advance_payment}
                          </span>
                        </span>
                      )}
                    </div>
                    {row.notes && (
                      <p className="text-xs text-text mt-2 italic leading-relaxed">
                        “{row.notes}”
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
