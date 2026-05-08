import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Users, Shield, Settings, ShoppingCart, ReceiptText, Boxes, BarChart3,
  Building2, FileSpreadsheet, PackageCheck, ArrowRight, AlertTriangle,
  Activity, FileCheck2, UserCog, Briefcase, Plus, Wallet, FolderKanban,
  CheckCircle2, ChevronRight,
} from "lucide-react";
import { useAuthStore } from "../../auth/store.js";
import Skeleton from "../../../components/feedback/Skeleton.jsx";
import { usePRStore } from "../../purchase-requests/store.js";
import { usePOStore } from "../../purchase-orders/store.js";
import { useRFQStore } from "../../quotations/store.js";
import { useGRNStore } from "../../grn/store.js";
import { useVendorsStore } from "../../masters/vendors/store.js";
import { useItemsStore } from "../../masters/items/store.js";
import { useUsersStore } from "../users/store.js";
import { usePaymentStore } from "../../payments/store.js";
import useApprovalRulesStore from "../../approval-rules/store.js";
import useDepartmentsStore from "../../masters/departments/store.js";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const fmtCompactINR = (n) => {
  const v = Number(n ?? 0);
  if (Math.abs(v) >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (Math.abs(v) >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  if (Math.abs(v) >= 1e3) return `₹${(v / 1e3).toFixed(1)}k`;
  return `₹${Math.round(v)}`;
};

// ── Action card — top-row attention items ──────────────────────────────────
function ActionCard({ to, icon: Icon, label, count, desc, tone = "warning", cta = "Review" }) {
  const tones = {
    warning: { ring: "border-warning/30 hover:border-warning", chip: "bg-warning text-primary-foreground", icon: "bg-warning-soft text-warning" },
    danger:  { ring: "border-danger/30 hover:border-danger",   chip: "bg-danger text-primary-foreground",  icon: "bg-danger-soft text-danger" },
    info:    { ring: "border-info/30 hover:border-info",       chip: "bg-info text-primary-foreground",    icon: "bg-info-soft text-info" },
    success: { ring: "border-border hover:border-success",     chip: "bg-success-soft text-success",       icon: "bg-success-soft text-success" },
  };
  const t = tones[tone] ?? tones.warning;
  const isCalm = count === 0;
  return (
    <Link
      to={to}
      className={`group relative bg-surface-container-lowest border rounded-xl p-4 transition-all hover:shadow-md ${
        isCalm ? "border-border" : t.ring
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isCalm ? "bg-surface-container-low text-text-subtle" : t.icon}`}>
          {isCalm ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
        </div>
        <span className={`min-w-[28px] px-2 py-0.5 rounded-full text-xs font-bold ${
          isCalm ? "bg-surface-container-low text-text-subtle" : t.chip
        }`}>
          {count}
        </span>
      </div>
      <div className="text-sm font-bold text-text">{label}</div>
      <div className="text-xs text-text-muted mt-0.5 line-clamp-2">{desc}</div>
      <div className="flex items-center gap-1 text-xs font-semibold text-primary mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
        {cta} <ArrowRight className="h-3 w-3" />
      </div>
    </Link>
  );
}

// ── Quick action button — common admin operations ─────────────────────────
function QuickAction({ to, icon: Icon, label }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 p-3 bg-surface-container-lowest border border-border rounded-lg hover:border-primary hover:bg-primary-soft/30 transition-colors group"
    >
      <div className="w-8 h-8 rounded-md bg-primary-soft text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-sm font-semibold text-text flex-1">{label}</span>
      <ChevronRight className="h-4 w-4 text-text-subtle group-hover:text-primary transition-colors" />
    </Link>
  );
}

// ── Health stat — system state line item ──────────────────────────────────
function HealthStat({ icon: Icon, label, value, sub, to }) {
  const Wrap = to ? Link : "div";
  const wrapProps = to ? { to } : {};
  return (
    <Wrap
      {...wrapProps}
      className={`flex items-center gap-3 py-2.5 px-3 rounded-lg ${to ? "hover:bg-surface-container-low transition-colors group" : ""}`}
    >
      <div className="w-8 h-8 rounded-md bg-surface-container-low text-text-muted flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs uppercase tracking-wide text-text-muted font-semibold">{label}</div>
        <div className="text-sm font-bold text-text">
          {value} {sub && <span className="text-text-muted font-normal text-xs">· {sub}</span>}
        </div>
      </div>
      {to && <ChevronRight className="h-3.5 w-3.5 text-text-subtle opacity-0 group-hover:opacity-100 transition-opacity" />}
    </Wrap>
  );
}

export default function AdminHome() {
  const user = useAuthStore((s) => s.user);

  const prs       = usePRStore((s) => s.items);
  const fetchPRs  = usePRStore((s) => s.fetchAll);
  const pos       = usePOStore((s) => s.items);
  const fetchPOs  = usePOStore((s) => s.fetchAll);
  const rfqs      = useRFQStore((s) => s.items);
  const fetchRFQs = useRFQStore((s) => s.fetchAll);
  const grns      = useGRNStore((s) => s.items);
  const fetchGRNs = useGRNStore((s) => s.fetchAll);
  const vendors        = useVendorsStore((s) => s.items);
  const fetchVendors   = useVendorsStore((s) => s.fetchAll);
  const items          = useItemsStore((s) => s.items);
  const fetchItems     = useItemsStore((s) => s.fetchAll);
  const users          = useUsersStore((s) => s.items);
  const fetchUsers     = useUsersStore((s) => s.fetchAll);
  const payments       = usePaymentStore((s) => s.items);
  const fetchPayments  = usePaymentStore((s) => s.fetchAll);
  const rules          = useApprovalRulesStore((s) => s.items);
  const fetchRules     = useApprovalRulesStore((s) => s.fetchAll);
  const departments    = useDepartmentsStore((s) => s.items);
  const fetchDepts     = useDepartmentsStore((s) => s.fetchAll);

  useEffect(() => {
    fetchPRs(); fetchPOs(); fetchRFQs(); fetchGRNs();
    fetchVendors(); fetchItems(); fetchUsers();
    fetchPayments(); fetchRules(); fetchDepts();
  }, [fetchPRs, fetchPOs, fetchRFQs, fetchGRNs, fetchVendors, fetchItems, fetchUsers, fetchPayments, fetchRules, fetchDepts]);

  const firstName = (user?.name ?? "Admin").split(" ")[0];
  const today = new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  // ── Action queue counts ──────────────────────────────────────────────
  const counts = useMemo(() => {
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
    return {
      pendingPRs:       prs.filter((p) => p.status === "pending").length,
      pendingVendors:   vendors.filter((v) => v.approval_status === "pending" || v.status === "pending").length,
      pendingPOs:       pos.filter((p) => p.chain_stage && p.chain_stage !== "done"
                                          && !["accepted","rejected","fulfilled"].includes(p.status)).length,
      pendingPayments:  payments.filter((p) => p.chain_stage === "pending_cfo" || p.chain_stage === "pending_ceo").length,
      paymentsAmount:   payments.filter((p) => p.chain_stage === "pending_cfo" || p.chain_stage === "pending_ceo")
                                .reduce((s, p) => s + Number(p.amount || 0), 0),
      invitedUsers:     users.filter((u) => !u.email_verified_at).length,
      todaysPRs:        prs.filter((p) => new Date(p.created_at) >= todayMidnight).length,
      todaysPOs:        pos.filter((p) => new Date(p.created_at) >= todayMidnight).length,
      monthlySpend:     pos.filter((p) => p.po_date && new Date(p.po_date) >= startOfMonth)
                            .reduce((s, p) => s + Number(p.total || 0), 0),
      activePOs:        pos.filter((p) => ["accepted","pending"].includes(p.status) && p.chain_stage === "done").length,
    };
  }, [prs, vendors, pos, payments, users]);

  // ── Configuration health (rule coverage) ─────────────────────────────
  const ruleHealth = useMemo(() => {
    const byEntity = { pr: 0, po: 0, payment: 0 };
    rules.forEach((r) => { if (r.active) byEntity[r.entity] = (byEntity[r.entity] ?? 0) + 1; });
    return byEntity;
  }, [rules]);
  const missingRuleEntities = Object.entries(ruleHealth)
    .filter(([, n]) => n === 0)
    .map(([e]) => e);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* ── Hero — short, status-focused ───────────────────────────── */}
      <header className="bg-surface-container-lowest border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
            <Activity className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text-muted text-sm">{getGreeting()}, {firstName}</p>
            <h1 className="text-xl sm:text-2xl font-black text-text leading-tight">Control Center</h1>
            <p className="text-text-subtle text-xs">{today} · {users.length} users · {departments.length} departments · {rules.filter((r) => r.active).length} active rules</p>
          </div>
        </div>
      </header>

      {/* ── Action Queue — what needs admin attention ─────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-text uppercase tracking-wider">Needs your attention</h2>
          <span className="text-xs text-text-muted">
            {counts.pendingPRs + counts.pendingVendors + counts.pendingPOs + counts.pendingPayments + counts.invitedUsers + missingRuleEntities.length === 0
              ? "All clear"
              : "Click to resolve"}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <ActionCard
            to="/admin/vendors"
            icon={Building2}
            label="Vendor Applications"
            count={counts.pendingVendors}
            desc={counts.pendingVendors > 0 ? "Review and approve or suspend." : "No vendors waiting."}
            tone="danger"
            cta="Review applications"
          />
          <ActionCard
            to="/admin/purchase-requests"
            icon={ShoppingCart}
            label="Pending PRs"
            count={counts.pendingPRs}
            desc={counts.pendingPRs > 0 ? "Approval chains in progress — admin can override." : "No PRs awaiting approval."}
            tone="warning"
            cta="View queue"
          />
          <ActionCard
            to="/admin/purchase-orders"
            icon={ReceiptText}
            label="POs Awaiting Internal Approval"
            count={counts.pendingPOs}
            desc={counts.pendingPOs > 0 ? "Internal chain hasn't reached the vendor yet." : "No POs in chain."}
            tone="warning"
            cta="Inspect"
          />
          <ActionCard
            to="/admin/payments"
            icon={Wallet}
            label="Payments Pending CFO/CEO"
            count={counts.pendingPayments}
            desc={counts.pendingPayments > 0 ? `${fmtCompactINR(counts.paymentsAmount)} waiting on approval.` : "All payments cleared."}
            tone="warning"
            cta="View payments"
          />
          <ActionCard
            to="/admin/users"
            icon={UserCog}
            label="Users Never Logged In"
            count={counts.invitedUsers}
            desc={counts.invitedUsers > 0 ? "Invited but no login activity yet." : "All users have logged in."}
            tone="info"
            cta="Manage users"
          />
          <ActionCard
            to="/admin/approvals"
            icon={FileCheck2}
            label="Workflows Without Rules"
            count={missingRuleEntities.length}
            desc={missingRuleEntities.length > 0
              ? `${missingRuleEntities.map((e) => e.toUpperCase()).join(", ")} would auto-approve — add rules.`
              : "Every workflow has at least one rule."}
            tone="danger"
            cta="Configure"
          />
        </div>
      </section>

      {/* ── Quick configure — admin actions one click away ───────────── */}
      <section>
        <h2 className="text-sm font-bold text-text uppercase tracking-wider mb-3">Quick configure</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <QuickAction to="/admin/users"        icon={UserCog}    label="Add or edit users" />
          <QuickAction to="/admin/approvals"    icon={FileCheck2} label="Manage approval rules" />
          <QuickAction to="/admin/roles"        icon={Shield}     label="Roles &amp; permissions" />
          <QuickAction to="/admin/departments"  icon={Briefcase}  label="Departments" />
          <QuickAction to="/admin/items"        icon={Boxes}      label="Item catalog" />
          <QuickAction to="/admin/vendors"      icon={Users}      label="Vendor master" />
          <QuickAction to="/admin/companies"    icon={Building2}  label="Companies" />
          <QuickAction to="/admin/projects"     icon={FolderKanban} label="Projects" />
          <QuickAction to="/admin/settings"     icon={Settings}   label="Company settings" />
          <QuickAction to="/admin/reports"      icon={BarChart3}  label="Reports &amp; analytics" />
        </div>
      </section>

      {/* ── System health + Operations snapshot — compact info ─────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System health */}
        <div className="bg-surface-container-lowest border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-surface-container-low/40">
            <h2 className="text-sm font-bold text-text uppercase tracking-wider">System health</h2>
          </div>
          <div className="p-2 grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
            <div className="space-y-0.5">
              <HealthStat icon={UserCog}    label="Users"        value={users.length}        sub={`${users.filter((u) => u.email_verified_at).length} active`} to="/admin/users" />
              <HealthStat icon={Briefcase}  label="Departments"  value={departments.length}  to="/admin/departments" />
              <HealthStat icon={Boxes}      label="Items"        value={items.length}        to="/admin/items" />
              <HealthStat icon={Building2}  label="Vendors"      value={vendors.length}      sub={`${vendors.filter((v) => v.approval_status === "approved" || v.status === "approved").length} approved`} to="/admin/vendors" />
            </div>
            <div className="space-y-0.5">
              <HealthStat icon={FileCheck2} label="PR rules"      value={ruleHealth.pr}      sub={ruleHealth.pr === 0 ? "missing!" : "active"} to="/admin/approvals" />
              <HealthStat icon={FileCheck2} label="PO rules"      value={ruleHealth.po}      sub={ruleHealth.po === 0 ? "missing!" : "active"} to="/admin/approvals" />
              <HealthStat icon={FileCheck2} label="Payment rules" value={ruleHealth.payment} sub={ruleHealth.payment === 0 ? "missing!" : "active"} to="/admin/approvals" />
              <HealthStat icon={Shield}     label="Settings"      value="Configured" to="/admin/settings" />
            </div>
          </div>
        </div>

        {/* Operations snapshot */}
        <div className="bg-surface-container-lowest border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-surface-container-low/40 flex items-center justify-between">
            <h2 className="text-sm font-bold text-text uppercase tracking-wider">Operations today</h2>
            <Link to="/admin/reports" className="text-xs font-semibold text-primary hover:underline">
              Full reports →
            </Link>
          </div>
          <div className="p-2 grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
            <div className="space-y-0.5">
              <HealthStat icon={ShoppingCart}    label="PRs raised today" value={counts.todaysPRs} to="/admin/purchase-requests" />
              <HealthStat icon={ReceiptText}     label="POs issued today" value={counts.todaysPOs} to="/admin/purchase-orders" />
              <HealthStat icon={FileSpreadsheet} label="RFQs total"       value={rfqs.length}      to="/admin/quotations" />
              <HealthStat icon={PackageCheck}    label="GRNs total"       value={grns.length}      to="/admin/grn" />
            </div>
            <div className="space-y-0.5">
              <HealthStat icon={Wallet}      label="This month spend"     value={fmtCompactINR(counts.monthlySpend)} to="/admin/reports" />
              <HealthStat icon={ReceiptText} label="Active POs"           value={counts.activePOs}                  to="/admin/purchase-orders" />
              <HealthStat icon={Wallet}      label="Pending payments"     value={fmtCompactINR(counts.paymentsAmount)} to="/admin/payments" />
              <HealthStat icon={BarChart3}   label="Total POs"            value={pos.length}                       to="/admin/purchase-orders" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
