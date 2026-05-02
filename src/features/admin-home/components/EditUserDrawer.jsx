import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import Drawer from "../../../components/feedback/Drawer.jsx";
import { useToast } from "../../../hooks/useToast.jsx";
import { useUsersStore } from "../users/store.js";
import { ROLE_LABELS } from "../../../data/roles.js";
import departmentsApi from "../../masters/departments/api.js";

const inputCls = (error) =>
  `w-full bg-surface-container-lowest border-0 border-b-2 ${
    error ? "border-danger bg-danger-soft/30" : "border-outline-variant"
  } focus:border-primary px-3 py-2 text-sm text-text outline-none`;

const INTERNAL_ROLES = [
  "employee",
  "manager",
  "hod",
  "cfo",
  "ceo",
  "director",
  "accountant",
  "purchase_officer",
  "customer",
  "admin",
];

function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="text-xs text-danger mt-1 font-medium flex items-center gap-1">
      <AlertCircle className="h-3 w-3" /> {message}
    </p>
  );
}

function UserFormBody({ user, onClose }) {
  const isNew = !user?.id;
  const toast = useToast();
  const create = useUsersStore((s) => s.create);
  const update = useUsersStore((s) => s.update);

  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    role: user?.role ?? "employee",
    department_id: user?.department_id ?? user?.department?.id ?? "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    let cancelled = false;
    departmentsApi
      .list()
      .then((rows) => {
        if (cancelled) return;
        const active = (rows ?? []).filter((d) => d.active !== false);
        setDepartments(active);
      })
      .catch(() => {
        // Non-fatal — drawer still works without dept; field will just be empty
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    if (!form.name.trim()) e.name = "Name is required";
    if (isNew) {
      if (!form.email.trim()) e.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        e.email = "Enter a valid email";
      if (!form.password || form.password.length < 8)
        e.password = "Password must be at least 8 characters";
    } else if (form.password && form.password.length < 8) {
      e.password = "Leave blank or use at least 8 characters";
    }
    return e;
  };

  const save = async () => {
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    const deptId = form.department_id === "" ? null : Number(form.department_id);
    try {
      if (isNew) {
        await create({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          department_id: deptId,
        });
        toast.success(`Invited ${form.name}`);
      } else {
        const payload = {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          department_id: deptId,
        };
        if (form.password) payload.password = form.password;
        await update(user.id, payload);
        toast.success(`${form.name} updated`);
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
      toast.error(err?.response?.data?.message ?? "Could not save user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">
          Full Name *
        </label>
        <input
          className={inputCls(errors.name)}
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
        />
        <FieldError message={errors.name} />
      </div>

      <div>
        <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">
          Email *
        </label>
        <input
          type="email"
          className={inputCls(errors.email)}
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
        />
        <FieldError message={errors.email} />
      </div>

      <div>
        <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">
          Role *
        </label>
        <select
          className={inputCls(errors.role)}
          value={form.role}
          onChange={(e) => set("role", e.target.value)}
        >
          {INTERNAL_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r] ?? r}
            </option>
          ))}
        </select>
        <FieldError message={errors.role} />
      </div>

      <div>
        <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">
          Department
        </label>
        <select
          className={inputCls(errors.department_id)}
          value={form.department_id}
          onChange={(e) => set("department_id", e.target.value)}
        >
          <option value="">— No department —</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.code})
            </option>
          ))}
        </select>
        <FieldError message={errors.department_id} />
        {form.role === "hod" && !form.department_id && (
          <p className="text-xs text-warning mt-1 font-medium">
            Tip: HODs should be tied to a department so the approval flow can route to the right person.
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">
          {isNew ? "Password *" : "Reset Password (optional)"}
        </label>
        <input
          type="password"
          autoComplete="new-password"
          className={inputCls(errors.password)}
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
          placeholder={
            isNew ? "At least 8 characters" : "Leave blank to keep current"
          }
        />
        <FieldError message={errors.password} />
        {!isNew && !errors.password && (
          <p className="text-xs text-text-subtle mt-1">
            Leave blank to keep the user&apos;s current password.
          </p>
        )}
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
          className="px-6 py-2 text-sm font-bold text-primary-foreground bg-primary hover:bg-primary-hover rounded-md disabled:opacity-60 flex items-center gap-2"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Saving…" : isNew ? "Send Invite" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

export default function EditUserDrawer({ open, user, onClose }) {
  const isNew = !user?.id;
  return (
    <Drawer
      open={open}
      title={isNew ? "Invite User" : `Edit ${user?.name ?? ""}`}
      onClose={onClose}
      width="520px"
    >
      <UserFormBody user={user} onClose={onClose} />
    </Drawer>
  );
}
