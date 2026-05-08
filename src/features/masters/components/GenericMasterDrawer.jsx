import { useEffect, useState } from "react";
import Drawer from "../../../components/feedback/Drawer.jsx";
import { useToast } from "../../../hooks/useToast.jsx";

const inputCls =
  "w-full bg-surface-container-lowest border-0 border-b-2 border-outline-variant focus:border-primary px-3 py-2 text-sm text-text outline-none";

/**
 * Reusable drawer for simple key/value masters.
 *
 * Props:
 *   open, onClose
 *   entity            label for "New X" / "Edit X" / toasts
 *   fields[]          { name, label, type?, required?, options?, placeholder?, lockOnEdit? }
 *   values            existing record (or {} for new)
 *   isNew
 *   onSave(payload)   async — receives the form object; should throw on failure
 *   onDelete(record)  optional — admin-only delete; if provided shows a Delete button
 */
export default function GenericMasterDrawer({
  open,
  onClose,
  entity = "Record",
  fields = [],
  values = {},
  isNew = true,
  onSave,
  onDelete,
}) {
  const toast = useToast();
  const [form, setForm] = useState(() => initial(values, fields));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setForm(initial(values, fields));
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values?.id, values?.code]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    const localErrors = {};
    fields.forEach((f) => {
      if (f.required && !String(form[f.name] ?? "").trim()) {
        localErrors[f.name] = `${f.label} is required`;
      }
    });
    if (Object.keys(localErrors).length) {
      setErrors(localErrors);
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form };
      // Coerce empty strings to null for nullable fields
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "") payload[k] = null;
      });
      await onSave?.(payload);
      toast.success(`${entity} ${isNew ? "created" : "saved"}`);
      onClose?.();
    } catch (err) {
      const data = err?.response?.data;
      if (data?.errors) {
        const flat = {};
        Object.entries(data.errors).forEach(([k, v]) => (flat[k] = Array.isArray(v) ? v[0] : v));
        setErrors(flat);
      }
      toast.error(data?.message ?? err?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!onDelete) return;
    if (!window.confirm(`Delete this ${entity.toLowerCase()}? This can't be undone.`)) return;
    setDeleting(true);
    try {
      await onDelete(values);
      toast.success(`${entity} deleted`);
      onClose?.();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? err?.message ?? "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Drawer
      open={open}
      title={isNew ? `New ${entity}` : `Edit ${entity}`}
      onClose={onClose}
      footer={
        <>
          {!isNew && onDelete && (
            <button
              onClick={remove}
              disabled={deleting || saving}
              className="px-4 py-2 text-sm font-medium text-danger border border-danger/30 rounded-md hover:bg-danger-soft/40 disabled:opacity-50 mr-auto"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          )}
          <button
            onClick={onClose}
            disabled={saving || deleting}
            className="px-4 py-2 text-sm font-medium text-text border border-border rounded-md hover:bg-surface-container-low disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || deleting}
            className="px-6 py-2 text-sm font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-md disabled:opacity-50"
          >
            {saving ? "Saving…" : isNew ? "Create" : "Save"}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {fields.map((f) => {
          const locked = !isNew && f.lockOnEdit;
          const err = errors[f.name];
          const cls = `${inputCls} ${err ? "border-danger" : ""} ${locked ? "opacity-60 cursor-not-allowed" : ""}`;
          return (
            <div key={f.name}>
              <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">
                {f.label}
                {f.required && " *"}
              </label>
              {f.type === "textarea" ? (
                <textarea
                  rows={3}
                  value={form[f.name] ?? ""}
                  onChange={(e) => set(f.name, e.target.value)}
                  placeholder={f.placeholder}
                  disabled={locked}
                  className={`${cls} resize-none`}
                />
              ) : f.type === "select" ? (
                <select
                  value={form[f.name] ?? ""}
                  onChange={(e) => set(f.name, e.target.value)}
                  disabled={locked}
                  className={cls}
                >
                  {f.options?.map((o) =>
                    typeof o === "string" ? (
                      <option key={o} value={o}>{o}</option>
                    ) : (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ),
                  )}
                </select>
              ) : f.type === "checkbox" ? (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!form[f.name]}
                    onChange={(e) => set(f.name, e.target.checked)}
                    disabled={locked}
                    className="h-4 w-4 rounded text-primary"
                  />
                  <span className="text-sm text-text-muted">{f.checkboxLabel ?? "Active"}</span>
                </label>
              ) : (
                <input
                  type={f.type ?? "text"}
                  value={form[f.name] ?? ""}
                  onChange={(e) => set(f.name, e.target.value)}
                  placeholder={f.placeholder}
                  disabled={locked}
                  className={cls}
                />
              )}
              {err && <p className="text-xs text-danger mt-1">{err}</p>}
              {locked && <p className="text-xs text-text-subtle mt-1">Locked after creation.</p>}
            </div>
          );
        })}
      </div>
    </Drawer>
  );
}

function initial(values, fields) {
  const out = { ...values };
  fields.forEach((f) => {
    if (f.type === "checkbox" && out[f.name] === undefined) out[f.name] = true;
    if (out[f.name] === null || out[f.name] === undefined) out[f.name] = "";
  });
  return out;
}
