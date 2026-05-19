import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Award,
  Clock,
  Loader2,
  XCircle,
  Trash2,
  AlertTriangle,
  Search,
  Truck,
  MessageSquareQuote,
  UserPlus,
  UserCheck,
  FileSpreadsheet,
} from "lucide-react";
import { useRFQStore } from "../store.js";
import { useToast } from "../../../hooks/useToast.jsx";
import { useAuthStore } from "../../auth/store.js";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import AwardFlowPanel from "../components/AwardFlowPanel.jsx";
import AssignAuthorModal from "../../../components/feedback/AssignAuthorModal.jsx";
import ReopenRejectedButton from "../../../components/admin/ReopenRejectedButton.jsx";
import PrintLetterhead from "../../../components/print/PrintLetterhead.jsx";
import PrintFooter from "../../../components/print/PrintFooter.jsx";
import PrintActions from "../../../components/print/PrintActions.jsx";
import rfqApi from "../api.js";

/** True iff this user is the Purchase HOD (or admin). Award only fires here. */
function isPurchaseHod(user) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.role === "hod" && user.department?.code === "PURCH";
}

const BACKOFFICE_ROLES = new Set([
  "admin",
  "purchase_officer",
  "manager",
  "hod",
  "cfo",
  "ceo",
]);

function fmtINR(n) {
  return `₹${Number(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function rankLabel(idx) {
  if (idx === 0) return { text: "Best Price", cls: "bg-success text-white" };
  if (idx === 1) return { text: "2nd", cls: "bg-info-soft text-info" };
  if (idx === 2) return { text: "3rd", cls: "bg-warning-soft text-warning" };
  return { text: `#${idx + 1}`, cls: "bg-surface-container-high text-text-muted" };
}

