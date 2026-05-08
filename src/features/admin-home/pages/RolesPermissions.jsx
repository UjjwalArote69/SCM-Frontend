import { useEffect, useMemo, useState } from "react";
import { Shield, Loader2, Info, Crown, Save, AlertCircle } from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import { useToast } from "../../../hooks/useToast.jsx";
import { useAuthStore } from "../../auth/store.js";
import rolePermissionsApi from "../rolesPermissions/api.js";
import { ROLE_LABELS, ROLES } from "../../../data/roles.js";

/**
 * Admin-editable role × permission matrix.
 *
 * Reads /api/roles-permissions on mount, persists each toggle via
 * PUT /api/roles-permissions/{role}. Admin row is read-only — admin
 * always implicitly passes can() checks server-side.
 *
 * NOTE for users of this page: editing here updates the catalog table
 * but most controllers still use hardcoded role lists. Wiring the
 * real `->can()` checks is a separate phase (see PROGRESS.md).
 */

// Order columns in a sensible hierarchy
const ROLE_ORDER = [
  ROLES.ADMIN,
  ROLES.CEO,
  ROLES.CFO,
  ROLES.DIRECTOR,
  ROLES.HOD,
  ROLES.MANAGER,
  ROLES.PURCHASE_OFFICER,
  ROLES.PROJECT_MANAGER,
  ROLES.ACCOUNTANT,
  ROLES.SITE_PERSON,
  ROLES.EMPLOYEE,
  ROLES.CUSTOMER,
  ROLES.VENDOR,
];

export default function RolesPermissionsPage() {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";

  const [permissions, setPermissions] = useState([]);
  const [matrix, setMatrix] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingCell, setSavingCell] = useState(null); // `${role}:${code}` while saving

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    rolePermissionsApi.list()
      .then((d) => { if (!cancelled) { setPermissions(d.permissions); setMatrix(d.matrix); setLoading(false); } })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err?.response?.data?.message ?? "Couldn't load permissions");
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [toast]);

  // Group permissions by module → preserves the order returned by the server
  const grouped = useMemo(() => {
    const out = {};
    permissions.forEach((p) => { (out[p.module] ??= []).push(p); });
    return out;
  }, [permissions]);

  // Roles to render — only those present in matrix or in our static order list
  const roles = useMemo(() => {
    const inMatrix = new Set(Object.keys(matrix));
    inMatrix.add("admin");   // always show admin column even though it's read-only
    return ROLE_ORDER.filter((r) => inMatrix.has(r));
  }, [matrix]);

  const isChecked = (role, code) => {
    if (role === "admin") return true;            // admin implicitly has all
    return matrix[role]?.includes(code) ?? false;
  };

  const toggle = async (role, code) => {
    if (!isAdmin || role === "admin") return;
    const current = new Set(matrix[role] ?? []);
    if (current.has(code)) current.delete(code);
    else current.add(code);
    const next = Array.from(current);

    // Optimistic update
    setMatrix((m) => ({ ...m, [role]: next }));
    setSavingCell(`${role}:${code}`);
    try {
      const updated = await rolePermissionsApi.update(role, next);
      // Server is authoritative on the resulting set (filters unknown codes)
      setMatrix((m) => ({ ...m, [role]: updated.permissions }));
    } catch (err) {
      // Roll back on failure
      setMatrix((m) => ({ ...m, [role]: matrix[role] ?? [] }));
      toast.error(err?.response?.data?.message ?? "Couldn't save");
    } finally { setSavingCell(null); }
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title="Roles & Permissions"
        subtitle="Edit which actions each role can take. Changes persist immediately."
      />

      <div className="bg-info-soft/40 border border-info/30 rounded-lg p-3 mb-6 flex gap-2 items-start text-sm">
        <Info className="h-4 w-4 text-info shrink-0 mt-0.5" />
        <div className="text-text-muted">
          <span className="font-bold text-text">Phase 1:</span> the matrix is editable + saved here.
          Most controllers still use hardcoded role lists — wiring server-side <code className="font-mono text-xs bg-surface-container-low px-1 rounded">$user-&gt;can(…)</code> everywhere is a follow-up. Use this for visibility today.
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-text-muted">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface-container-low z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-text-muted min-w-[280px]">
                  Permission
                </th>
                {roles.map((role) => (
                  <th key={role} className="px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-text-muted whitespace-nowrap">
                    <div className="flex flex-col items-center gap-1">
                      {role === "admin" ? (
                        <Crown className="h-3.5 w-3.5 text-warning" />
                      ) : (
                        <Shield className="h-3.5 w-3.5 text-primary" />
                      )}
                      <span>{shortRoleLabel(role)}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Object.entries(grouped).map(([module, perms]) => (
                <ModuleRows
                  key={module}
                  module={module}
                  perms={perms}
                  roles={roles}
                  isChecked={isChecked}
                  toggle={toggle}
                  savingCell={savingCell}
                  isAdmin={isAdmin}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isAdmin && (
        <div className="mt-4 flex items-center gap-2 text-xs text-warning">
          <AlertCircle className="h-3.5 w-3.5" />
          You're viewing in read-only mode. Only admins can change role permissions.
        </div>
      )}
    </div>
  );
}

function ModuleRows({ module, perms, roles, isChecked, toggle, savingCell, isAdmin }) {
  return (
    <>
      <tr className="bg-surface-container-low/40">
        <td colSpan={roles.length + 1} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-primary">
          {module}
        </td>
      </tr>
      {perms.map((p) => (
        <tr key={p.code} className="hover:bg-surface-container-low/40">
          <td className="px-4 py-2.5 align-top">
            <div className="font-medium text-text">{p.name}</div>
            <div className="font-mono text-[10px] text-text-subtle">{p.code}</div>
          </td>
          {roles.map((role) => {
            const checked = isChecked(role, p.code);
            const saving = savingCell === `${role}:${p.code}`;
            const disabled = !isAdmin || role === "admin";
            return (
              <td key={role} className="px-2 py-2.5 text-center">
                <CheckCell
                  checked={checked}
                  disabled={disabled}
                  saving={saving}
                  onClick={() => toggle(role, p.code)}
                  isAdminRole={role === "admin"}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

function CheckCell({ checked, disabled, saving, onClick, isAdminRole }) {
  if (saving) {
    return <Loader2 className="h-4 w-4 animate-spin text-primary inline" />;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={isAdminRole ? "Admin always has all permissions" : (disabled ? "Read-only" : "Click to toggle")}
      className={`w-5 h-5 rounded border flex items-center justify-center transition ${
        checked
          ? isAdminRole
            ? "bg-warning text-warning-foreground border-warning cursor-not-allowed opacity-90"
            : disabled
              ? "bg-success-soft text-success border-success/30 cursor-not-allowed"
              : "bg-success text-success-foreground border-success hover:brightness-110 cursor-pointer"
          : disabled
            ? "border-border cursor-not-allowed"
            : "border-border hover:border-primary cursor-pointer"
      }`}
    >
      {checked && (
        <svg viewBox="0 0 12 10" className="w-3 h-3">
          <path d="M1 5 L4.5 8.5 L11 1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

function shortRoleLabel(role) {
  const map = {
    admin: "Admin", ceo: "CEO", cfo: "CFO", director: "Director",
    hod: "HOD", manager: "Manager",
    purchase_officer: "Purchase",
    project_manager: "PM",
    accountant: "Acc",
    site_person: "Site",
    employee: "Employee",
    customer: "Customer",
    vendor: "Vendor",
  };
  return map[role] ?? ROLE_LABELS[role] ?? role;
}
