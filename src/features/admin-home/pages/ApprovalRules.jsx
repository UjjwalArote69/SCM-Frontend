import { useEffect, useMemo, useState } from "react";
import {
  Plus, ArrowRight, Loader2, ShieldCheck, FileText, ShoppingCart, Wallet,
  ChevronUp, ChevronDown, Power, Settings, Info, Trash2,
} from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import RuleDrawer from "../../approval-rules/components/RuleDrawer.jsx";
import useApprovalRulesStore from "../../approval-rules/store.js";
import useDepartmentsStore from "../../masters/departments/store.js";
import { useAuthStore } from "../../auth/store.js";
import approvalRulesApi from "../../approval-rules/api.js";
import { useToast } from "../../../hooks/useToast.jsx";

const ENTITY_META = {
  pr: {
    label: "Purchase Requests",
    short: "PR",
    icon: FileText,
    desc: "Approval flow for new purchase requests.",
    accent: "info",
  },
  po: {
    label: "Purchase Orders",
    short: "PO",
    icon: ShoppingCart,
    desc: "Internal approval before the vendor sees the PO.",
    accent: "warning",
  },
  payment: {
    label: "Payments",
    short: "Pay",
    icon: Wallet,
    desc: "Vendor payment release approval (typically by amount).",
    accent: "success",
  },
};

