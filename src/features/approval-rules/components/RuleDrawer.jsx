import { useEffect, useMemo, useState } from "react";
import {
  Plus, GripVertical, Trash2, X, ChevronDown, ChevronRight,
  Crown, Briefcase, Banknote, User, Building2, ShieldCheck,
  Package, Calculator, AlertCircle, Sparkles, Loader2,
} from "lucide-react";
import Drawer from "../../../components/feedback/Drawer.jsx";
import { useToast } from "../../../hooks/useToast.jsx";
import approvalRulesApi from "../api.js";

const ENTITY_LABEL = {
  pr: "purchase request",
  po: "purchase order",
  payment: "payment",
};

const ENTITY_TITLE = {
  pr: "Purchase Request",
  po: "Purchase Order",
  payment: "Payment",
};

// ── Approver templates — what the user picks from "Add approver" ─────────────
// Each template knows how to produce a stage object. The template `id` is used
// only client-side; the resulting stage's `key` is what hits the backend.
const TEMPLATES = [
  { id: "hod_any",  label: "Department HOD (any)", icon: Briefcase, role: "hod",
    desc: "Any HOD can approve.",
    build: () => ({ key: "hod", role: "hod", label: "Department HOD" }) },
  { id: "hod_req", label: "Requesting Department's HOD", icon: ShieldCheck, role: "hod",
    desc: "The HOD of the department that raised the request. Auto-detected per record.",
    build: () => ({ key: "respective_hod", role: "hod",
      department_code: ":requester_dept", skip_if_dept_null: true,
      label: "Requesting Dept HOD" }) },
  { id: "hod_specific", label: "Specific Department HOD", icon: Building2, role: "hod",
    desc: "Lock to a single department (Purchase, Finance, etc.).",
    pickDept: true,
    build: ({ deptCode, deptName }) => ({
      key: `hod_${deptCode}`.toLowerCase(),
      role: "hod", department_code: deptCode,
      label: `${deptName ?? deptCode} HOD`,
    }) },
  { id: "cfo",  label: "CFO",  icon: Banknote, role: "cfo",
    desc: "Chief Financial Officer.",
    build: () => ({ key: "cfo", role: "cfo", label: "CFO" }) },
  { id: "ceo",  label: "CEO",  icon: Crown,    role: "ceo",
    desc: "Chief Executive Officer.",
    build: () => ({ key: "ceo", role: "ceo", label: "CEO" }) },
  { id: "director", label: "Director", icon: ShieldCheck, role: "director",
    desc: "Board-level director sign-off.",
    build: () => ({ key: "director", role: "director", label: "Director" }) },
  { id: "manager", label: "Manager", icon: User, role: "manager",
    desc: "Direct manager.",
    build: () => ({ key: "manager", role: "manager", label: "Manager" }) },
  { id: "purchase_officer", label: "Purchase Officer", icon: Package, role: "purchase_officer",
    desc: "A specific buyer in the Purchase team.",
    build: () => ({ key: "purchase_officer", role: "purchase_officer", label: "Purchase Officer" }) },
  { id: "accountant", label: "Accountant", icon: Calculator, role: "accountant",
    desc: "Accountant.",
    build: () => ({ key: "accountant", role: "accountant", label: "Accountant" }) },
];

const ROLE_ICON = {
  hod: Briefcase, cfo: Banknote, ceo: Crown, director: ShieldCheck,
  manager: User, purchase_officer: Package, accountant: Calculator,
};

const blankRule = {
  entity: "pr",
  name: "",
  description: "",
  priority: 100,
  active: true,
  conditions: {},
  stages: [],
};

const inputCls =
  "w-full bg-surface-container-lowest border border-border focus:border-primary rounded-md px-3 py-2 text-sm text-text outline-none";

