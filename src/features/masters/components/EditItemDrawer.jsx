import { useEffect, useState } from "react";
import { Plus, Trash2, AlertCircle, Loader2, Info } from "lucide-react";
import Drawer from "../../../components/feedback/Drawer.jsx";
import { useToast } from "../../../hooks/useToast.jsx";
import { useItemsStore } from "../items/store.js";

const inputCls = (error) =>
  `w-full bg-surface-container-lowest border-0 border-b-2 ${
    error ? "border-danger bg-danger-soft/30" : "border-outline-variant"
  } focus:border-primary px-3 py-2 text-sm text-text outline-none`;

// Match the seeded catalog. Free-text "category" stays valid — admin can type
// anything; this list is just convenience.
const CATEGORIES = [
  "IT Equipment",
  "Office Supplies",
  "Industrial / MRO",
  "Raw Material",
  "Electrical",
  "PPE / Safety",
  "Furniture",
  "Hardware / Tools",
  "Housekeeping",
];

const UOMS = ["EA", "KG", "RL", "SET", "BOX", "LTR", "MTR", "PCS", "NOS", "PACK", "PAIR"];

function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="text-xs text-danger mt-1 font-medium flex items-center gap-1">
      <AlertCircle className="h-3 w-3" /> {message}
    </p>
  );
}

function initialForm(item) {
  const hints = item?.spec_hints && typeof item.spec_hints === "object"
    ? Object.entries(item.spec_hints).map(([key, hint]) => ({ key, hint }))
    : [];
  if (item && item.code) {
    return {
      code: item.code,
      name: item.name ?? "",
      category: item.category ?? "",
      uom: item.uom ?? "EA",
      price: item.price ?? 0,
      hsn_code: item.hsn_code ?? "",
      description: item.description ?? "",
      active: item.active ?? true,
      specHintRows: hints,
    };
  }
  return {
    code: "",
    name: "",
    category: "",
    uom: "EA",
    price: 0,
    hsn_code: "",
    description: "",
    active: true,
    specHintRows: [],
  };
}