export default function ApprovalRulesPage() {
  const { items, loading, fetchAll } = useApprovalRulesStore();
  const departments = useDepartmentsStore((s) => s.items);
  const fetchDepartments = useDepartmentsStore((s) => s.fetchAll);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";
  const toast = useToast();

  const [drawer, setDrawer] = useState(null);
  const [activeTab, setActiveTab] = useState("pr");

  useEffect(() => {
    fetchAll().catch(() => {});
    fetchDepartments().catch(() => {});
  }, [fetchAll, fetchDepartments]);

  const grouped = useMemo(() => {
    const out = { pr: [], po: [], payment: [] };
    items.forEach((r) => { (out[r.entity] ?? (out[r.entity] = [])).push(r); });
    Object.values(out).forEach((arr) => arr.sort((a, b) => a.priority - b.priority || a.id - b.id));
    return out;
  }, [items]);

  const handleSaved = () => fetchAll().catch(() => {});

  // Swap priorities with neighbour to reorder within an entity
  const swapPriority = async (a, b) => {
    try {
      // Persist swap. Use a temp value to avoid unique-ish collisions visually.
      const aP = a.priority, bP = b.priority;
      await approvalRulesApi.update(a.id, { priority: bP });
      await approvalRulesApi.update(b.id, { priority: aP });
      await fetchAll();
    } catch (err) {
      toast.error("Reorder failed: " + (err?.response?.data?.message ?? err?.message));
    }
  };

  const toggleActive = async (rule) => {
    try {
      await approvalRulesApi.update(rule.id, { active: !rule.active });
      await fetchAll();
    } catch (err) {
      toast.error("Toggle failed: " + (err?.response?.data?.message ?? err?.message));
    }
  };

  const deleteRule = async (rule) => {
    if (!window.confirm(`Delete rule "${rule.name}"? This can't be undone — any in-flight ${rule.entity.toUpperCase()} records using this rule will fall back to the next matching rule.`)) return;
    try {
      await approvalRulesApi.remove(rule.id);
      await fetchAll();
      toast.success("Rule deleted");
    } catch (err) {
      toast.error("Delete failed: " + (err?.response?.data?.message ?? err?.message));
    }
  };

  const tabs = Object.entries(ENTITY_META);
  const tabRules = grouped[activeTab] ?? [];
  const tabMeta = ENTITY_META[activeTab];

  return (
    <div className="max-w-[1100px] mx-auto">
      <PageHeader
        title="Approval Rules"
        subtitle="Decide who has to approve what."
      />

      {/* Tab strip */}
      <div className="flex gap-2 mb-6 border-b border-border overflow-x-auto">
        {tabs.map(([key, meta]) => {
          const Icon = meta.icon;
          const isActive = activeTab === key;
          const count = grouped[key]?.length ?? 0;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${
                isActive ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text"
              }`}
            >
              <Icon className="h-4 w-4" />
              {meta.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? "bg-primary-soft" : "bg-surface-container-low"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab body */}
      <div>
        <div className="flex items-start justify-between mb-4 gap-3">
          <p className="text-sm text-text-muted">{tabMeta.desc}</p>
          {isAdmin && (
            <button
              onClick={() => setDrawer({ rule: { entity: activeTab } })}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary hover:brightness-110 text-primary-foreground text-sm font-bold shrink-0"
            >
              <Plus className="h-4 w-4" /> New rule
            </button>
          )}
        </div>

        {loading && tabRules.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading…
          </div>
        ) : tabRules.length === 0 ? (
          <EmptyState
            title={`No ${tabMeta.label.toLowerCase()} rules yet`}
            description={isAdmin
              ? "Without a rule, records are auto-approved. Click “New rule” to add an approval chain."
              : "Ask an admin to add one."}
          />
        ) : (
          <div className="space-y-2">
            {tabRules.map((r, i) => (
              <RuleCard
                key={r.id}
                rule={r}
                position={i + 1}
                isFirst={i === 0}
                isLast={i === tabRules.length - 1}
                isAdmin={isAdmin}
                onEdit={() => setDrawer({ rule: r })}
                onMove={(dir) => {
                  const j = i + dir;
                  if (j < 0 || j >= tabRules.length) return;
                  swapPriority(r, tabRules[j]);
                }}
                onToggle={() => toggleActive(r)}
                onDelete={() => deleteRule(r)}
              />
            ))}

            {tabRules.length > 1 && (
              <p className="text-xs text-text-muted mt-3 flex items-start gap-2">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                When several rules apply to the same record, the one listed first wins. Use the arrows to reorder.
              </p>
            )}
          </div>
        )}

        {activeTab === "pr" && (
          <div className="mt-8 bg-surface-container-low border border-border rounded-lg p-4 text-xs text-text-muted">
            <span className="font-semibold text-text">Note —</span>{" "}
            RFQ approval (3-party consensus → CFO → CEO) is built-in and not editable here. It uses a parallel-vote model that doesn't fit a linear chain.
          </div>
        )}
      </div>

      {drawer && isAdmin && (
        <RuleDrawer
          open
          rule={drawer.rule}
          departments={departments}
          allRules={items}
          onClose={() => setDrawer(null)}
          onSaved={handleSaved}
          onDeleted={handleSaved}
        />
      )}
    </div>
  );
}

function RuleCard({ rule, position, isFirst, isLast, isAdmin, onEdit, onMove, onToggle, onDelete }) {
  const isDefault = !rule.conditions || Object.keys(rule.conditions).length === 0;
  const condText = describeConditions(rule.conditions);

  return (
    <div
      className={`bg-surface-container-lowest border rounded-lg overflow-hidden ${
        rule.active ? "border-border" : "border-warning/30 opacity-70"
      }`}
    >
      <div className="flex items-stretch">
        {/* Left rail: order arrows */}
        {isAdmin && (
          <div className="flex flex-col bg-surface-container-low border-r border-border">
            <button disabled={isFirst} onClick={() => onMove(-1)}
                    className="flex-1 px-2 text-text-muted hover:text-primary disabled:opacity-30 hover:bg-surface-container">
              <ChevronUp className="h-4 w-4" />
            </button>
            <button disabled={isLast} onClick={() => onMove(1)}
                    className="flex-1 px-2 text-text-muted hover:text-primary disabled:opacity-30 hover:bg-surface-container border-t border-border">
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Body */}
        <div
          onClick={isAdmin ? onEdit : undefined}
          className={`flex-1 p-4 ${isAdmin ? "cursor-pointer hover:bg-surface-container-low/50" : ""}`}
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary-soft text-primary text-sm font-bold flex items-center justify-center shrink-0">
              {position}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-text">{rule.name}</h3>
                {!rule.active && (
                  <span className="flex items-center gap-1 text-xs text-warning"><Power className="h-3 w-3" /> Off</span>
                )}
                {isDefault && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-info-soft text-info">default</span>
                )}
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                {isDefault
                  ? "Applies to every record in this category."
                  : <>Applies when <span className="text-text font-medium">{condText}</span>.</>}
              </p>
              {rule.description && (
                <p className="text-xs text-text-subtle mt-1 line-clamp-2">{rule.description}</p>
              )}
            </div>
            {isAdmin && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); onToggle(); }}
                  className={`p-1.5 rounded hover:bg-surface-container ${rule.active ? "text-success" : "text-text-subtle"}`}
                  title={rule.active ? "Disable rule" : "Enable rule"}
                >
                  <Power className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(); }}
                  className="p-1.5 rounded hover:bg-surface-container text-text-muted"
                  title="Edit rule"
                >
                  <Settings className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="p-1.5 rounded hover:bg-danger-soft/40 text-text-muted hover:text-danger"
                  title="Delete rule"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Chain preview */}
          <div className="flex items-center gap-1.5 flex-wrap pl-11">
            {rule.stages.length === 0 ? (
              <span className="text-xs italic text-text-subtle">Auto-{rule.entity === "payment" ? "cleared" : "approved"} (no stages)</span>
            ) : rule.stages.map((s, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className="px-2.5 py-1 rounded-full bg-surface-container-low border border-border text-xs font-semibold text-text">
                  {s.label}
                  {s.department_code && (
                    <span className="ml-1 font-mono text-text-subtle">
                      @{s.department_code === ":requester_dept" ? "req" : s.department_code}
                    </span>
                  )}
                </span>
                {i < rule.stages.length - 1 && <ArrowRight className="h-3 w-3 text-text-subtle" />}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function describeConditions(c) {
  if (!c) return "";
  const bits = [];
  if (c.min_amount != null && c.max_amount != null) {
    bits.push(`amount is between ₹${fmtINR(c.min_amount)} and ₹${fmtINR(c.max_amount)}`);
  } else if (c.min_amount != null) {
    bits.push(`amount ≥ ₹${fmtINR(c.min_amount)}`);
  } else if (c.max_amount != null) {
    bits.push(`amount ≤ ₹${fmtINR(c.max_amount)}`);
  }
  if (c.department_code) bits.push(`department is ${c.department_code}`);
  if (c.project_code) bits.push(`project is ${c.project_code}`);
  if (c.vendor) bits.push(`vendor is "${c.vendor}"`);
  return bits.join(" and ");
}

const fmtINR = (n) => Number(n ?? 0).toLocaleString("en-IN");