export default function RuleDrawer({ open, onClose, rule, departments = [], onSaved, onDeleted, allRules = [] }) {
  const toast = useToast();
  const isNew = !rule?.id;
  const [form, setForm] = useState(() => normalize(rule ?? blankRule));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [picker, setPicker] = useState(null); // null | "open" | { templateId, … } when picking dept

  useEffect(() => {
    setForm(normalize(rule ?? blankRule));
    setErrors({});
    setShowAdvanced(false);
  }, [rule?.id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setCond = (k, v) =>
    setForm((f) => {
      const next = { ...f.conditions };
      if (v === null || v === undefined || v === "") delete next[k];
      else next[k] = v;
      return { ...f, conditions: next };
    });

  const addStage = (stage) => {
    // Ensure key uniqueness within this rule
    const used = new Set(form.stages.map((s) => s.key));
    let key = stage.key;
    let i = 2;
    while (used.has(key)) { key = `${stage.key}_${i++}`; }
    setForm((f) => ({ ...f, stages: [...f.stages, { ...stage, key }] }));
    setPicker(null);
  };

  const updateStage = (i, patch) =>
    setForm((f) => ({ ...f, stages: f.stages.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) }));

  const removeStage = (i) =>
    setForm((f) => ({ ...f, stages: f.stages.filter((_, idx) => idx !== i) }));

  const moveStage = (i, dir) =>
    setForm((f) => {
      const j = i + dir;
      if (j < 0 || j >= f.stages.length) return f;
      const next = [...f.stages];
      [next[i], next[j]] = [next[j], next[i]];
      return { ...f, stages: next };
    });

  const save = async () => {
    setErrors({});
    const local = {};
    if (!form.name?.trim()) local.name = "Give this rule a name";
    if (Object.keys(local).length) { setErrors(local); return; }

    // Auto-priority for new rules: lowest existing priority for this entity, +100
    const autoPriority = (() => {
      const sameEntity = allRules.filter((r) => r.entity === form.entity);
      if (sameEntity.length === 0) return 100;
      const maxP = Math.max(...sameEntity.map((r) => r.priority ?? 100));
      return maxP + 100;
    })();

    const payload = {
      ...form,
      priority: Number(form.priority) || (isNew ? autoPriority : 100),
      conditions: cleanConditions(form.conditions),
      stages: form.stages.map((s) => clean(s)),
    };

    setSaving(true);
    try {
      const saved = isNew
        ? await approvalRulesApi.create(payload)
        : await approvalRulesApi.update(rule.id, payload);
      toast.success(`Rule ${isNew ? "created" : "saved"}`);
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      const data = err?.response?.data;
      if (data?.errors) setErrors(flattenErrors(data.errors));
      toast.error(data?.message ?? err?.message ?? "Save failed");
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!rule?.id) return;
    if (!window.confirm(`Delete "${rule.name}"? This can't be undone.`)) return;
    setDeleting(true);
    try {
      await approvalRulesApi.remove(rule.id);
      toast.success("Rule deleted");
      onDeleted?.(rule);
      onClose?.();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? err?.message ?? "Delete failed");
    } finally { setDeleting(false); }
  };

  return (
    <Drawer
      open={open}
      title={isNew
        ? `New ${ENTITY_TITLE[form.entity]} Rule`
        : `Edit ${ENTITY_TITLE[form.entity]} Rule`}
      onClose={onClose}
      width="640px"
      footer={
        <>
          {!isNew && (
            <button onClick={remove} disabled={deleting || saving}
                    className="px-4 py-2 text-sm font-medium text-danger border border-danger/30 rounded-md hover:bg-danger-soft/40 disabled:opacity-50 mr-auto">
              {deleting ? "Deleting…" : "Delete"}
            </button>
          )}
          <button onClick={onClose} disabled={saving || deleting}
                  className="px-4 py-2 text-sm font-medium text-text border border-border rounded-md hover:bg-surface-container-low disabled:opacity-50">
            Cancel
          </button>
          <button onClick={save} disabled={saving || deleting}
                  className="px-6 py-2 text-sm font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-md disabled:opacity-50">
            {saving ? "Saving…" : isNew ? "Create Rule" : "Save"}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {/* ── Live preview banner ────────────────────────────────────────── */}
        <PreviewBanner form={form} />

        {/* ── Name ──────────────────────────────────────────────────────── */}
        <div>
          <label className="block text-xs font-bold text-text-muted mb-1.5 uppercase tracking-wide">Rule name</label>
          <input
            className={`${inputCls} ${errors.name ? "border-danger" : ""}`}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder={`e.g. "Standard ${ENTITY_LABEL[form.entity]} approval"`}
          />
          {errors.name && <p className="text-xs text-danger mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.name}</p>}
          <p className="text-xs text-text-muted mt-2">
            This rule applies to <span className="font-semibold text-text">{ENTITY_TITLE[form.entity]}s</span>.
            {isNew && " To create a rule for a different workflow, close this and switch to that tab first."}
          </p>
        </div>

        {/* ── Conditions ────────────────────────────────────────────────── */}
        <ConditionsSection form={form} setCond={setCond} departments={departments} />

        {/* ── Stages ────────────────────────────────────────────────────── */}
        <StagesSection
          stages={form.stages}
          entity={form.entity}
          departments={departments}
          onAdd={() => setPicker("open")}
          onUpdate={updateStage}
          onRemove={removeStage}
          onMove={moveStage}
        />

        {/* ── Advanced ──────────────────────────────────────────────────── */}
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center gap-1 text-xs text-text-muted hover:text-text font-semibold"
        >
          {showAdvanced ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Advanced
        </button>
        {showAdvanced && (
          <div className="space-y-3 pl-4 border-l-2 border-border">
            <div>
              <label className="block text-xs font-bold text-text-muted mb-1.5 uppercase tracking-wide">Description</label>
              <textarea rows={2} className={`${inputCls} resize-none`}
                        value={form.description ?? ""} onChange={(e) => set("description", e.target.value)}
                        placeholder="What is this rule for? Useful when there are many." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5 uppercase tracking-wide">Priority</label>
                <input type="number" min={1} max={9999} className={inputCls}
                       value={form.priority} onChange={(e) => set("priority", e.target.value)} />
                <p className="text-xs text-text-muted mt-1">Lower number wins on tie. New rules get the next available value.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5 uppercase tracking-wide">Status</label>
                <label className="flex items-center gap-2 cursor-pointer h-[38px]">
                  <input type="checkbox" checked={!!form.active} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4 rounded text-primary" />
                  <span className="text-sm text-text">Active</span>
                  {!form.active && <span className="text-xs text-warning">(disabled — won't fire)</span>}
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {picker && (
        <ApproverPicker
          departments={departments}
          existingStages={form.stages}
          onPick={addStage}
          onClose={() => setPicker(null)}
        />
      )}
    </Drawer>
  );
}

// ── Live preview banner ─────────────────────────────────────────────────────
function PreviewBanner({ form }) {
  const condText = describeConditions(form.conditions);
  const entityWord = ENTITY_LABEL[form.entity] ?? "record";

  return (
    <div className="bg-primary-soft/40 border border-primary/30 rounded-lg p-4">
      <div className="flex items-center gap-2 text-xs text-primary font-bold uppercase tracking-wide mb-2">
        <Sparkles className="h-3.5 w-3.5" /> Live preview
      </div>
      <p className="text-sm text-text mb-3">
        When a {entityWord} {condText.length === 0 ? "is created" : <>matches <span className="font-semibold">{condText}</span></>},
        {" "}it will need approval from:
      </p>
      <div className="flex items-center gap-1.5 flex-wrap">
        {form.stages.length === 0 ? (
          <span className="text-sm italic text-text-muted">Nobody — it will be auto-{form.entity === "payment" ? "cleared" : "approved"}.</span>
        ) : form.stages.map((s, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <StageChip stage={s} />
            {i < form.stages.length - 1 && <span className="text-text-muted">→</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

function StageChip({ stage }) {
  const Icon = ROLE_ICON[stage.role] ?? User;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-lowest border border-primary/30 text-xs">
      <Icon className="h-3 w-3 text-primary" />
      <span className="font-semibold text-text">{stage.label}</span>
    </span>
  );
}

// ── Conditions section ──────────────────────────────────────────────────────
function ConditionsSection({ form, setCond, departments }) {
  const c = form.conditions;
  const has = {
    amount: c.min_amount != null || c.max_amount != null,
    dept: !!c.department_code,
    project: !!c.project_code,
    vendor: !!c.vendor,
  };

  const toggle = (k, on) => {
    if (k === "amount") {
      if (!on) { setCond("min_amount", ""); setCond("max_amount", ""); }
      else if (c.min_amount == null && c.max_amount == null) setCond("min_amount", 0);
    } else if (k === "dept") {
      if (!on) setCond("department_code", "");
      else if (departments[0]) setCond("department_code", departments[0].code);
    } else if (k === "project") {
      if (!on) setCond("project_code", "");
      else setCond("project_code", " ");
    } else if (k === "vendor") {
      if (!on) setCond("vendor", "");
      else setCond("vendor", " ");
    }
  };

  return (
    <div>
      <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-wide">When does this rule apply?</label>
      <div className="bg-surface-container-low border border-border rounded-lg p-3 space-y-2">
        <FilterToggle on={!has.amount && !has.dept && !has.project && !has.vendor} label="All requests" disabled />

        <FilterToggle on={has.amount} label="Filter by amount" onToggle={(v) => toggle("amount", v)}>
          <div className="flex items-center gap-2 mt-2 pl-7">
            <span className="text-xs text-text-muted">From ₹</span>
            <input type="number" min={0} className={`${inputCls} w-32`} value={c.min_amount ?? ""}
                   onChange={(e) => setCond("min_amount", e.target.value === "" ? null : Number(e.target.value))} placeholder="0" />
            <span className="text-xs text-text-muted">to ₹</span>
            <input type="number" min={0} className={`${inputCls} w-32`} value={c.max_amount ?? ""}
                   onChange={(e) => setCond("max_amount", e.target.value === "" ? null : Number(e.target.value))} placeholder="∞" />
          </div>
        </FilterToggle>

        <FilterToggle on={has.dept} label="Filter by department" onToggle={(v) => toggle("dept", v)}>
          <div className="pl-7 mt-2">
            <select className={`${inputCls} w-64`} value={c.department_code ?? ""}
                    onChange={(e) => setCond("department_code", e.target.value)}>
              {departments.map((d) => <option key={d.code} value={d.code}>{d.code} — {d.name}</option>)}
            </select>
          </div>
        </FilterToggle>

        <FilterToggle on={has.project} label="Filter by project" onToggle={(v) => toggle("project", v)}>
          <div className="pl-7 mt-2">
            <input className={`${inputCls} w-64`} value={c.project_code ?? ""}
                   onChange={(e) => setCond("project_code", e.target.value)} placeholder="Project code" />
          </div>
        </FilterToggle>

        <FilterToggle on={has.vendor} label="Filter by vendor" onToggle={(v) => toggle("vendor", v)}>
          <div className="pl-7 mt-2">
            <input className={`${inputCls} w-64`} value={c.vendor ?? ""}
                   onChange={(e) => setCond("vendor", e.target.value)} placeholder="Vendor name (exact match)" />
          </div>
        </FilterToggle>
      </div>
    </div>
  );
}

function FilterToggle({ on, label, onToggle, disabled, children }) {
  return (
    <div>
      <label className={`flex items-center gap-2 ${disabled ? "" : "cursor-pointer"}`}>
        <input
          type="checkbox"
          checked={on}
          disabled={disabled}
          onChange={(e) => onToggle?.(e.target.checked)}
          className="h-4 w-4 rounded text-primary disabled:opacity-100"
        />
        <span className={`text-sm ${on ? "font-semibold text-text" : "text-text-muted"}`}>{label}</span>
      </label>
      {on && children}
    </div>
  );
}

// ── Stages section ──────────────────────────────────────────────────────────
function StagesSection({ stages, entity, departments, onAdd, onUpdate, onRemove, onMove }) {
  return (
    <div>
      <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-wide">Approval chain</label>
      <div className="bg-surface-container-low border border-border rounded-lg p-3">
        {stages.length === 0 ? (
          <div className="text-center py-6 text-sm text-text-muted">
            No approvers yet — records will be auto-{entity === "payment" ? "cleared" : "approved"}.
          </div>
        ) : (
          <div className="space-y-2">
            {stages.map((s, i) => (
              <StageCard
                key={i}
                stage={s}
                position={i + 1}
                isLast={i === stages.length - 1}
                canMoveUp={i > 0}
                canMoveDown={i < stages.length - 1}
                departments={departments}
                onUpdate={(patch) => onUpdate(i, patch)}
                onRemove={() => onRemove(i)}
                onMove={(dir) => onMove(i, dir)}
              />
            ))}
          </div>
        )}
        <button
          onClick={onAdd}
          className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-border hover:border-primary text-text-muted hover:text-primary rounded-md text-sm font-semibold transition-colors"
        >
          <Plus className="h-4 w-4" /> Add approver
        </button>
      </div>
    </div>
  );
}

function StageCard({ stage, position, isLast, canMoveUp, canMoveDown, departments, onUpdate, onRemove, onMove }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = ROLE_ICON[stage.role] ?? User;
  const isReqDept = stage.department_code === ":requester_dept";

  return (
    <div>
      <div className="bg-surface-container-lowest border border-border rounded-md group hover:border-primary transition-colors">
        <div className="flex items-center gap-2 p-2.5">
          <div className="flex flex-col gap-0.5 text-text-subtle">
            <button disabled={!canMoveUp} onClick={() => onMove(-1)} className="hover:text-primary disabled:opacity-30">
              <ChevronDown className="h-3 w-3 rotate-180" />
            </button>
            <button disabled={!canMoveDown} onClick={() => onMove(1)} className="hover:text-primary disabled:opacity-30">
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
          <div className="w-7 h-7 rounded-full bg-primary-soft text-primary text-xs font-bold flex items-center justify-center shrink-0">
            {position}
          </div>
          <div className="w-9 h-9 rounded-md bg-primary-soft text-primary flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-text text-sm truncate">{stage.label}</div>
            <div className="text-xs text-text-muted truncate">
              {describeStage(stage)}
            </div>
          </div>
          <button onClick={() => setExpanded((v) => !v)} className="p-1.5 text-text-muted hover:text-primary">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <button onClick={onRemove} className="p-1.5 text-text-muted hover:text-danger" title="Remove approver">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        {expanded && (
          <div className="border-t border-border p-3 space-y-3 bg-surface-container">
            <div>
              <label className="block text-xs font-bold text-text-muted mb-1 uppercase tracking-wide">Display name</label>
              <input className={inputCls} value={stage.label} onChange={(e) => onUpdate({ label: e.target.value })} />
            </div>
            {stage.role === "hod" && !isReqDept && (
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1 uppercase tracking-wide">Department</label>
                <select className={inputCls} value={stage.department_code ?? ""}
                        onChange={(e) => onUpdate({ department_code: e.target.value || undefined })}>
                  <option value="">(any department)</option>
                  {departments.map((d) => <option key={d.code} value={d.code}>{d.code} — {d.name}</option>)}
                </select>
              </div>
            )}
            {isReqDept && (
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!stage.skip_if_dept_null}
                  onChange={(e) => onUpdate({ skip_if_dept_null: e.target.checked })}
                  className="h-4 w-4 rounded text-primary mt-0.5"
                />
                <span className="text-text-muted">Skip this stage when the request has no department.</span>
              </label>
            )}
          </div>
        )}
      </div>
      {!isLast && (
        <div className="flex justify-center py-1">
          <div className="w-px h-3 bg-border" />
        </div>
      )}
    </div>
  );
}

// ── Approver picker (simple modal) ──────────────────────────────────────────
function ApproverPicker({ departments, existingStages, onPick, onClose }) {
  const [chosen, setChosen] = useState(null);
  const [chosenDept, setChosenDept] = useState(departments[0]?.code ?? "");

  const handlePick = () => {
    if (!chosen) return;
    const tmpl = TEMPLATES.find((t) => t.id === chosen);
    if (!tmpl) return;
    if (tmpl.pickDept) {
      const d = departments.find((x) => x.code === chosenDept);
      onPick(tmpl.build({ deptCode: chosenDept, deptName: d?.name }));
    } else {
      onPick(tmpl.build());
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface-container-lowest border border-border rounded-lg w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-base font-bold text-text">Add approver</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text"><X className="h-4 w-4" /></button>
        </header>
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {TEMPLATES.map((t) => {
            const Icon = t.icon;
            const isChosen = chosen === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setChosen(t.id)}
                className={`w-full flex items-start gap-3 p-3 rounded-md border text-left transition-colors ${
                  isChosen ? "border-primary bg-primary-soft/50" : "border-border hover:border-primary/50 hover:bg-surface-container-low"
                }`}
              >
                <div className="w-9 h-9 rounded-md bg-primary-soft text-primary flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-text text-sm">{t.label}</div>
                  <div className="text-xs text-text-muted">{t.desc}</div>
                  {isChosen && t.pickDept && (
                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                      <select
                        className={inputCls}
                        value={chosenDept}
                        onChange={(e) => setChosenDept(e.target.value)}
                      >
                        {departments.map((d) => <option key={d.code} value={d.code}>{d.code} — {d.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        <footer className="px-5 py-3 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text border border-border rounded-md hover:bg-surface-container-low">Cancel</button>
          <button onClick={handlePick} disabled={!chosen} className="px-5 py-2 text-sm font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-md disabled:opacity-50">
            Add
          </button>
        </footer>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function describeStage(s) {
  const dept = s.department_code;
  if (s.role === "hod") {
    if (!dept) return "Any HOD";
    if (dept === ":requester_dept") return "HOD of the requesting department";
    return `${dept} HOD`;
  }
  return s.role.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function describeConditions(c) {
  if (!c) return "";
  const bits = [];
  if (c.min_amount != null && c.max_amount != null) {
    bits.push(`amount between ₹${fmtINR(c.min_amount)} and ₹${fmtINR(c.max_amount)}`);
  } else if (c.min_amount != null) {
    bits.push(`amount ≥ ₹${fmtINR(c.min_amount)}`);
  } else if (c.max_amount != null) {
    bits.push(`amount ≤ ₹${fmtINR(c.max_amount)}`);
  }
  if (c.department_code) bits.push(`department ${c.department_code}`);
  if (c.project_code?.trim()) bits.push(`project ${c.project_code.trim()}`);
  if (c.vendor?.trim()) bits.push(`vendor "${c.vendor.trim()}"`);
  return bits.join(" and ");
}

const fmtINR = (n) => Number(n ?? 0).toLocaleString("en-IN");

function clean(stage) {
  const out = { key: stage.key, label: stage.label, role: stage.role };
  if (stage.department_code) out.department_code = stage.department_code;
  if (stage.skip_if_dept_null) out.skip_if_dept_null = true;
  return out;
}

function cleanConditions(c) {
  const out = {};
  Object.entries(c ?? {}).forEach(([k, v]) => {
    if (v === "" || v === null || v === undefined) return;
    if (k === "min_amount" || k === "max_amount") {
      const n = Number(v);
      if (!isNaN(n)) out[k] = n;
    } else if (typeof v === "string" && v.trim() === "") {
      // skip
    } else {
      out[k] = typeof v === "string" ? v.trim() : v;
    }
  });
  return out;
}

function normalize(rule) {
  return {
    ...blankRule,
    ...rule,
    description: rule.description ?? "",
    priority: rule.priority ?? 100,
    active: rule.active ?? true,
    conditions: rule.conditions ?? {},
    stages: (rule.stages ?? []).map((s) => ({
      key: s.key ?? "",
      label: s.label ?? "",
      role: s.role ?? "hod",
      department_code: s.department_code ?? "",
      skip_if_dept_null: !!s.skip_if_dept_null,
    })),
  };
}

function flattenErrors(errs) {
  const flat = {};
  Object.entries(errs).forEach(([k, v]) => (flat[k] = Array.isArray(v) ? v[0] : v));
  return flat;
}
