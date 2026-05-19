import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight, Banknote, ReceiptText, ShoppingBag, ShoppingCart,
  FileText, BarChart3, Clock, AlertTriangle, CheckCircle2, TrendingUp,
} from "lucide-react";
import { useAuthStore } from "../../auth/store.js";
import { usePaymentStore } from "../../payments/store.js";
import { useInvoiceStore } from "../../finance/store.js";
import { usePOStore } from "../../purchase-orders/store.js";
import { usePRStore } from "../../purchase-requests/store.js";
import Skeleton from "../../../components/feedback/Skeleton.jsx";

// Local ₹ formatters — same shape used in features/payments/pages/List.jsx
function fmtINR(n) {
  const v = Number(n) || 0;
  return "₹" + v.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function fmtCompactINR(n) {
  const v = Number(n) || 0;
  if (v >= 1e7) return "₹" + (v / 1e7).toFixed(2).replace(/\.00$/, "") + "Cr";
  if (v >= 1e5) return "₹" + (v / 1e5).toFixed(2).replace(/\.00$/, "") + "L";
  if (v >= 1e3) return "₹" + (v / 1e3).toFixed(1).replace(/\.0$/, "") + "k";
  return "₹" + v.toLocaleString("en-IN");
}

/**
 * Finance-centric dashboard for the CFO. Surfaces what they need to act on:
 *   - Payments awaiting CFO approval (chain_stage='pending_cfo')
 *   - Invoices pending approval
 *   - POs at the CFO stage of the 5-stage internal chain
 *   - Top-level financial KPIs (outstanding, paid this month, spend velocity)
 */
export default function CFOHome() {
  const user = useAuthStore((s) => s.user);

  const payments      = usePaymentStore((s) => s.items);
  const paymentsLoad  = usePaymentStore((s) => s.loading);
  const fetchPayments = usePaymentStore((s) => s.fetchAll);

  const invoices      = useInvoiceStore((s) => s.items);
  const invoicesLoad  = useInvoiceStore((s) => s.loading);
  const fetchInvoices = useInvoiceStore((s) => s.fetchAll);

  const pos      = usePOStore((s) => s.items);
  const fetchPOs = usePOStore((s) => s.fetchAll);

  const prs      = usePRStore((s) => s.items);
  const fetchPRs = usePRStore((s) => s.fetchAll);

  useEffect(() => {
    fetchPayments();
    fetchInvoices();
    fetchPOs();
    fetchPRs();
  }, [fetchPayments, fetchInvoices, fetchPOs, fetchPRs]);

  const cfoQueue = useMemo(() => ({
    paymentsPendingCfo: payments.filter((p) => p.chain_stage === "pending_cfo"),
    paymentsPendingCeo: payments.filter((p) => p.chain_stage === "pending_ceo"),
    invoicesPending:    invoices.filter((i) => i.status === "pending"),
    posAtCfo:           pos.filter((p) => p.chain_stage === "cfo"),
    prsAtCfo:           prs.filter((p) => p.chain_stage === "cfo" && p.status === "pending"),
  }), [payments, invoices, pos, prs]);

  const kpis = useMemo(() => {
    const outstandingRaw = payments
      .filter((p) => p.status !== "paid" && p.status !== "rejected")
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);

    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);
    const paidThisMonthRaw = payments
      .filter((p) => p.status === "paid" && p.paid_at && new Date(p.paid_at) >= firstOfMonth)
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);

    const invoiceTotalRaw = invoices
      .filter((i) => i.status !== "rejected")
      .reduce((s, i) => s + (Number(i.total) || 0), 0);

    return {
      outstanding:  outstandingRaw,
      paidMonth:    paidThisMonthRaw,
      invoiceTotal: invoiceTotalRaw,
      queueCount:
        cfoQueue.paymentsPendingCfo.length
        + cfoQueue.invoicesPending.length
        + cfoQueue.posAtCfo.length
        + cfoQueue.prsAtCfo.length,
    };
  }, [payments, invoices, cfoQueue]);

  const initialLoading = (paymentsLoad || invoicesLoad) && payments.length === 0 && invoices.length === 0;

  return (
    <div className="max-w-6xl mx-auto pb-8">
      {/* ── Hero ── */}
      <section className="bg-surface-container-lowest border border-border rounded-lg p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-1">
              Finance Office
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-text tracking-tight">
              {greeting()}, {user?.name?.split(" ")[0] ?? "CFO"}
            </h1>
            <p className="text-sm text-text-muted mt-1">
              {kpis.queueCount > 0
                ? `${kpis.queueCount} item${kpis.queueCount === 1 ? "" : "s"} need${kpis.queueCount === 1 ? "s" : ""} your review.`
                : "All clear — nothing waiting on your sign-off."}
            </p>
          </div>
          <Link
            to="/app/payments"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-primary hover:brightness-110 text-primary-foreground text-sm font-bold shadow-sm shrink-0"
          >
            <Banknote className="h-4 w-4" /> Go to Payments
          </Link>
        </div>
      </section>

      {/* ── Financial KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <FinanceKpi
          label="Outstanding ₹"  value={fmtCompactINR(kpis.outstanding)}
          sub={`${payments.filter((p) => p.status !== "paid" && p.status !== "rejected").length} open`}
          tone="warning" icon={Clock}
          loading={initialLoading}
        />
        <FinanceKpi
          label="Paid this month"  value={fmtCompactINR(kpis.paidMonth)}
          sub={`${payments.filter((p) => p.status === "paid").length} settled`}
          tone="success" icon={TrendingUp}
          loading={initialLoading}
        />
        <FinanceKpi
          label="Invoices on book"  value={fmtCompactINR(kpis.invoiceTotal)}
          sub={`${invoices.length} invoice${invoices.length === 1 ? "" : "s"}`}
          tone="info" icon={ReceiptText}
          loading={initialLoading}
        />
      </div>

      {/* ── Action queues ── */}
      <section className="mb-6">
        <h2 className="text-sm font-bold text-text uppercase tracking-wider mb-3">Needs your sign-off</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <QueueCard
            tone="danger"
            icon={Banknote}
            label="Payments awaiting CFO"
            count={cfoQueue.paymentsPendingCfo.length}
            to="/app/payments?stage=pending_cfo"
            empty="No payments waiting on CFO sign-off"
          />
          <QueueCard
            tone="warning"
            icon={ReceiptText}
            label="Invoices to approve"
            count={cfoQueue.invoicesPending.length}
            to="/app/invoices"
            empty="No invoices pending approval"
          />
          <QueueCard
            tone="info"
            icon={ShoppingBag}
            label="POs at CFO stage"
            count={cfoQueue.posAtCfo.length}
            to="/app/purchase-orders?stage=cfo"
            empty="No POs in your stage"
          />
          <QueueCard
            tone="info"
            icon={ShoppingCart}
            label="PRs at CFO stage"
            count={cfoQueue.prsAtCfo.length}
            to="/app/purchase-requests?stage=cfo"
            empty="No PRs in your stage"
          />
        </div>
      </section>

      {/* ── Top pending payments table (snapshot of CFO queue) ── */}
      <section className="bg-surface-container-lowest border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <Banknote className="h-4 w-4 text-warning" />
            <h2 className="text-sm font-bold text-text uppercase tracking-wider">Top Payments — CFO Queue</h2>
          </div>
          <Link to="/app/payments" className="text-xs font-bold text-info hover:underline flex items-center gap-1">
            View all <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        {initialLoading ? (
          <ul className="divide-y divide-border">
            {[0, 1, 2].map((i) => (
              <li key={i} className="px-5 py-3.5 flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-5 w-24 rounded" />
              </li>
            ))}
          </ul>
        ) : cfoQueue.paymentsPendingCfo.length === 0 ? (
          <div className="p-8 text-center text-sm text-text-muted">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
            All payments cleared from your queue.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {cfoQueue.paymentsPendingCfo.slice(0, 5).map((p) => (
              <li key={p.number}>
                <Link
                  to={`/app/payments/${p.number}`}
                  className="group flex items-center gap-4 px-5 py-3.5 hover:bg-surface-container-low transition-colors"
                >
                  <div className="h-9 w-9 rounded-lg bg-warning-soft text-warning flex items-center justify-center shrink-0">
                    <Banknote className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold font-mono text-info">{p.number}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-warning-soft text-warning">
                        AWAITING CFO
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-text truncate mt-0.5">
                      {p.vendor}
                    </div>
                    <div className="text-xs text-text-muted">
                      PO: {p.po_number ?? "—"}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-bold text-warning tabular-nums">{fmtINR(Number(p.amount) || 0)}</div>
                    <div className="text-[10px] text-text-subtle">{p.payment_method}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-subtle group-hover:text-primary shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Quick links ── */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
        {[
          { to: "/app/invoices",         icon: ReceiptText, label: "Invoices" },
          { to: "/app/payments",         icon: Banknote,    label: "Payments" },
          { to: "/app/purchase-orders",  icon: ShoppingBag, label: "Purchase Orders" },
          { to: "/app/reports",          icon: BarChart3,   label: "Reports" },
        ].map((q) => (
          <Link
            key={q.to}
            to={q.to}
            className="group bg-surface-container-lowest border border-border rounded-lg p-4 hover:border-primary hover:shadow-md transition-all"
          >
            <q.icon className="h-5 w-5 text-info mb-2" />
            <div className="text-sm font-bold text-text">{q.label}</div>
          </Link>
        ))}
      </section>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const KPI_TONES = {
  warning: { card: "bg-warning-soft/30 border-warning/30", icon: "bg-warning text-primary-foreground", label: "text-warning" },
  success: { card: "bg-success-soft/30 border-success/30", icon: "bg-success text-primary-foreground", label: "text-success" },
  info:    { card: "bg-info-soft/30 border-info/30",       icon: "bg-info text-primary-foreground",    label: "text-info" },
};

function FinanceKpi({ label, value, sub, tone, icon: Icon, loading }) {
  const t = KPI_TONES[tone];
  return (
    <div className={`relative rounded-lg border-2 ${t.card} p-4`}>
      <div className={`absolute top-3 right-3 h-9 w-9 rounded-lg ${t.icon} flex items-center justify-center`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className={`text-[10px] font-bold uppercase tracking-widest ${t.label} mb-1`}>{label}</div>
      <div className="text-2xl sm:text-3xl font-bold text-text tabular-nums">
        {loading ? <Skeleton className="h-8 w-24" /> : value}
      </div>
      <div className="text-xs text-text-muted mt-0.5">{sub}</div>
    </div>
  );
}

const QUEUE_TONES = {
  danger:  { strip: "bg-danger",  num: "text-danger",  ring: "hover:border-danger" },
  warning: { strip: "bg-warning", num: "text-warning", ring: "hover:border-warning" },
  info:    { strip: "bg-info",    num: "text-info",    ring: "hover:border-info" },
};

function QueueCard({ tone, icon: Icon, label, count, to, empty }) {
  const t = QUEUE_TONES[tone];
  if (count === 0) {
    return (
      <div className="relative flex items-center gap-3 px-4 py-3 bg-surface-container-lowest border border-border rounded-lg opacity-60">
        <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-text">{label}</div>
          <div className="text-xs text-text-muted">{empty}</div>
        </div>
      </div>
    );
  }
  return (
    <Link
      to={to}
      className={`group relative flex items-center gap-3 pl-5 pr-4 py-3 bg-surface-container-lowest border-2 border-border ${t.ring} rounded-lg hover:shadow-md transition-all overflow-hidden`}
    >
      <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${t.strip}`} />
      <Icon className={`h-5 w-5 ${t.num} shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-text">{label}</div>
        <div className="text-xs text-text-muted">Tap to review</div>
      </div>
      <div className="text-right shrink-0">
        <div className={`text-2xl font-bold tabular-nums ${t.num}`}>{count}</div>
        {count > 3 && <AlertTriangle className="inline h-3 w-3 text-warning ml-1" />}
      </div>
      <ChevronRight className="h-4 w-4 text-text-subtle group-hover:text-primary shrink-0" />
    </Link>
  );
}
