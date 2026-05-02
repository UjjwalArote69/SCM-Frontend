import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Inbox,
  FileText,
  ShoppingBag,
  ReceiptText,
  Loader2,
  Clock,
  CheckCircle2,
  Award,
  XCircle,
  ArrowRight,
  ChevronRight,
  Building2,
  User,
  Mail,
} from "lucide-react";
import { useAuthStore } from "../../auth/store.js";
import { useRFQStore } from "../../quotations/store.js";
import { usePOStore } from "../../purchase-orders/store.js";
import { useVendorIdentity } from "../../vendor-portal/useVendorIdentity.js";
import EmptyState from "../../../components/ui/EmptyState.jsx";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const ACTIVITY_KIND = {
  success: { Icon: CheckCircle2, bg: "bg-success-soft",  iconColor: "text-success", bar: "bg-success" },
  warning: { Icon: Clock,         bg: "bg-warning-soft", iconColor: "text-warning", bar: "bg-warning" },
  danger:  { Icon: XCircle,       bg: "bg-danger-soft",  iconColor: "text-danger",  bar: "bg-danger" },
  info:    { Icon: Award,          bg: "bg-info-soft",    iconColor: "text-info",    bar: "bg-info" },
};

function docTypePill(ref) {
  if (!ref) return null;
  if (ref.startsWith("PR-"))  return { label: "PR",  cls: "bg-warning-soft text-warning" };
  if (ref.startsWith("QT-"))  return { label: "RFQ", cls: "bg-primary-soft text-primary" };
  if (ref.startsWith("PO-"))  return { label: "PO",  cls: "bg-info-soft text-info" };
  if (ref.startsWith("GRN-")) return { label: "GRN", cls: "bg-success-soft text-success" };
  return null;
}

const TONE_CHIP = {
  primary: "bg-primary-soft text-primary",
  info:    "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger:  "bg-danger-soft text-danger",
};
const TONE_BAR = {
  primary: "bg-primary",
  info:    "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger:  "bg-danger",
};
const TONE_VALUE = {
  primary: "text-primary",
  info:    "text-text",
  success: "text-success",
  warning: "text-warning",
  danger:  "text-danger",
};

function VendorKpiCard({ to, icon: Icon, label, value, desc, tone = "info", loading }) {
  return (
    <Link
      to={to}
      className="bg-surface-container-lowest border border-border rounded-xl p-5 flex flex-col relative overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 shadow-sm group"
    >
      <div className={`absolute top-0 left-0 right-0 h-1 ${TONE_BAR[tone] ?? TONE_BAR.info} rounded-t-xl`} />
      <div className="flex items-start justify-between mt-1 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${TONE_CHIP[tone] ?? TONE_CHIP.info}`}>
          {Icon && <Icon className="h-5 w-5" />}
        </div>
        <ArrowRight className="h-4 w-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className={`text-3xl font-black leading-none ${TONE_VALUE[tone] ?? "text-text"}`}>
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
        ) : (
          value ?? 0
        )}
      </div>
      <div className="text-sm font-semibold text-text mt-2">{label}</div>
      {desc && <div className="text-xs text-text-muted mt-1">{desc}</div>}
    </Link>
  );
}

