import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft, Building2, Package, Search, RefreshCcw,
  ShoppingCart, ShoppingBag, CheckCircle2,
} from "lucide-react";
import { usePOStore } from "../../purchase-orders/store.js";
import { useGRNStore } from "../../grn/store.js";
import { usePaymentStore } from "../store.js";
import Skeleton from "../../../components/feedback/Skeleton.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";

/**
 * Shared list-by-GRN view for the Outstanding (item 53), FTM (item 54), and
 * Cumulative (item 55) sub-pages. Each row = one fully-approved GRN.
 *
 * `mode`:
 *   "ftm"        → only GRNs whose source PO has a payment marked paid this month
 *   "cumulative" → only GRNs whose source PO has a payment marked paid (all-time)
 *
 * Outstanding stays in its own file so the layout-around-the-rows can keep
 * its specific copy + KPI header.
 */
function fmtINR(n) {
  return `₹${Number(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 0, maximumFractionDigits: 2,
  })}`;
}

export default function PaymentGrnList({ mode, title, subtitle, icon: Icon, accentTone = "success" }) {
  const pos      = usePOStore((s) => s.items);
  const posLoading = usePOStore((s) => s.loading);
  const fetchPOs = usePOStore((s) => s.fetchAll);
  const grns = useGRNStore((s) => s.items);
  const fetchGRNs = useGRNStore((s) => s.fetchAll);
  const payments = usePaymentStore((s) => s.items);
  const paymentsLoading = usePaymentStore((s) => s.loading);
  const fetchPayments = usePaymentStore((s) => s.fetchAll);
  const [query, setQuery] = useState("");

  // Force-refresh on mount so a freshly-paid Payment surfaces here
  // immediately when the user clicks through from the Outstanding page.
  // The store's 30s TTL cache would otherwise hide the new record.
  useEffect(() => {
    fetchPOs(true);
    fetchGRNs(true);
    fetchPayments(true);
  }, [fetchPOs, fetchGRNs, fetchPayments]);

  // Predicate: does this PO have a "paid" payment matching the mode?
  const matchesMode = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return (poNumber) => {
      for (const p of payments) {
        if (p.po_number !== poNumber || p.status !== "paid") continue;
        if (mode === "cumulative") return true;
        if (mode === "ftm") {
          const d = p.paid_at ? new Date(p.paid_at) : null;
          if (d && !Number.isNaN(d.getTime()) && d >= startOfMonth) return true;
        }
      }
      return false;
    };
  }, [payments, mode]);

  const rows = useMemo(() => {
    const poByNumber = new Map(pos.map((p) => [p.number, p]));
    return grns
      .filter((g) => g.chain_stage === "done" && g.status !== "rejected")
      .map((g) => {
        const po = poByNumber.get(g.po_number);
        if (!po || !matchesMode(po.number)) return null;
        const rateMap = new Map();
        for (const it of (po.items ?? [])) {
          const k = it.code || it.name;
          if (k) rateMap.set(k, Number(it.rate) || 0);
        }
        let grnValue = 0;
        const rates = [];
        for (const it of (g.items ?? [])) {
          const k = it.code || it.name;
          const rate = rateMap.get(k) ?? 0;
          const accepted = Math.max(0, (Number(it.received) || 0) - (Number(it.damaged) || 0));
          grnValue += accepted * rate;
          if (rate > 0) rates.push(rate);
        }
        return {
          grn: g,
          po,
          grnValue,
          rateMin: rates.length ? Math.min(...rates) : 0,
          rateMax: rates.length ? Math.max(...rates) : 0,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.grnValue - a.grnValue);
  }, [pos, grns, matchesMode]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.grn.number.toLowerCase().includes(q)
      || r.po.number.toLowerCase().includes(q)
      || (r.po.vendor ?? "").toLowerCase().includes(q)
      || (r.po.pr_number ?? "").toLowerCase().includes(q),
    );
  }, [rows, query]);

  const total = rows.reduce((s, r) => s + r.grnValue, 0);
  const initialLoading = (posLoading || paymentsLoading) && pos.length === 0;
  const accentText = `text-${accentTone}`;

  return (
    <div className="max-w-[1400px] mx-auto pb-8">
      <nav className="text-sm font-medium text-text-muted mb-3 flex items-center gap-2 print:hidden">
        <Link to="/app/payments" className="hover:text-primary flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> Payments
        </Link>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text tracking-tight flex items-center gap-2">
            {Icon && <Icon className={`h-7 w-7 ${accentText}`} />} {title}
          </h1>
          <p className="text-text-muted text-sm mt-1">{subtitle}</p>
        </div>
        <div className="text-right">
          <div className={`text-[10px] font-bold uppercase tracking-widest ${accentText}`}>Total</div>
          <div className="text-2xl font-bold text-text tabular-nums">{fmtINR(total)}</div>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-3 mb-4 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by GRN, PO, PR, or vendor…"
            className="w-full pl-9 pr-3 py-2 text-sm bg-surface-container-lowest border border-border focus:border-primary rounded-md outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => { fetchPOs(); fetchPayments(); fetchGRNs(); }}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm border border-border rounded-md hover:bg-surface-container-low text-text-muted hover:text-text"
        >
          <RefreshCcw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <section className="bg-surface-container-lowest rounded-lg border border-border overflow-hidden">
        {initialLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Icon ?? CheckCircle2}
              title={mode === "ftm" ? "No payments this month yet" : "No payments yet"}
              description={query ? "Nothing matches that search." : (
                mode === "ftm"
                  ? "Once a payment is marked paid this month, the related GRN will show up here."
                  : "Once any payment is marked paid, the related GRN will show up here."
              )}
            />
          </div>
        ) : (
          <>
            <div className="hidden md:grid grid-cols-[110px_140px_140px_minmax(140px,1fr)_120px_140px] gap-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-text-subtle bg-surface-container-low border-b border-border">
              <div>PR</div>
              <div>PO</div>
              <div>GRN</div>
              <div>Vendor</div>
              <div className="text-right">Unit Rate</div>
              <div className="text-right">Amount</div>
            </div>
            <ul className="divide-y divide-border">
              {filtered.map((r) => <Row key={r.grn.number} r={r} fmtINR={fmtINR} />)}
            </ul>
            <div className="px-4 py-2.5 text-xs text-text-muted border-t border-border bg-surface-container-low">
              Showing {filtered.length} of {rows.length}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Row({ r, fmtINR }) {
  const rate = r.rateMin === r.rateMax
    ? fmtINR(r.rateMin)
    : `${fmtINR(r.rateMin)} – ${fmtINR(r.rateMax)}`;
  return (
    <li>
      <Link
        to={`/app/grn/${r.grn.number}`}
        className="group grid grid-cols-1 md:grid-cols-[110px_140px_140px_minmax(140px,1fr)_120px_140px] gap-2 md:gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors text-sm"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <ShoppingCart className="md:hidden h-3.5 w-3.5 text-text-muted shrink-0" />
          {r.po.pr_number
            ? <span className="font-mono text-info text-xs truncate">{r.po.pr_number}</span>
            : <span className="text-text-subtle text-xs italic">—</span>}
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <ShoppingBag className="md:hidden h-3.5 w-3.5 text-text-muted shrink-0" />
          <span className="font-mono text-info text-xs truncate">{r.po.number}</span>
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <Package className="md:hidden h-3.5 w-3.5 text-text-muted shrink-0" />
          <span className="font-mono font-bold text-info text-xs truncate">{r.grn.number}</span>
          {r.grn.replaces_grn_number && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-info-soft text-info text-[9px] font-bold border border-info/30 shrink-0">
              REPLACEMENT
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <Building2 className="md:hidden h-3.5 w-3.5 text-text-muted shrink-0" />
          <span className="text-text truncate">{r.po.vendor}</span>
        </div>
        <div className="md:text-right text-text-muted text-xs flex items-center md:justify-end gap-1.5">
          <span className="md:hidden text-text-subtle">Unit rate:</span>
          {rate}
        </div>
        <div className="md:text-right flex items-center md:justify-end gap-2 font-bold text-success tabular-nums">
          {fmtINR(r.grnValue)}
        </div>
      </Link>
    </li>
  );
}
