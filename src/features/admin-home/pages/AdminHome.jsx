import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Shield,
  Settings,
  ShoppingCart,
  ReceiptText,
  Boxes,
  BarChart3,
  Building2,
  FileSpreadsheet,
  PackageCheck,
  ArrowRight,
  AlertTriangle,
  Loader2,
  Activity,
} from "lucide-react";
import { useAuthStore } from "../../auth/store.js";
import { usePRStore } from "../../purchase-requests/store.js";
import { usePOStore } from "../../purchase-orders/store.js";
import { useRFQStore } from "../../quotations/store.js";
import { useGRNStore } from "../../grn/store.js";
import { useVendorsStore } from "../../masters/vendors/store.js";
import { useItemsStore } from "../../masters/items/store.js";
import { useUsersStore } from "../users/store.js";
import { ALL_ROLE_OPTIONS } from "../../../data/roles.js";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
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

function Tile({ to, icon: Icon, label, value, desc, tone = "info", loading }) {
  return (
    <Link
      to={to}
      className="glass-card rounded-2xl p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 shadow-sm group relative overflow-hidden block"
    >
      <div className={`absolute top-0 left-0 right-0 h-1 ${TONE_BAR[tone] ?? TONE_BAR.info} rounded-t-xl`} />
      <div className="flex items-start justify-between mt-1 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${TONE_CHIP[tone] ?? TONE_CHIP.info}`}>
          <Icon className="h-5 w-5" />
        </div>
        <ArrowRight className="h-4 w-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="text-3xl font-black text-text mb-1 leading-none">
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
        ) : (
          value
        )}
      </div>
      <div className="text-sm font-semibold text-text mt-2">{label}</div>
      <div className="text-xs text-text-muted mt-1">{desc}</div>
    </Link>
  );
}