export default function VendorHome() {
  const user       = useAuthStore((s) => s.user);
  const rfqs       = useRFQStore((s) => s.items);
  const rfqLoading = useRFQStore((s) => s.loading);
  const fetchRFQs  = useRFQStore((s) => s.fetchAll);
  const pos        = usePOStore((s) => s.items);
  const poLoading  = usePOStore((s) => s.loading);
  const fetchPOs   = usePOStore((s) => s.fetchAll);
  const { vendorName } = useVendorIdentity();

  useEffect(() => {
    fetchRFQs();
    fetchPOs();
  }, [fetchRFQs, fetchPOs]);

  const firstName = (user?.name ?? "there").split(" ")[0];

  const stats = useMemo(() => {
    const open          = rfqs.filter((r) => r.status === "open" || r.status === "compared");
    const submittedByMe = vendorName
      ? rfqs.filter((r) => (r.responses ?? []).some((resp) => resp.vendor === vendorName))
      : [];
    const pendingPOs = pos.filter((p) => p.status === "pending").length;
    const activePOs  = pos.filter((p) => p.status === "accepted" || p.status === "fulfilled").length;
    const awarded    = vendorName
      ? rfqs.filter((r) => r.status === "awarded" && r.awarded_vendor === vendorName).length
      : 0;
    return { openRFQs: open.length, myQuotes: submittedByMe.length, pendingPOs, activePOs, awarded };
  }, [rfqs, pos, vendorName]);

  const tiles = [
    {
      to:    "/vendor/quotation-requests",
      icon:  Inbox,
      label: "Open RFQs",
      value: stats.openRFQs,
      desc:  stats.openRFQs === 0 ? "No new requests" : stats.openRFQs === 1 ? "Awaiting your response" : `${stats.openRFQs} awaiting response`,
      tone:  "primary",
    },
    {
      to:    "/vendor/quotations",
      icon:  FileText,
      label: "My Quotations",
      value: stats.myQuotes,
      desc:  stats.awarded > 0 ? `${stats.awarded} awarded to you` : stats.myQuotes === 0 ? "No submissions yet" : "Submitted to buyers",
      tone:  stats.awarded > 0 ? "success" : "info",
    },
    {
      to:    "/vendor/purchase-orders",
      icon:  ShoppingBag,
      label: "Purchase Orders",
      value: pos.length,
      desc:  stats.pendingPOs > 0 ? `${stats.pendingPOs} awaiting acceptance` : stats.activePOs > 0 ? `${stats.activePOs} active` : "No POs issued",
      tone:  stats.pendingPOs > 0 ? "warning" : "info",
    },
    {
      to:    "/vendor/invoices",
      icon:  ReceiptText,
      label: "Invoices",
      value: stats.activePOs,
      desc:  stats.activePOs === 0 ? "Accept a PO first" : `${stats.activePOs} invoiceable PO${stats.activePOs === 1 ? "" : "s"}`,
      tone:  "info",
    },
  ];

  const activity = useMemo(() => {
    const events = [];
    rfqs.slice(0, 5).forEach((r) => {
      const isAwardedToMe = r.status === "awarded" && vendorName && r.awarded_vendor === vendorName;
      const kind = isAwardedToMe ? "success" : (r.status === "closed" || r.status === "awarded") ? "danger" : "info";
      const verb = isAwardedToMe ? "awarded to you" : r.status === "awarded" ? "awarded to another vendor" : r.status === "closed" ? "closed" : "is open for bids";
      events.push({ key: `rfq-${r.number}`, ref: r.number, to: `/vendor/quotations/submit/${r.number}`, text: `RFQ ${verb}`, kind, ago: timeAgo(r.updated_at), ts: r.updated_at });
    });
    pos.slice(0, 3).forEach((p) => {
      const verb = p.status === "accepted" ? "accepted by you" : p.status === "rejected" ? "rejected by you" : p.status === "fulfilled" ? "marked fulfilled" : "needs your review";
      const kind = (p.status === "accepted" || p.status === "fulfilled") ? "success" : p.status === "rejected" ? "danger" : "warning";
      events.push({ key: `po-${p.number}`, ref: p.number, to: `/vendor/purchase-orders/${p.number}`, text: `PO ${verb}`, kind, ago: timeAgo(p.updated_at), ts: p.updated_at });
    });
    return events.sort((a, b) => (b.ts ?? "").localeCompare(a.ts ?? "")).slice(0, 8);
  }, [rfqs, pos, vendorName]);

  const loading = rfqLoading || poLoading;
  const noData  = rfqs.length === 0 && pos.length === 0 && !loading;

  const today = new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ── Hero Banner — neutral card ── */}
      <div className="bg-surface-container-lowest border border-border rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
              <Building2 className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0">
              <p className="text-text-muted text-sm font-medium">
                {getGreeting()}, {firstName}
              </p>
              <h1 className="text-xl sm:text-2xl font-black text-text leading-tight truncate">
                {vendorName ?? "Vendor Portal"}
              </h1>
              <p className="text-text-subtle text-xs mt-0.5">
                {today} · Vendor dashboard
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {stats.pendingPOs > 0 && (
              <Link
                to="/vendor/purchase-orders"
                className="flex items-center gap-2 bg-warning-soft text-warning px-3 py-1.5 rounded-lg text-xs font-bold border border-warning/20 hover:border-warning/40 transition-colors"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                {stats.pendingPOs} PO{stats.pendingPOs === 1 ? "" : "s"} to review
              </Link>
            )}
            {stats.openRFQs > 0 && (
              <Link
                to="/vendor/quotation-requests"
                className="flex items-center gap-2 bg-info-soft text-info px-3 py-1.5 rounded-lg text-xs font-bold border border-info/20 hover:border-info/40 transition-colors"
              >
                <Inbox className="h-3.5 w-3.5" />
                {stats.openRFQs} open RFQ{stats.openRFQs === 1 ? "" : "s"}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI Tiles ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((t) => (
          <VendorKpiCard
            key={t.to}
            {...t}
            loading={loading && rfqs.length === 0 && pos.length === 0}
          />
        ))}
      </div>

      {/* ── Activity + Sidebar ── */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* Activity feed */}
        <div className="lg:w-2/3">
          <div className="bg-surface-container-lowest border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-base font-bold text-text">Recent Activity</h2>
              {activity.length > 0 && (
                <span className="text-xs text-text-subtle">{activity.length} events</span>
              )}
            </div>
            {loading && activity.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-12 text-text-muted text-sm">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading activity…
              </div>
            ) : noData ? (
              <div className="text-center py-12 text-sm text-text-muted px-6">
                <Inbox className="h-12 w-12 mx-auto mb-3 text-text-subtle" strokeWidth={1.5} />
                <p className="font-semibold text-text mb-1">No activity yet</p>
                <p>A buyer will invite you to quote, and activity will appear here.</p>
              </div>
            ) : activity.length === 0 ? (
              <div className="text-center py-12 text-sm text-text-muted">Nothing recent to show.</div>
            ) : (
              <div>
                {activity.map((ev, i) => {
                  const style = ACTIVITY_KIND[ev.kind] ?? ACTIVITY_KIND.info;
                  const { Icon } = style;
                  const type = docTypePill(ev.ref);
                  const displayText = ev.text.replace(/^(PR|PO|RFQ|GRN) /, "");
                  return (
                    <Link
                      key={ev.key}
                      to={ev.to}
                      className={`relative flex items-center gap-4 px-6 py-4 hover:bg-surface-container-low transition-colors group${i === activity.length - 1 ? "" : " border-b border-border"}`}
                    >
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.bar}`} />
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${style.bg}`}>
                        <Icon className={`h-[18px] w-[18px] ${style.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 leading-tight">
                          {type && (
                            <span className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${type.cls}`}>
                              {type.label}
                            </span>
                          )}
                          <span className="text-sm text-text font-medium">{displayText}</span>
                        </div>
                        {ev.ref && (
                          <span className="text-xs font-mono text-text-muted mt-0.5 block">{ev.ref}</span>
                        )}
                      </div>
                      <div className="text-xs text-text-subtle whitespace-nowrap shrink-0">{ev.ago}</div>
                      <ChevronRight className="h-3.5 w-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="lg:w-1/3 flex flex-col gap-6">
          {/* Account card */}
          <div className="bg-surface-container-lowest border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-sm font-bold text-text uppercase tracking-wider">Your Account</h2>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-soft flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-text-muted">Name</div>
                  <div className="text-sm font-semibold text-text truncate">{user?.name ?? "—"}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-info-soft flex items-center justify-center shrink-0">
                  <Mail className="h-4 w-4 text-info" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-text-muted">Email</div>
                  <div className="text-sm font-semibold text-text truncate">{user?.email ?? "—"}</div>
                </div>
              </div>
              {vendorName && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-success-soft flex items-center justify-center shrink-0">
                    <Building2 className="h-4 w-4 text-success" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-text-muted">Company</div>
                    <div className="text-sm font-semibold text-text truncate">{vendorName}</div>
                  </div>
                </div>
              )}
              <Link
                to="/vendor/profile"
                className="mt-2 block text-center text-xs text-primary border border-primary/30 hover:bg-primary hover:text-primary-foreground py-2 rounded-lg transition-colors font-semibold"
              >
                Edit profile →
              </Link>
            </div>
          </div>

          {/* Quick links */}
          <div className="bg-surface-container-lowest border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-sm font-bold text-text uppercase tracking-wider">Quick Links</h2>
            </div>
            <div className="p-4 space-y-1">
              {[
                { to: "/vendor/quotation-requests", icon: Inbox,     label: "Browse open RFQs" },
                { to: "/vendor/purchase-orders",    icon: ShoppingBag, label: "See my POs" },
                { to: "/vendor/invoices/upload",    icon: ReceiptText, label: "Upload an invoice" },
                { to: "/vendor/application-status", icon: FileText,  label: "Application status" },
              ].map(({ to, icon: Icon, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text hover:bg-surface-container-low transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center group-hover:bg-primary transition-colors shrink-0">
                    <Icon className="h-3.5 w-3.5 text-text-muted group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <span className="group-hover:text-primary transition-colors">{label}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-text-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