function VendorCard({
  rfq,
  items,
  resp,
  rank,
  cheapest,
  isExpanded,
  onToggle,
  onAward,
  canFireAward,
  isAgreedVendor,
  hasAgreedVendor,
  hasAnyVotes,
  isVoted,
  isTerminal,
  acting,
  totalFor,
  lineTotalsFor,
}) {
  // Two-click "armed → confirm" pattern for the Award button. The award
  // makes the RFQ terminal so a mis-tap is expensive — first click arms,
  // second click within 5 s fires. Auto-disarms after the timeout.
  const [armed, setArmed] = useState(false);
  const armTimerRef = useRef(null);
  useEffect(() => {
    if (!armed) return;
    armTimerRef.current = setTimeout(() => setArmed(false), 5000);
    return () => {
      if (armTimerRef.current) clearTimeout(armTimerRef.current);
    };
  }, [armed]);
  const handleAwardClick = () => {
    if (armed) {
      if (armTimerRef.current) clearTimeout(armTimerRef.current);
      setArmed(false);
      onAward(resp.vendor);
    } else {
      setArmed(true);
    }
  };

  const total = totalFor(resp);
  const lineRows = lineTotalsFor(resp);
  const subtotal = lineRows.reduce((s, l) => s + l.taxable, 0);
  const gstSum = lineRows.reduce((s, l) => s + l.gstAmount, 0);
  const shipping = Number(resp.shipping ?? 0);
  const isAwarded = rfq.awarded_vendor === resp.vendor;
  const delta = cheapest != null && total > cheapest ? total - cheapest : 0;
  const itemsPriced = (resp.prices ?? []).filter((p) => Number(p) > 0).length;
  const badge = rankLabel(rank);

  const submitted = resp.submitted_at
    ? new Date(resp.submitted_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <article
      className={`glass-card rounded-2xl overflow-hidden transition-colors ${
        isAwarded
          ? "ring-2 ring-success/40 border-success/40"
          : rank === 0
            ? "border-primary/40"
            : ""
      }`}
    >
      {/* Card header — always visible */}
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${badge.cls}`}
              >
                {rank === 0 && <Award className="h-3 w-3" strokeWidth={2.5} />}
                {badge.text}
              </span>
              {isAwarded && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-success-soft text-success">
                  <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} />
                  Awarded
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-text truncate">
              {resp.vendor}
            </h3>
            <div className="text-xs text-text-muted mt-1 flex flex-wrap gap-x-3 gap-y-1">
              {resp.eta && (
                <span className="inline-flex items-center gap-1">
                  <Truck className="h-3 w-3" /> ETA {resp.eta}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                Priced {itemsPriced}/{items.length} items
              </span>
              {submitted && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {submitted}
                </span>
              )}
            </div>
          </div>

          {/* Right: total + actions */}
          <div className="text-right shrink-0">
            <div
              className={`text-2xl font-black font-mono leading-none ${
                rank === 0 ? "text-primary" : "text-text"
              }`}
            >
              {fmtINR(total)}
            </div>
            {delta > 0 && (
              <div className="text-xs text-text-muted mt-1">
                +{fmtINR(delta)} vs best
              </div>
            )}
            {rank === 0 && cheapest != null && total === cheapest && (
              <div className="text-xs text-success font-semibold mt-1">
                Lowest grand total
              </div>
            )}
          </div>
        </div>

        {resp.comment && (
          <div className="mt-3 px-3 py-2 bg-surface-container-low rounded text-xs text-text-muted italic flex items-start gap-2">
            <MessageSquareQuote className="h-3.5 w-3.5 mt-0.5 shrink-0 text-text-subtle" />
            <span>&ldquo;{resp.comment}&rdquo;</span>
          </div>
        )}

        {/* Vendor voice note — captured at quote submission. Plays inline
            so the buyer can verify intent or hear context that didn't make
            it into the transcript. */}
        {resp.voice_note && (
          <div className="mt-2 px-3 py-2 bg-info-soft/40 border border-info/20 rounded flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-info text-white flex items-center justify-center shrink-0">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v4 M8 23h8" />
              </svg>
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-info">
                Voice note from vendor
              </div>
              <audio
                src={resp.voice_note}
                controls
                className="w-full mt-1 h-8"
                preload="metadata"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 mt-4">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1 text-xs font-semibold text-text-muted hover:text-text"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            />
            {isExpanded ? "Hide breakdown" : "Show line-item breakdown"}
          </button>

          {isAwarded ? (
            <span className="inline-flex items-center gap-1.5 text-success font-bold text-sm">
              <CheckCircle2 className="h-4 w-4" /> Awarded
            </span>
          ) : isTerminal ? (
            <span className="text-text-subtle text-xs">—</span>
          ) : canFireAward &&
            (isAgreedVendor ||
              (!hasAgreedVendor && hasAnyVotes && isVoted) ||
              (!hasAgreedVendor && !hasAnyVotes)) ? (
            // Three render paths for the Award button:
            //   1. Full consensus: only the agreed-vendor card gets it.
            //   2. Partial consensus (admin override after some HODs voted):
            //      only vendors with at least one HOD vote get it. Acme with
            //      zero votes wouldn't show the button even if both vendors
            //      submitted quotes.
            //   3. Zero votes (admin pushed chain through with no voting at
            //      all): every responding vendor gets it so Purchase HOD can
            //      pick freely.
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAwardClick}
                disabled={acting}
                aria-pressed={armed}
                className={`px-4 py-2 text-[12px] font-bold rounded-full transition-all shadow-sm disabled:opacity-60 flex items-center gap-1.5 ${
                  armed
                    ? "text-white bg-warning hover:brightness-110 ring-2 ring-warning/30 animate-pulse"
                    : "text-primary-foreground bg-primary hover:brightness-110"
                }`}
                title={
                  armed
                    ? "Click again to confirm — auto-cancels in 5 s"
                    : isAgreedVendor
                      ? "Fire award to the consensus-agreed vendor"
                      : isVoted
                        ? "HOD(s) voted for this vendor — award them"
                        : "No consensus vendor — pick this vendor as the winner"
                }
              >
                {armed ? (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Confirm award to {resp.vendor.split(" ")[0]}?
                  </>
                ) : (
                  <>
                    <Award className="h-3.5 w-3.5" /> Award to {resp.vendor.split(" ")[0]}
                  </>
                )}
              </button>
              {armed && (
                <button
                  type="button"
                  onClick={() => setArmed(false)}
                  disabled={acting}
                  className="px-2 py-1 text-[11px] font-medium text-text-muted hover:text-text underline-offset-2 hover:underline"
                  title="Cancel"
                >
                  Cancel
                </button>
              )}
            </div>
          ) : isAgreedVendor ? (
            <span className="text-[11px] text-text-muted italic">
              Awaiting Purchase HOD
            </span>
          ) : null}
        </div>
      </div>

      {/* Expanded breakdown */}
      {isExpanded && (
        <div className="border-t border-border bg-surface-container-low/50 overflow-x-auto">
          <table className="w-full text-xs min-w-[520px]">
            <thead>
              <tr className="text-[10px] font-bold text-text-muted uppercase tracking-widest border-b border-border">
                <th className="px-5 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Rate</th>
                <th className="px-3 py-2 text-right">GST</th>
                <th className="px-3 py-2 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((it, i) => {
                const row = lineRows[i];
                return (
                  <tr key={it.id ?? i}>
                    <td className="px-5 py-2">
                      <div className="font-medium text-text">{it.name ?? "—"}</div>
                      {it.code && (
                        <div className="text-[10px] text-info font-mono">
                          {it.code}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-text-muted">
                      {row.qty}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {fmtINR(row.rate)}
                    </td>
                    <td className="px-3 py-2 text-right text-text-muted">
                      {row.gstPct}%
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-semibold">
                      {fmtINR(row.total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="text-text-muted">
              <tr>
                <td colSpan={4} className="px-5 py-1.5 text-right">
                  Sub-total (taxable)
                </td>
                <td className="px-3 py-1.5 text-right font-mono">
                  {fmtINR(subtotal)}
                </td>
              </tr>
              <tr>
                <td colSpan={4} className="px-5 py-1.5 text-right">
                  GST total
                </td>
                <td className="px-3 py-1.5 text-right font-mono">
                  {fmtINR(gstSum)}
                </td>
              </tr>
              <tr>
                <td colSpan={4} className="px-5 py-1.5 text-right">
                  Shipping
                </td>
                <td className="px-3 py-1.5 text-right font-mono">
                  {fmtINR(shipping)}
                </td>
              </tr>
              <tr className="font-bold text-text">
                <td colSpan={4} className="px-5 py-2 text-right uppercase">
                  Grand total
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {fmtINR(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </article>
  );
}

function ComparisonView({
  rfq,
  items,
  responses,
  vendors,
  isTerminal,
  acting,
  sortBy,
  setSortBy,
  query,
  setQuery,
  expanded,
  toggleExpand,
  lineTotalsFor,
  totalFor,
  doAward,
  canFireAward,
  agreedVendor,
  votedVendors,
}) {
  const user = useAuthStore((s) => s.user);
  const totalsByVendor = useMemo(() => {
    const map = new Map();
    for (const r of responses) map.set(r.vendor, totalFor(r));
    return map;
  }, [responses, totalFor]);

  const cheapest = useMemo(() => {
    const ts = [...totalsByVendor.values()].filter((t) => t > 0);
    return ts.length > 0 ? Math.min(...ts) : null;
  }, [totalsByVendor]);

  const sorted = useMemo(() => {
    const list = [...responses];
    if (sortBy === "total") {
      list.sort((a, b) => (totalsByVendor.get(a.vendor) ?? 0) - (totalsByVendor.get(b.vendor) ?? 0));
    } else if (sortBy === "eta") {
      list.sort((a, b) => (a.eta ?? "9999").localeCompare(b.eta ?? "9999"));
    } else if (sortBy === "vendor") {
      list.sort((a, b) => (a.vendor ?? "").localeCompare(b.vendor ?? ""));
    }
    return list;
  }, [responses, sortBy, totalsByVendor]);

  const filtered = query
    ? sorted.filter((r) => r.vendor?.toLowerCase().includes(query.toLowerCase()))
    : sorted;

  const respondedNames = new Set(responses.map((r) => r.vendor));
  const notYetQuoted = vendors.filter((v) => !respondedNames.has(v));

  return (
    <div className="space-y-6">
      {/* Items requested summary */}
      <section className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text">
            What was requested
          </h2>
          <span className="text-xs text-text-muted">
            {items.length} item{items.length === 1 ? "" : "s"}
            {" · "}
            {responses.length}/{vendors.length} vendor responses
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] font-bold text-text-muted uppercase tracking-widest border-b border-border">
                <th className="py-2 text-left">Item</th>
                <th className="py-2 text-left">Code</th>
                <th className="py-2 text-left">HSN</th>
                <th className="py-2 text-left">UOM</th>
                <th className="py-2 text-right">Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((it, i) => (
                <tr key={it.id ?? i}>
                  <td className="py-2 font-medium text-text">{it.name ?? "—"}</td>
                  <td className="py-2 text-text-muted font-mono">{it.code ?? "—"}</td>
                  <td className="py-2 text-text-muted font-mono">{it.hsn_code ?? "—"}</td>
                  <td className="py-2 text-text-muted">{it.uom ?? "—"}</td>
                  <td className="py-2 text-right font-semibold">{it.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Sort + search bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search vendor…"
            className="w-full bg-surface-container-low/60 border border-border focus:border-primary/60 focus:ring-2 focus:ring-primary/15 pl-10 pr-3 py-2 text-sm text-text placeholder:text-text-subtle outline-none rounded-full transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <label className="text-text-muted font-semibold uppercase tracking-wider">
            Sort
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-surface-container-low/60 border border-border rounded-full px-4 py-2 text-[12px] font-semibold text-text-muted hover:text-text outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-colors"
          >
            <option value="total">Lowest grand total</option>
            <option value="eta">Earliest ETA</option>
            <option value="vendor">Vendor name (A→Z)</option>
          </select>
        </div>
        <span className="text-xs text-text-muted ml-auto">
          {filtered.length} of {responses.length} quotes
          {query && ` · matching "${query}"`}
        </span>
      </div>

      {/* Award-without-consensus hint — only when the chain reached `done`
          via admin override (no agreed_vendor on record) and the current
          user is the one who fires awards. */}
      {canFireAward && !agreedVendor && !isTerminal && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-warning-soft/60 border border-warning/30 flex items-start gap-2">
          <Award className="h-4 w-4 text-warning shrink-0 mt-0.5" strokeWidth={2.25} />
          <div className="text-xs text-text leading-snug">
            <span className="font-bold text-warning">
              No consensus vendor — pick a winner
            </span>
            <span className="block text-text-muted mt-0.5">
              The chain reached approval without HOD consensus (likely an
              admin override). Click "Award to …" on any vendor below to
              finalize the RFQ.
            </span>
          </div>
        </div>
      )}

      {/* Vendor cards */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No vendors match"
          description={`Clear the search to see all ${responses.length} responses.`}
          action={{ onClick: () => setQuery(""), label: "Clear search" }}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((resp) => {
            const rank = sortBy === "total"
              ? sorted.findIndex((r) => r.vendor === resp.vendor)
              : -1;
            return (
              <VendorCard
                key={resp.vendor}
                rfq={rfq}
                items={items}
                resp={resp}
                rank={rank}
                cheapest={cheapest}
                isExpanded={expanded.has(resp.vendor)}
                onToggle={() => toggleExpand(resp.vendor)}
                onAward={doAward}
                canFireAward={canFireAward}
                isAgreedVendor={agreedVendor === resp.vendor}
                hasAgreedVendor={!!agreedVendor}
                hasAnyVotes={votedVendors.size > 0}
                isVoted={votedVendors.has(resp.vendor)}
                isTerminal={isTerminal}
                acting={acting}
                totalFor={totalFor}
                lineTotalsFor={lineTotalsFor}
              />
            );
          })}
        </div>
      )}

    </div>
  );
}

/**
 * Admin-only panel that lists every vendor the system auto-invited to this
 * RFQ along with their current response state. Renders at the top of the
 * detail page regardless of whether any responses have come in, so admin
 * can verify the auto-selection logic the moment an RFQ is created.
 */
function AutoSelectedVendorsPanel({ rfq, vendors, responses }) {
  if (!Array.isArray(vendors) || vendors.length === 0) return null;
  const respondedNames = new Set(responses.map((r) => r.vendor));
  return (
    <section className="glass-card rounded-2xl p-5">
      <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
        <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted flex items-center gap-2">
          <UserCheck className="h-3.5 w-3.5" />
          Auto-selected vendors
          <span className="text-text-subtle font-normal normal-case tracking-normal">
            ({responses.length}/{vendors.length} responded)
          </span>
        </h3>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-info bg-info-soft px-2 py-0.5 rounded-full border border-info/20">
          Admin view
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {vendors.map((v) => {
          const hasResponded = respondedNames.has(v);
          const isAwarded = rfq.awarded_vendor === v;
          const cls = isAwarded
            ? "bg-success text-white border-success"
            : hasResponded
              ? "bg-success-soft text-success border-success/30"
              : "bg-surface-container-low/60 text-text border-border";
          return (
            <span
              key={v}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${cls}`}
              title={
                isAwarded
                  ? "Awarded"
                  : hasResponded
                    ? "Quote submitted"
                    : "Awaiting response"
              }
            >
              {isAwarded ? (
                <Award className="h-3 w-3" strokeWidth={2.5} />
              ) : hasResponded ? (
                <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} />
              ) : (
                <Clock className="h-3 w-3" strokeWidth={2.5} />
              )}
              {v}
            </span>
          );
        })}
      </div>
    </section>
  );
}