function EditItemDrawerInner({ item, onClose }) {
  const isNew = !item?.code;
  const toast = useToast();
  const createItem = useItemsStore((s) => s.create);
  const updateItem = useItemsStore((s) => s.update);

  const [form, setForm] = useState(() => initialForm(item));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Reset state when switching between items (drawer keeps mounted while open)
  useEffect(() => {
    setForm(initialForm(item));
    setErrors({});
  }, [item?.code]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((p) => {
      if (!p[k]) return p;
      const next = { ...p };
      delete next[k];
      return next;
    });
  };

  const addHintRow = () =>
    setForm((f) => ({ ...f, specHintRows: [...f.specHintRows, { key: "", hint: "" }] }));
  const updateHintRow = (idx, patch) =>
    setForm((f) => ({
      ...f,
      specHintRows: f.specHintRows.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    }));
  const removeHintRow = (idx) =>
    setForm((f) => ({ ...f, specHintRows: f.specHintRows.filter((_, i) => i !== idx) }));

  const codeChanged = !isNew && form.code.trim().toUpperCase() !== (item?.code ?? "");

  const save = async () => {
    const next = {};
    if (!form.code.trim()) next.code = "Code is required";
    else if (!/^[A-Z0-9_-]{2,64}$/i.test(form.code.trim()))
      next.code = "2–64 chars, letters / numbers / _ / - only";
    if (!form.name.trim()) next.name = "Name is required";
    setErrors(next);
    if (Object.keys(next).length) return;

    // Collapse spec_hints rows back into an object {key: hint}.
    // Rows with blank keys are dropped; duplicate keys: last wins.
    const specHints = {};
    for (const row of form.specHintRows) {
      const k = row.key?.trim();
      if (!k) continue;
      specHints[k] = (row.hint ?? "").trim();
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category || null,
        uom: form.uom,
        price: Number(form.price) || 0,
        hsn_code: form.hsn_code?.trim() || null,
        description: form.description?.trim() || null,
        spec_hints: Object.keys(specHints).length ? specHints : null,
        active: form.active,
      };
      if (isNew) {
        await createItem({ ...payload, code: form.code.trim().toUpperCase() });
        toast.success(`Item ${form.code.trim().toUpperCase()} created`);
      } else {
        // Always send code on update; backend treats it as a no-op when unchanged.
        const updated = await updateItem(item.code, {
          ...payload,
          code: form.code.trim().toUpperCase(),
        });
        toast.success(
          codeChanged
            ? `Renamed ${item.code} → ${updated.code}`
            : `Item ${updated.code} saved`,
        );
      }
      onClose?.();
    } catch (err) {
      const serverErrors = err?.response?.data?.errors;
      if (serverErrors && typeof serverErrors === "object") {
        const flat = Object.fromEntries(
          Object.entries(serverErrors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
        );
        setErrors(flat);
      }
      toast.error(err?.response?.data?.message ?? err?.message ?? "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">
          Item Code *
        </label>
        <input
          className={`${inputCls(errors.code)} font-mono`}
          value={form.code}
          onChange={(e) => set("code", e.target.value.toUpperCase())}
          placeholder="e.g. MK-IT-0001 / LAPTOP-001"
          maxLength={64}
        />
        <FieldError message={errors.code} />
        {!isNew && codeChanged && (
          <p className="text-xs text-warning mt-1 font-medium flex items-start gap-1.5">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            Renaming from <span className="font-mono">{item.code}</span> to{" "}
            <span className="font-mono">{form.code.trim().toUpperCase()}</span>.
            Existing PRs / POs / GRNs that referenced{" "}
            <span className="font-mono">{item.code}</span> keep that snapshot —
            only future selections will use the new code.
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">
          Name *
        </label>
        <input
          className={inputCls(errors.name)}
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Laptop"
        />
        <FieldError message={errors.name} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">
            Category
          </label>
          <input
            list="item-cat-options"
            className={inputCls(errors.category)}
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            placeholder="Pick or type a new one"
          />
          <datalist id="item-cat-options">
            {CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">
            UOM
          </label>
          <select
            className={inputCls(errors.uom)}
            value={form.uom}
            onChange={(e) => set("uom", e.target.value)}
          >
            {UOMS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">
            Standard Price (₹)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputCls(errors.price)}
            value={form.price}
            onChange={(e) => set("price", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">
            HSN Code
          </label>
          <input
            className={`${inputCls(errors.hsn_code)} font-mono`}
            placeholder="e.g. 8471"
            value={form.hsn_code}
            onChange={(e) => set("hsn_code", e.target.value)}
          />
          <FieldError message={errors.hsn_code} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">
          Description
        </label>
        <textarea
          rows={2}
          className={`${inputCls(errors.description)} resize-none`}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Short factual description shown on PR/RFQ/PO"
        />
      </div>

      {/* spec_hints editor — key/hint rows, rendered as placeholder fields when
          the user picks this item on a PR/RFQ. */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-text-muted uppercase">
            Specification Fields
          </label>
          <button
            type="button"
            onClick={addHintRow}
            className="flex items-center gap-1 text-xs font-bold text-info hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Add field
          </button>
        </div>
        <p className="text-xs text-text-subtle mb-2">
          Fields the requester sees when picking this item. Field name (e.g. "RAM") becomes the label;
          the hint (e.g. "16GB DDR4") is the placeholder.
        </p>
        {form.specHintRows.length === 0 ? (
          <p className="text-xs text-text-subtle italic px-3 py-2 bg-surface-container/40 rounded">
            No spec fields. Requesters can still use the free-text notes field.
          </p>
        ) : (
          <div className="space-y-2">
            {form.specHintRows.map((row, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <input
                  type="text"
                  value={row.key}
                  onChange={(e) => updateHintRow(idx, { key: e.target.value })}
                  placeholder="Field name (e.g. RAM)"
                  className="flex-1 bg-surface-container-lowest border border-border focus:border-primary rounded-md px-2 py-1.5 text-sm text-text outline-none"
                />
                <input
                  type="text"
                  value={row.hint}
                  onChange={(e) => updateHintRow(idx, { hint: e.target.value })}
                  placeholder="Placeholder hint (e.g. e.g. 16GB DDR4)"
                  className="flex-[1.5] bg-surface-container-lowest border border-border focus:border-primary rounded-md px-2 py-1.5 text-sm text-text outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeHintRow(idx)}
                  className="text-text-muted hover:text-danger p-1.5 rounded"
                  aria-label="Remove spec field"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => set("active", e.target.checked)}
          className="h-4 w-4 accent-primary"
        />
        <span className="text-sm text-text">
          Active (available for selection in PR / RFQ / PO)
        </span>
      </label>

      <div className="pt-4 border-t border-border flex justify-end gap-3 sticky bottom-0 bg-surface-container-lowest -mx-6 px-6 pb-2">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="px-4 py-2 text-sm font-medium text-text border border-border rounded-md hover:bg-surface-container-low disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={submitting}
          className="px-6 py-2 text-sm font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-md disabled:opacity-60 flex items-center gap-2"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Saving…" : isNew ? "Create" : "Save"}
        </button>
      </div>
    </div>
  );
}

export default function EditItemDrawer({ open, item, onClose }) {
  const isNew = !item?.code;
  return (
    <Drawer
      open={open}
      title={isNew ? "New Item" : `Edit ${item?.code}`}
      onClose={onClose}
      width="560px"
    >
      <EditItemDrawerInner item={item} onClose={onClose} />
    </Drawer>
  );
}