export default function AdminHome() {
  const user = useAuthStore((s) => s.user);

  const prs        = usePRStore((s) => s.items);
  const prLoading  = usePRStore((s) => s.loading);
  const fetchPRs   = usePRStore((s) => s.fetchAll);

  const pos        = usePOStore((s) => s.items);
  const poLoading  = usePOStore((s) => s.loading);
  const fetchPOs   = usePOStore((s) => s.fetchAll);

  const rfqs       = useRFQStore((s) => s.items);
  const rfqLoading = useRFQStore((s) => s.loading);
  const fetchRFQs  = useRFQStore((s) => s.fetchAll);

  const grns       = useGRNStore((s) => s.items);
  const grnLoading = useGRNStore((s) => s.loading);
  const fetchGRNs  = useGRNStore((s) => s.fetchAll);

  const vendors        = useVendorsStore((s) => s.items);
  const vendorsLoading = useVendorsStore((s) => s.loading);
  const fetchVendors   = useVendorsStore((s) => s.fetchAll);

  const items        = useItemsStore((s) => s.items);
  const itemsLoading = useItemsStore((s) => s.loading);
  const fetchItems   = useItemsStore((s) => s.fetchAll);

  const users        = useUsersStore((s) => s.items);
  const usersLoading = useUsersStore((s) => s.loading);
  const fetchUsers   = useUsersStore((s) => s.fetchAll);

  useEffect(() => {
    fetchPRs();
    fetchPOs();
    fetchRFQs();
    fetchGRNs();
    fetchVendors();
    fetchItems();
    fetchUsers();
  }, [fetchPRs, fetchPOs, fetchRFQs, fetchGRNs, fetchVendors, fetchItems, fetchUsers]);

  const firstName = (user?.name ?? "Admin").split(" ")[0];

  const counts = useMemo(() => {
    const pendingPRs    = prs.filter((p) => p.status === "pending").length;
    const openPOs       = pos.filter((p) => p.status === "pending" || p.status === "accepted").length;
    const openRFQs      = rfqs.filter((r) => r.status === "open" || r.status === "compared").length;
    const partialGRNs   = grns.filter((g) => g.status === "partial").length;
    const pendingVendors = vendors.filter((v) => v.approval_status === "pending").length;
    const invitedUsers  = users.filter((u) => !u.email_verified_at).length;
    const poSpend       = pos.filter((p) => p.status !== "rejected").reduce((s, p) => s + (Number(p.total) || 0), 0);
    return { pendingPRs, openPOs, openRFQs, partialGRNs, pendingVendors, invitedUsers, poSpend };
  }, [prs, pos, rfqs, grns, vendors, users]);

  const tiles = [
    {
      to: "/admin/purchase-requests",
      icon: ShoppingCart,
      label: "Purchase Requests",
      value: prs.length,
      desc: counts.pendingPRs > 0 ? `${counts.pendingPRs} awaiting approval` : "All caught up",
      tone: counts.pendingPRs > 0 ? "warning" : "info",
      loading: prLoading && prs.length === 0,
    },
    {
      to: "/admin/purchase-orders",
      icon: ReceiptText,
      label: "Purchase Orders",
      value: pos.length,
      desc: counts.openPOs > 0 ? `${counts.openPOs} open · ₹${(counts.poSpend / 100000).toFixed(1)}L spend` : "No open POs",
      tone: "info",
      loading: poLoading && pos.length === 0,
    },
    {
      to: "/admin/quotations",
      icon: FileSpreadsheet,
      label: "Quotations",
      value: rfqs.length,
      desc: counts.openRFQs > 0 ? `${counts.openRFQs} open / compared` : "No active RFQs",
      tone: counts.openRFQs > 0 ? "primary" : "info",
      loading: rfqLoading && rfqs.length === 0,
    },
    {
      to: "/admin/grn",
      icon: PackageCheck,
      label: "Goods Received",
      value: grns.length,
      desc: counts.partialGRNs > 0 ? `${counts.partialGRNs} partial deliveries` : "No partials",
      tone: counts.partialGRNs > 0 ? "warning" : "info",
      loading: grnLoading && grns.length === 0,
    },
    {
      to: "/admin/vendors",
      icon: Building2,
      label: "Vendors",
      value: vendors.length,
      desc: counts.pendingVendors > 0 ? `${counts.pendingVendors} pending approval` : "All approved",
      tone: counts.pendingVendors > 0 ? "danger" : "info",
      loading: vendorsLoading && vendors.length === 0,
    },
    {
      to: "/admin/items",
      icon: Boxes,
      label: "Items",
      value: items.length,
      desc: items.length > 0 ? "In catalog" : "Catalog empty",
      tone: "info",
      loading: itemsLoading && items.length === 0,
    },
    {
      to: "/admin/users",
      icon: Users,
      label: "Users",
      value: users.length,
      desc: counts.invitedUsers > 0 ? `${counts.invitedUsers} not yet logged in` : "All active",
      tone: "info",
      loading: usersLoading && users.length === 0,
    },
    {
      to: "/admin/roles",
      icon: Shield,
      label: "Roles",
      value: ALL_ROLE_OPTIONS.length,
      desc: "Permission matrix",
      tone: "info",
    },
  ];

  const quickLinks = [
    { to: "/admin/approvals",     icon: Shield,        label: "Approval Rules" },
    { to: "/admin/reports",       icon: BarChart3,     label: "Reports" },
    { to: "/admin/settings",      icon: Settings,      label: "System Settings" },
    { to: "/admin/notifications", icon: AlertTriangle, label: "Notifications" },
  ];

  const pendingApprovals = useMemo(
    () =>
      prs
        .filter((p) => p.status === "pending")
        .slice(0, 6)
        .map((p) => ({
          id:        p.number,
          stage:     (p.chain_stage ?? "hod").toUpperCase(),
          title:     p.title ?? "—",
          requester: p.requester_name ?? "—",
          to:        `/admin/purchase-requests/${p.number}`,
        })),
    [prs],
  );

  const pendingVendorList = useMemo(
    () =>
      vendors
        .filter((v) => v.approval_status === "pending")
        .slice(0, 6)
        .map((v) => ({ code: v.code, name: v.vendor_name, email: v.email })),
    [vendors],
  );

  const today = new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">

      {/* ── Hero Banner — neutral card ── */}
      <div className="bg-surface-container-lowest border border-border rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
              <Activity className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0">
              <p className="text-text-muted text-sm font-medium">
                {getGreeting()}, {firstName}
              </p>
              <h1 className="text-xl sm:text-2xl font-black text-text leading-tight">
                System Overview
              </h1>
              <p className="text-text-subtle text-xs mt-0.5">
                {today} · Full admin access
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {counts.pendingPRs > 0 && (
              <Link
                to="/admin/purchase-requests"
                className="flex items-center gap-2 bg-warning-soft text-warning px-3 py-1.5 rounded-lg text-xs font-bold border border-warning/20 hover:border-warning/40 transition-colors"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                {counts.pendingPRs} pending PR{counts.pendingPRs === 1 ? "" : "s"}
              </Link>
            )}
            {counts.pendingVendors > 0 && (
              <Link
                to="/admin/vendors"
                className="flex items-center gap-2 bg-danger-soft text-danger px-3 py-1.5 rounded-lg text-xs font-bold border border-danger/20 hover:border-danger/40 transition-colors"
              >
                <Building2 className="h-3.5 w-3.5" />
                {counts.pendingVendors} vendor{counts.pendingVendors === 1 ? "" : "s"} pending
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((t) => (
          <Tile key={t.to} {...t} />
        ))}
      </div>

      {/* ── Approval queues + quick links ── */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* Pending PR approvals */}
        <div className="lg:w-2/3 glass-card rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-base font-bold text-text">Pending PR Approvals</h2>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                pendingApprovals.length > 0
                  ? "bg-warning text-primary-foreground"
                  : "bg-surface-container-high text-text-muted"
              }`}
            >
              {counts.pendingPRs}
            </span>
          </div>
          <div className="p-6">
            {prLoading && pendingApprovals.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                <Loader2 className="inline-block h-5 w-5 animate-spin mr-2" /> Loading…
              </div>
            ) : pendingApprovals.length === 0 ? (
              <p className="text-sm text-text-muted py-6 text-center">
                No PRs are waiting on anyone right now.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {pendingApprovals.map((p) => (
                  <Link
                    key={p.id}
                    to={p.to}
                    className="flex justify-between items-center py-3 hover:bg-surface-container-low -mx-2 px-2 rounded transition-colors group"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-text font-mono">{p.id}</div>
                      <div className="text-xs text-text-muted truncate">
                        {p.title} · by {p.requester}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-container-high text-text-muted">
                        {p.stage}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
            {counts.pendingPRs > pendingApprovals.length && (
              <Link
                to="/admin/purchase-requests"
                className="mt-4 block text-xs text-text-muted hover:text-primary text-center"
              >
                View all {counts.pendingPRs} →
              </Link>
            )}
          </div>
        </div>

        <div className="lg:w-1/3 flex flex-col gap-6">
          {/* Pending vendors */}
          <div className="glass-card rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-bold text-text uppercase tracking-wider">Pending Vendors</h2>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  pendingVendorList.length > 0
                    ? "bg-danger text-primary-foreground"
                    : "bg-surface-container-high text-text-muted"
                }`}
              >
                {counts.pendingVendors}
              </span>
            </div>
            <div className="p-5">
              {pendingVendorList.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-2">
                  No vendor applications waiting.
                </p>
              ) : (
                <div className="space-y-1">
                  {pendingVendorList.map((v) => (
                    <Link
                      key={v.code}
                      to="/admin/vendors"
                      className="flex items-center justify-between py-2 px-2 rounded hover:bg-surface-container-low transition-colors group"
                    >
                      <span className="text-sm text-text truncate">{v.name}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* System quick links */}
          <div className="glass-card rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-sm font-bold text-text uppercase tracking-wider">System</h2>
            </div>
            <div className="p-4 space-y-1">
              {quickLinks.map(({ to, icon: Icon, label }) => (
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
