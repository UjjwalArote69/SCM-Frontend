import { useState } from "react";
import { Loader2, AlertCircle, Lock } from "lucide-react";
import Drawer from "../../../components/feedback/Drawer.jsx";
import { useToast } from "../../../hooks/useToast.jsx";
import { useDepartmentsStore } from "./store.js";

const inputCls = (error) =>
  `w-full bg-surface-container-lowest border-0 border-b-2 ${
    error ? "border-danger bg-danger-soft/30" : "border-outline-variant"
  } focus:border-primary px-3 py-2 text-sm text-text outline-none`;

function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="text-xs text-danger mt-1 font-medium flex items-center gap-1">
      <AlertCircle className="h-3 w-3" /> {message}
    </p>
  );
}

function DepartmentFormBody({ dept, onClose }) {
  const isNew = !dept?.code;
  const toast = useToast();
  const create = useDepartmentsStore((s) => s.create);
  const update = useDepartmentsStore((s) => s.update);

  const [form, setForm] = useState({
    code: dept?.code ?? "",
    name: dept?.name ?? "",
    head_name: dept?.head_name ?? "",
    description: dept?.description ?? "",
    active: dept?.active ?? true,
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((p) => {
      if (!p[k]) return p;
      const next = { ...p };
      delete next[k];
      return next;
    });
  };

  const validate = () => {
    const e = {};
    if (isNew) {
      if (!form.code.trim()) e.code = "Code is required";
      else if (!/^[A-Z0-9_-]{2,32}$/i.test(form.code.trim()))
        e.code = "2–32 chars, letters / numbers / _ / - only";
    }
    if (!form.name.trim()) e.name = "Name is required";
    return e;
  };

  const save = async () => {
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      if (isNew) {
        await create({
          code: form.code.trim().toUpperCase(),
          name: form.name.trim(),
          head_name: form.head_name.trim() || null,
          description: form.description.trim() || null,
          active: !!form.active,
        });
        toast.success(`Created ${form.name}`);
      } else {
        await update(dept.code, {
          name: form.name.trim(),
          head_name: form.head_name.trim() || null,
          description: form.description.trim() || null,
          active: !!form.active,
        });
        toast.success(`${form.name} saved`);
      }
      onClose?.();
    } catch (err) {
      const serverErrors = err?.response?.data?.errors;
      if (serverErrors) {
        const flat = Object.fromEntries(
          Object.entries(serverErrors).map(([k, v]) => [
            k,
            Array.isArray(v) ? v[0] : v,
          ]),
        );
        setErrors(flat);
      }
      toast.error(err?.response?.data?.message ?? "Could not save department");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">
          Code {isNew && "*"}
        </label>
        <div className="relative">
          <input
            className={inputCls(errors.code)}
            value={form.code}
            onChange={(e) => set("code", e.target.value.toUpperCase())}
            disabled={!isNew}
            placeholder="e.g. PROC, FIN, IT"
            maxLength={32}
          />
          {!isNew && (
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-subtle" />
          )}
        </div>
        <FieldError message={errors.code} />
        {!isNew && (
          <p className="text-xs text-text-subtle mt-1">
            Code is the immutable identifier. To change it, delete and recreate.
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
          placeholder="e.g. Procurement"
        />
        <FieldError message={errors.name} />
      </div>

      <div>
        <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">
          Head Name
        </label>
        <input
          className={inputCls(errors.head_name)}
          value={form.head_name}
          onChange={(e) => set("head_name", e.target.value)}
          placeholder="Optional — display only"
        />
        <FieldError message={errors.head_name} />
        <p className="text-xs text-text-subtle mt-1">
          Display label only. Approval routing uses the user with role=hod whose `department_id` matches this department.
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">
          Description
        </label>
        <textarea
          rows={3}
          className={`${inputCls(errors.description)} resize-none`}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Optional internal note about what this department does"
        />
        <FieldError message={errors.description} />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="dept-active"
          type="checkbox"
          checked={!!form.active}
          onChange={(e) => set("active", e.target.checked)}
          className="h-4 w-4 accent-primary"
        />
        <label htmlFor="dept-active" className="text-sm text-text">
          Active — show in dropdowns and approval routing
        </label>
      </div>

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
          {submitting ? "Saving…" : isNew ? "Create" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

export default function EditDepartmentDrawer({ open, dept, onClose }) {
  const isNew = !dept?.code;
  return (
    <Drawer
      open={open}
      title={isNew ? "New Department" : `Edit ${dept?.name ?? ""}`}
      onClose={onClose}
      width="520px"
    >
      <DepartmentFormBody dept={dept} onClose={onClose} />
    </Drawer>
  );
}