function StatusBanner({
  status,
  awarded,
  rfqNumber,
  canCreatePO,
  poAuthor,
  canAssignPoAuthor,
  onOpenAssign,
}) {
  if (status === "awarded") {
    return (
      <div className="glass-card rounded-2xl border-success/30 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6"
        style={{ background: "rgba(34, 197, 94, 0.06)" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-success text-white flex items-center justify-center shrink-0">
            <Award className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-success">
              Awarded to {awarded}
            </div>
            <div className="text-xs text-text-muted flex items-center gap-1.5 flex-wrap">
              {poAuthor ? (
                <>
                  <UserCheck className="h-3 w-3 text-info" />
                  <span>
                    PO author: <span className="font-semibold text-text">{poAuthor.name}</span>
                  </span>
                </>
              ) : canAssignPoAuthor ? (
                <span className="text-warning font-medium">
                  Awaiting PO author — assign a purchase officer to draft it.
                </span>
              ) : canCreatePO ? (
                <span>Ready to convert into a purchase order.</span>
              ) : (
                <span>Awaiting PO from the purchase officer.</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:shrink-0">
          {canAssignPoAuthor && (
            <button
              type="button"
              onClick={onOpenAssign}
              className="px-4 py-2 text-[12px] font-bold text-text border border-border bg-surface-container-low/60 hover:border-white/20 rounded-full transition-colors whitespace-nowrap inline-flex items-center gap-1.5"
            >
              <UserPlus className="h-3.5 w-3.5" />
              {poAuthor ? "Reassign" : "Assign PO author"}
            </button>
          )}
          {canCreatePO && (
            <Link
              to={`/app/purchase-orders/new?rfq=${rfqNumber}`}
              className="px-4 py-2 text-[12px] font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-full transition-all shadow-sm whitespace-nowrap"
            >
              Create PO →
            </Link>
          )}
        </div>
      </div>
    );
  }
  if (status === "closed") {
    return (
      <div className="glass-card rounded-2xl px-5 py-4 flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-surface-container text-text-muted flex items-center justify-center shrink-0">
          <XCircle className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <div>
          <div className="text-sm font-bold text-text">Closed without award</div>
          <div className="text-xs text-text-muted">
            No vendor quote was selected.
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export default function QuotationComparisonPage() {
  const { id: number } = useParams();
  const nav = useNavigate();
  const inStore = useRFQStore((s) => s.items.find((r) => r.number === number));
  const award = useRFQStore((s) => s.award);
  const close = useRFQStore((s) => s.close);
  const remove = useRFQStore((s) => s.remove);
  const assignPoAuthorAction = useRFQStore((s) => s.assignPoAuthor);
  const user = useAuthStore((s) => s.user);

  const [fetched, setFetched] = useState(null);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [acting, setActing] = useState(false);
  const [sortBy, setSortBy] = useState("total"); // total | eta | vendor
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(() => new Set());
  const [assignOpen, setAssignOpen] = useState(false);
  const toast = useToast();

  const toggleExpand = (vendor) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(vendor)) next.delete(vendor);
      else next.add(vendor);
      return next;
    });

  const rfq = inStore ?? fetched;
  const loading = !rfq && !fetchFailed;

  useEffect(() => {
    if (inStore) return;
    let cancelled = false;
    rfqApi
      .get(number)
      .then((data) => {
        if (!cancelled) setFetched(data);
      })
      .catch(() => {
        if (!cancelled) setFetchFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [number, inStore]);

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto flex items-center justify-center py-24 text-text-muted">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
      </div>
    );
  }
  if (!rfq) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <h2 className="text-2xl font-bold text-text mb-2">RFQ not found</h2>
        <Link
          to="/app/quotations"
          className="text-primary font-bold hover:underline"
        >
          Back to list
        </Link>
      </div>
    );
  }

  const items = Array.isArray(rfq.items) ? rfq.items : [];
  const responses = Array.isArray(rfq.responses) ? rfq.responses : [];
  const vendors = Array.isArray(rfq.vendors) ? rfq.vendors : [];
  const hasResponses = responses.length > 0;
  const isBackoffice = BACKOFFICE_ROLES.has(user?.role);
  const isTerminal = rfq.status === "awarded" || rfq.status === "closed";

  // Award button gate (FLOW.md §3 phase 3): only after CEO approval AND only
  // the Purchase HOD can fire it. Admin retained as override.
  const canFireAward = rfq.chain_stage === "done" && isPurchaseHod(user);
  const agreedVendor = rfq.consents?.agreed_vendor ?? null;
  // Vendors that received at least one HOD vote during consensus. Used so
  // the Award button stays scoped to "intended winners" even when admin
  // overrode the chain without full consensus — e.g. if 2 HODs voted for
  // Global SCM and admin force-approved, only Global SCM gets the button,
  // not every responding vendor.
  const votedVendors = new Set(
    ["respective", "finance", "purchase"]
      .map((k) => rfq.consents?.[k]?.vendor)
      .filter(Boolean),
  );
  // Vendors that have submitted responses — used by AwardFlowPanel for voting
  const candidateVendors = responses.map((r) => r.vendor);

  const lineTotalsFor = (r) => {
    const prices = r.prices ?? [];
    const gsts = r.gst ?? [];
    return items.map((it, idx) => {
      const qty = Number(it.qty ?? 0);
      const rate = Number(prices[idx]) || 0;
      const gstPct = Number(gsts[idx]) || 0;
      const taxable = qty * rate;
      const gstAmount = (taxable * gstPct) / 100;
      return { qty, rate, gstPct, taxable, gstAmount, total: taxable + gstAmount };
    });
  };
  const totalFor = (r) => {
    const lineSum = lineTotalsFor(r).reduce((s, l) => s + l.total, 0);
    return lineSum + Number(r.shipping ?? 0);
  };

  const onAssignPoAuthor = async (userId) => {
    try {
      const updated = await assignPoAuthorAction(rfq.number, userId);
      setFetched(updated);
      setAssignOpen(false);
      toast.success(
        `PO author assigned${updated.assigned_po_author?.name ? ` to ${updated.assigned_po_author.name}` : ""}.`,
      );
    } catch (err) {
      toast.error(
        err?.response?.data?.message ?? err?.message ?? "Could not assign.",
      );
    }
  };

  const doAward = async (vendorName) => {
    setActing(true);
    try {
      const updated = await award(rfq.number, vendorName);
      setFetched(updated);
      toast.success(`${vendorName} awarded — ready to create PO`);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Could not award");
    } finally {
      setActing(false);
    }
  };

  const doClose = async () => {
    if (!window.confirm("Close this RFQ without awarding to any vendor?"))
      return;
    setActing(true);
    try {
      const updated = await close(rfq.number);
      setFetched(updated);
      toast.success(`${rfq.number} closed`);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Could not close");
    } finally {
      setActing(false);
    }
  };

  const doDelete = async () => {
    if (!window.confirm(`Permanently delete ${rfq.number}?`)) return;
    setActing(true);
    try {
      await remove(rfq.number);
      toast.success(`${rfq.number} deleted`);
      nav("/app/quotations");
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Could not delete");
      setActing(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <PrintLetterhead
        docType="Request for Quotation"
        docNumber={rfq.number}
        subtitle={rfq.title ?? null}
      />

      <nav className="text-[12px] font-medium text-text-muted mb-3 flex items-center gap-1.5 print:hidden">
        <Link
          to="/app/quotations"
          className="hover:text-primary transition-colors"
        >
          Quotations
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-text-subtle" />
        <span className="text-text font-mono">{rfq.number}</span>
      </nav>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-6 print:hidden">
        <div>
          <div className="flex items-center gap-1.5 text-text-muted">
            <FileSpreadsheet className="h-3 w-3" strokeWidth={2} />
            <span className="text-[10px] font-semibold tracking-[0.22em] uppercase">
              Quotation
            </span>
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-bold text-text leading-tight tracking-tight mt-1">
            {rfq.title}
          </h1>
          <p className="text-text-muted text-sm mt-1.5 font-mono">
            {rfq.number}
            {rfq.pr_number ? ` · From ${rfq.pr_number}` : ""}
            {rfq.due_date ? ` · Due ${rfq.due_date}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PrintActions
            pdfFetcher={() => rfqApi.downloadPdf(rfq.number)}
            pdfFilename={`${rfq.number}.pdf`}
            onError={(msg) => toast.error(msg)}
            onPdfHint={(msg) => toast.info(msg)}
          />
        {isBackoffice && !isTerminal && hasResponses && (
          <button
            type="button"
            onClick={doClose}
            disabled={acting}
            className="px-4 py-2 text-[12px] font-semibold text-text-muted border border-border bg-surface-container-low/60 rounded-full hover:text-text hover:border-white/20 transition-colors disabled:opacity-60 flex items-center gap-1.5"
          >
            <XCircle className="h-3.5 w-3.5" /> Close without award
          </button>
        )}
        {(user?.role === "admin" ||
          user?.role === "purchase_officer" ||
          (user?.role === "hod" &&
            (user.department?.code === "PROC" ||
              user.department?.code === "PURCH"))) && (
          <button
            type="button"
            onClick={doDelete}
            disabled={acting}
            className="px-4 py-2 text-[12px] font-bold text-danger border border-danger/30 bg-danger-soft/40 rounded-full hover:bg-danger-soft transition-colors disabled:opacity-60 flex items-center gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        )}
        </div>
      </div>

      <StatusBanner
        status={rfq.status}
        awarded={rfq.awarded_vendor}
        rfqNumber={rfq.number}
        canCreatePO={
          user?.role === "admin" || user?.role === "purchase_officer"
        }
        poAuthor={rfq.assigned_po_author ?? null}
        canAssignPoAuthor={
          rfq.status === "awarded" &&
          (user?.role === "admin" ||
            (user?.role === "hod" && user.department?.code === "PURCH"))
        }
        onOpenAssign={() => setAssignOpen(true)}
      />

      {/* Admin reopen — undo a CEO/CFO rejection. RFQs use status='closed'
          (not 'rejected') as the terminal reject state, so we pass
          rejectedStatus="closed" here. */}
      <div className="mb-4">
        <ReopenRejectedButton
          endpoint={`/rfqs/${rfq.number}/reopen`}
          entityLabel="RFQ"
          status={rfq.status}
          rejectedStatus="closed"
          onReopened={(updated) => setFetched(updated)}
        />
      </div>

      {/* Admin-only auto-selected vendor panel — renders regardless of
          whether responses exist yet, so admin can verify the auto-selection
          immediately after RFQ creation. */}
      {user?.role === "admin" && (
        <AutoSelectedVendorsPanel
          rfq={rfq}
          vendors={vendors}
          responses={responses}
        />
      )}

      {!hasResponses ? (
        <EmptyState
          icon={Clock}
          title="No vendor responses yet"
          description={`Invited: ${vendors.join(", ") || "—"}`}
          action={
            isBackoffice && rfq.status === "open"
              ? { onClick: doClose, label: "Close without award" }
              : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ComparisonView
              rfq={rfq}
              items={items}
              responses={responses}
              vendors={vendors}
              isBackoffice={isBackoffice}
              isTerminal={isTerminal}
              acting={acting}
              sortBy={sortBy}
              setSortBy={setSortBy}
              query={query}
              setQuery={setQuery}
              expanded={expanded}
              toggleExpand={toggleExpand}
              lineTotalsFor={lineTotalsFor}
              totalFor={totalFor}
              doAward={doAward}
              canFireAward={canFireAward}
              agreedVendor={agreedVendor}
              votedVendors={votedVendors}
            />
          </div>
          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-20">
              <AwardFlowPanel
                rfq={rfq}
                user={user}
                candidateVendors={candidateVendors}
                onChange={setFetched}
              />
            </div>
          </aside>
        </div>
      )}

      {!isBackoffice && !isTerminal && (
        <div className="mt-6 text-xs text-text-muted flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          Only admin or purchase officer can award or close an RFQ.
        </div>
      )}

      <AssignAuthorModal
        open={assignOpen}
        title="Assign PO author"
        description={`Pick a purchase officer to draft the PO for ${rfq.number}.`}
        currentAssigneeId={rfq.assigned_po_author?.id}
        onClose={() => setAssignOpen(false)}
        onSubmit={onAssignPoAuthor}
      />

      <PrintFooter
        docNumber={rfq.number}
        signatures={[
          { label: "Issued By (Purchase)" },
          { label: "Reviewed By" },
          rfq.awarded_vendor
            ? { label: "Awarded To", name: rfq.awarded_vendor }
            : { label: "Authorised By" },
        ]}
      />
    </div>
  );
}
