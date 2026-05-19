import { useEffect, useMemo, useState } from "react";
import {
  Loader2, AlertCircle, ShieldCheck, Check, ChevronDown, ChevronRight, Lock,
} from "lucide-react";
import Drawer from "../../../components/feedback/Drawer.jsx";
import { useToast } from "../../../hooks/useToast.jsx";
import { useUsersStore } from "../users/store.js";
import { ROLE_LABELS } from "../../../data/roles.js";
import departmentsApi from "../../masters/departments/api.js";
import usersApi from "../users/api.js";

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

      {!isNew && user?.role !== "admin" && (
        <CustomPermissionsPanel userId={user.id} userName={user.name} userRole={form.role} />
      )}

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
          {submitting ? "Saving…" : isNew ? "Send Invite" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

/**
 * Per-user permission overrides — additive on top of role-wide and
 * role+dept grants. The admin can grant a permission that the user's
 * role doesn't normally have (e.g. let one specific employee approve
 * payments without changing the entire `employee` role).
 *
 * Inherited perms (from the role) render with a Lock icon and can't be
 * unticked from here — to revoke an inherited perm the admin has to go
 * to /admin/roles and edit the role itself.
 */
function CustomPermissionsPanel({ userId, userName, userRole }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [data, setData] = useState(null);
  // Local draft — set of granted permission codes for this user.
  const [draft, setDraft] = useState(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    usersApi.permissions
      .get(userId)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setDraft(new Set(d.granted ?? []));
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err?.response?.data?.message ?? "Couldn't load permissions");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, toast]);

  // Group catalog by module (same shape used on /admin/roles).
  const grouped = useMemo(() => {
    if (!data?.permissions) return {};
    const out = {};
    for (const p of data.permissions) {
      (out[p.module] ??= []).push(p);
    }
    return out;
  }, [data]);

  const inheritedSet = useMemo(
    () => new Set(data?.inherited ?? []),
    [data?.inherited],
  );

  const serverGranted = useMemo(
    () => new Set(data?.granted ?? []),
    [data?.granted],
  );

  const dirty = useMemo(() => {
    if (!data) return false;
    if (draft.size !== serverGranted.size) return true;
    for (const c of draft) if (!serverGranted.has(c)) return true;
    return false;
  }, [draft, serverGranted, data]);

  const toggle = (code) => {
    if (inheritedSet.has(code)) return; // can't toggle inherited
    setDraft((s) => {
      const next = new Set(s);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await usersApi.permissions.update(userId, Array.from(draft));
      // Re-read so server-side validation gets reflected.
      const fresh = await usersApi.permissions.get(userId);
      setData(fresh);
      setDraft(new Set(fresh.granted ?? []));
      toast.success("Custom permissions saved");
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    setDraft(new Set(data?.granted ?? []));
  };

  if (loading) {
    return (
      <div className="mt-6 pt-5 border-t border-border">
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading {userName}'s permissions…
        </div>
      </div>
    );
  }

  if (!data) return null;

  const extraGranted = Array.from(draft).filter((c) => !inheritedSet.has(c));

  return (
    <div className="mt-6 pt-5 border-t border-border">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center gap-3 text-left group"
      >
        <span className="h-9 w-9 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
          <ShieldCheck className="h-4 w-4" strokeWidth={2.25} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-text flex items-center gap-2">
            Custom permissions
            {extraGranted.length > 0 && (
              <span className="px-1.5 py-px rounded-full bg-primary-soft text-primary text-[10px] font-bold border border-primary/20">
                +{extraGranted.length}
              </span>
            )}
            {dirty && (
              <span className="w-1.5 h-1.5 rounded-full bg-warning" title="Unsaved changes" />
            )}
          </div>
          <div className="text-xs text-text-muted">
            {inheritedSet.size} inherited from <strong className="text-text">{ROLE_LABELS[userRole] ?? userRole}</strong>
            {extraGranted.length > 0 && (
              <>, plus {extraGranted.length} granted only to {userName}</>
            )}
            .
          </div>
        </div>
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-text-subtle" />
        ) : (
          <ChevronDown className="h-4 w-4 text-text-subtle" />
        )}
      </button>

      {!collapsed && (
        <>
          <div className="mt-4 space-y-4 max-h-[420px] overflow-y-auto pr-1">
            {Object.entries(grouped).map(([module, perms]) => (
              <section key={module}>
                <h4 className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary mb-2 px-1">
                  {module}
                </h4>
                <ul className="grid grid-cols-1 gap-1">
                  {perms.map((p) => {
                    const inherited = inheritedSet.has(p.code);
                    const granted = draft.has(p.code);
                    const showAsChecked = inherited || granted;
                    return (
                      <li key={p.code}>
                        <label
                          className={`flex items-start gap-3 px-3 py-2 rounded-md transition-colors ${
                            inherited
                              ? "bg-surface-container-low/40 cursor-not-allowed"
                              : "hover:bg-surface-container-low cursor-pointer"
                          }`}
                          title={inherited
                            ? "Granted by role — edit at /admin/roles to remove."
                            : undefined}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={showAsChecked}
                            disabled={inherited}
                            onChange={() => toggle(p.code)}
                          />
                          <span
                            className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded shrink-0 transition ${
                              showAsChecked
                                ? inherited
                                  ? "bg-primary/40 text-primary-foreground border border-primary/40"
                                  : "bg-primary text-primary-foreground border border-primary"
                                : "border border-outline-variant bg-surface-container-lowest"
                            }`}
                          >
                            {showAsChecked && <Check className="h-3.5 w-3.5" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-text flex items-center gap-1.5">
                              {p.name}
                              {inherited && (
                                <Lock className="h-3 w-3 text-text-subtle" />
                              )}
                            </div>
                            <div className="font-mono text-[10px] text-text-subtle">
                              {p.code}
                              {inherited && (
                                <span className="ml-1 italic">· inherited</span>
                              )}
                            </div>
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>

          {dirty && (
            <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-border/70">
              <button
                type="button"
                onClick={discard}
                disabled={saving}
                className="px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text rounded-md hover:bg-surface-container-low disabled:opacity-60"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="px-4 py-1.5 text-xs font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-md disabled:opacity-60 flex items-center gap-2"
              >
                {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                {saving ? "Saving…" : "Save permissions"}
              </button>
            </div>
          )}
        </>
      )}
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
