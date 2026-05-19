import { useEffect, useMemo, useRef, useState } from "react";
import {
  Shield, Info, Crown, Save, AlertCircle, Check, Loader2,
  RotateCcw, Search, ChevronDown, ChevronRight, Plus, X, Building2,
  Copy,
} from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import Skeleton from "../../../components/feedback/Skeleton.jsx";
import { useToast } from "../../../hooks/useToast.jsx";
import { useAuthStore } from "../../auth/store.js";
import rolePermissionsApi from "../rolesPermissions/api.js";
import { ROLE_LABELS, ROLES } from "../../../data/roles.js";

const BANNER_DISMISS_KEY = "scm-roles-banner-dismissed-v1";

function SkRoleRailItem() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent">
      <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-2.5 w-16" />
      </div>
    </div>
  );
}

function SkPermissionRow() {
  return (
    <div className="flex items-start gap-3 px-5 py-3 bg-surface-container-lowest">
      <Skeleton className="h-5 w-5 rounded shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-2.5 w-24" />
      </div>
    </div>
  );
}

/**
 * Admin-editable role × permission matrix.
 *
 * UX: pick a role from the left rail, toggle permissions in the main panel,
 * then click "Save changes" to commit. Edits are held as a draft until saved,
 * so a slip of the mouse doesn't immediately mutate live policy.
 *
 * Reads /api/roles-permissions on mount, persists each dirty role via
 * PUT /api/roles-permissions/{role}. Admin row is read-only — admin
 * always implicitly passes can() checks server-side.
 */

// Order roles in a sensible hierarchy for the left rail.
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

function arraysEqualAsSets(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  for (const x of b) if (!sa.has(x)) return false;
  return true;
}

export default function RolesPermissionsPage() {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";

  const [permissions, setPermissions] = useState([]);
  const [departments, setDepartments] = useState([]);
  // Matrix shape: { role: { deptCode: [code, ...] } } where deptCode '' = role-wide.
  const [serverMatrix, setServerMatrix] = useState({});
  const [draftMatrix, setDraftMatrix] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeRole, setActiveRole] = useState(ROLES.HOD);
  const [activeDept, setActiveDept] = useState("");
  const [search, setSearch] = useState("");
  const [collapsedModules, setCollapsedModules] = useState(() => new Set());
  const [addDeptOpen, setAddDeptOpen] = useState(false);
  const [copyFromOpen, setCopyFromOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try {
      return localStorage.getItem(BANNER_DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const copyFromRef = useRef(null);

  // Load matrix on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    rolePermissionsApi
      .list()
      .then((d) => {
        if (cancelled) return;
        setPermissions(d.permissions || []);
        setDepartments(d.departments || []);
        const seed = normaliseMatrix(d.matrix || {});
        setServerMatrix(seed);
        setDraftMatrix(deepClone(seed));
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err?.response?.data?.message ?? "Couldn't load permissions");
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [toast]);

  // Reset to "Default" slot whenever the active role changes — otherwise
  // a non-existent dept tab can linger after switching from HOD to Employee.
  useEffect(() => { setActiveDept(""); setAddDeptOpen(false); }, [activeRole]);

  // Group permissions by module → preserves the order returned by the server
  const grouped = useMemo(() => {
    const out = {};
    permissions.forEach((p) => { (out[p.module] ??= []).push(p); });
    return out;
  }, [permissions]);

  // Filter visible permissions by the search box
  const filteredGrouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return grouped;
    const out = {};
    for (const [mod, perms] of Object.entries(grouped)) {
      const hits = perms.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.code?.toLowerCase().includes(q) ||
          mod.toLowerCase().includes(q),
      );
      if (hits.length) out[mod] = hits;
    }
    return out;
  }, [grouped, search]);

  // Roles to render — only those present in matrix or in our static order list
  const roles = useMemo(() => {
    const inMatrix = new Set(Object.keys(serverMatrix));
    inMatrix.add("admin");
    return ROLE_ORDER.filter((r) => inMatrix.has(r));
  }, [serverMatrix]);

  // Compute dirty slices — each "role:dept" string flags one (role, dept)
  // slot that differs from the server. Multiple slots can be dirty at once.
  const dirtySlices = useMemo(() => {
    const dirty = new Set();
    const allRoles = new Set([
      ...Object.keys(draftMatrix),
      ...Object.keys(serverMatrix),
    ]);
    for (const r of allRoles) {
      const draftSlots = draftMatrix[r] ?? {};
      const serverSlots = serverMatrix[r] ?? {};
      const deptCodes = new Set([
        ...Object.keys(draftSlots),
        ...Object.keys(serverSlots),
      ]);
      for (const d of deptCodes) {
        if (!arraysEqualAsSets(draftSlots[d] || [], serverSlots[d] || [])) {
          dirty.add(`${r}:${d}`);
        }
      }
    }
    return dirty;
  }, [draftMatrix, serverMatrix]);

  // Dirty *role* set — used for the unsaved-changes summary in the rail.
  const dirtyRoles = useMemo(() => {
    const out = new Set();
    for (const s of dirtySlices) out.add(s.split(":")[0]);
    return out;
  }, [dirtySlices]);

  const isChecked = (role, dept, code) => {
    if (role === "admin") return true;
    return ((draftMatrix[role] ?? {})[dept] ?? []).includes(code);
  };

  const toggle = (role, dept, code) => {
    if (!isAdmin || role === "admin") return;
    setDraftMatrix((m) => {
      const role_ = { ...(m[role] ?? {}) };
      const cur = new Set(role_[dept] ?? []);
      if (cur.has(code)) cur.delete(code); else cur.add(code);
      role_[dept] = Array.from(cur);
      return { ...m, [role]: role_ };
    });
  };

  const setAllForModule = (role, dept, perms, value) => {
    if (!isAdmin || role === "admin") return;
    setDraftMatrix((m) => {
      const role_ = { ...(m[role] ?? {}) };
      const cur = new Set(role_[dept] ?? []);
      for (const p of perms) {
        if (value) cur.add(p.code); else cur.delete(p.code);
      }
      role_[dept] = Array.from(cur);
      return { ...m, [role]: role_ };
    });
  };

  // Departments that already have a slot for the active role (so the tabs
  // know what to render) + an "Add" affordance with the rest.
  const activeRoleDepts = useMemo(() => {
    const slots = draftMatrix[activeRole] ?? {};
    const codes = Object.keys(slots).filter((c) => c !== "");
    codes.sort();
    return codes;
  }, [draftMatrix, activeRole]);

  const availableDeptsToAdd = useMemo(() => {
    const taken = new Set(activeRoleDepts);
    return departments.filter((d) => !taken.has(d.code));
  }, [departments, activeRoleDepts]);

  const addDepartmentSlot = (deptCode) => {
    if (!deptCode) return;
    setDraftMatrix((m) => {
      const role_ = { ...(m[activeRole] ?? {}) };
      if (!role_[deptCode]) role_[deptCode] = [];
      return { ...m, [activeRole]: role_ };
    });
    setActiveDept(deptCode);
    setAddDeptOpen(false);
  };

  // Copy another role's permissions (for the same dept slot) into the
  // active role's draft. Replaces the active draft slot wholesale — admin
  // sees the change as dirty and can review before saving. Admin role can
  // never be the target (it implicitly has everything anyway).
  const copyFromRole = (sourceRole) => {
    if (!isAdmin || activeRole === "admin" || sourceRole === activeRole) return;
    const sourcePerms = ((draftMatrix[sourceRole] ?? {})[activeDept] ?? []).slice();
    // If the source has no slot for this dept, fall back to its role-wide grants.
    const finalPerms = sourcePerms.length === 0 && activeDept !== ""
      ? (((draftMatrix[sourceRole] ?? {})[""]) ?? []).slice()
      : sourcePerms;
    setDraftMatrix((m) => {
      const role_ = { ...(m[activeRole] ?? {}) };
      role_[activeDept] = finalPerms;
      return { ...m, [activeRole]: role_ };
    });
    setCopyFromOpen(false);
    toast.success(
      `Copied ${finalPerms.length} permission${finalPerms.length === 1 ? "" : "s"} from ${ROLE_LABELS[sourceRole] ?? sourceRole}`,
    );
  };

  // Close the copy-from popover on outside click + Esc
  useEffect(() => {
    if (!copyFromOpen) return;
    const onDown = (e) => {
      if (copyFromRef.current?.contains(e.target)) return;
      setCopyFromOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setCopyFromOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [copyFromOpen]);

  const removeDepartmentSlot = (deptCode) => {
    if (!deptCode) return;
    if (!window.confirm(
      `Remove the ${deptCode}-specific overrides for this role? `
      + `The role-wide grants stay; only this slot's extras are cleared.`,
    )) return;
    setDraftMatrix((m) => {
      const role_ = { ...(m[activeRole] ?? {}) };
      delete role_[deptCode];
      return { ...m, [activeRole]: role_ };
    });
    if (activeDept === deptCode) setActiveDept("");
  };

  const toggleModuleCollapse = (mod) => {
    setCollapsedModules((prev) => {
      const next = new Set(prev);
      if (next.has(mod)) next.delete(mod);
      else next.add(mod);
      return next;
    });
  };

  const onDiscard = () => {
    setDraftMatrix(deepClone(serverMatrix));
    toast.success("Changes discarded");
  };

  const onSave = async () => {
    if (dirtySlices.size === 0) return;
    setSaving(true);
    try {
      // Each dirty (role, dept) slice is a separate API call.
      const updates = await Promise.all(
        Array.from(dirtySlices).map((sliceKey) => {
          const [role, dept] = splitSliceKey(sliceKey);
          const perms = (draftMatrix[role] ?? {})[dept] ?? [];
          return rolePermissionsApi
            .update(role, dept, perms)
            .then((u) => [role, dept, u.permissions]);
        }),
      );
      setServerMatrix((s) => {
        const next = { ...s };
        for (const [role, dept, perms] of updates) {
          next[role] ??= {};
          next[role] = { ...next[role], [dept]: perms };
        }
        return next;
      });
      // Sync draft to whatever the server actually saved (it may filter unknown codes)
      setDraftMatrix((d) => {
        const next = { ...d };
        for (const [role, dept, perms] of updates) {
          next[role] ??= {};
          next[role] = { ...next[role], [dept]: perms };
        }
        return next;
      });
      toast.success(`Saved ${updates.length} change${updates.length === 1 ? "" : "s"}`);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // Ctrl/Cmd + S → save when there's something to save. Standard editor
  // expectation; avoids the trip down to the sticky save bar.
  useEffect(() => {
    const onKey = (e) => {
      const isSaveCombo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s";
      if (!isSaveCombo) return;
      // Don't hijack the browser save dialog unless we actually have edits
      if (!isAdmin || dirtySlices.size === 0 || saving) return;
      e.preventDefault();
      onSave();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirtySlices, saving, isAdmin]);

  const activeDraft = (draftMatrix[activeRole] ?? {})[activeDept] ?? [];
  const grantedCount = activeRole === "admin"
    ? permissions.length
    : activeDraft.length;

  // Effective grants for the active role + slot combo (used in the
  // department panel to show which perms are inherited from the Default
  // slot — those checkboxes render as "inherited" instead of an actual
  // toggle).
  const roleWideGrants = useMemo(() => {
    if (activeRole === "admin") return new Set();
    return new Set(((draftMatrix[activeRole] ?? {})[""]) ?? []);
  }, [draftMatrix, activeRole]);

  const totalDirty = dirtySlices.size;

  return (
    <div className="max-w-[1400px] mx-auto pb-24">
      <PageHeader
        title="Roles & Permissions"
        subtitle="Pick a role on the left, tick the actions it can take, then save."
      />

      {!bannerDismissed && (
        <div className="bg-info-soft/40 border border-info/30 rounded-lg px-3 py-2 mb-4 flex gap-2 items-center text-sm">
          <Info className="h-4 w-4 text-info shrink-0" />
          <div className="text-text-muted flex-1 min-w-0">
            <span className="font-semibold text-text">Heads up:</span> some
            controllers still hard-code role checks server-side. Changes here
            apply to UI gates and any controller using <code className="font-mono text-[11px] bg-surface-container-low px-1 rounded">$user-&gt;can()</code>.
          </div>
          <button
            type="button"
            onClick={() => {
              setBannerDismissed(true);
              try { localStorage.setItem(BANNER_DISMISS_KEY, "1"); } catch { /* ignore */ }
            }}
            className="shrink-0 p-1 rounded-md text-text-muted hover:text-text hover:bg-surface-container-low transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {loading ? (
        <>
          {/* Mobile-only role strip skeleton */}
          <div className="lg:hidden mb-4 flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-32 rounded-full shrink-0" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
            <aside className="hidden lg:block bg-surface-container-lowest border border-border rounded-xl p-3">
              <Skeleton className="h-2.5 w-12 mx-2 mt-1 mb-3" />
              <div className="flex flex-col gap-1">
                {Array.from({ length: 8 }).map((_, i) => <SkRoleRailItem key={i} />)}
              </div>
            </aside>
            <main className="bg-surface-container-lowest border border-border rounded-xl">
              <header className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-9 w-72 rounded-md" />
              </header>
              <div>
                {[0, 1, 2].map((m) => (
                  <section key={m} className="border-b border-border last:border-0">
                    <div className="px-5 py-3 flex items-center gap-3">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-3 w-32 flex-1" />
                      <Skeleton className="h-3 w-10" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border/30">
                      {Array.from({ length: 4 }).map((_, i) => <SkPermissionRow key={i} />)}
                    </div>
                  </section>
                ))}
              </div>
            </main>
          </div>
        </>
      ) : (
        <>
        {/* Mobile/tablet role pill strip — horizontal scroll, compact, takes
            ~50px instead of 700px+ of vertical space. Hidden at lg+, where
            the sticky sidebar handles the same job with more visual weight. */}
        <div className="lg:hidden mb-4 -mx-1 px-1 flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-x">
          {roles.map((role) => {
            const active = role === activeRole;
            const isDirty = dirtyRoles.has(role);
            const slots = draftMatrix[role] ?? {};
            const granted = role === "admin"
              ? permissions.length
              : (slots[""] ?? []).length;
            return (
              <button
                key={role}
                type="button"
                onClick={() => setActiveRole(role)}
                className={`relative shrink-0 snap-start inline-flex items-center gap-2 px-3 py-2 rounded-full text-[12.5px] font-semibold border transition-all active:scale-95 ${
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-[0_2px_8px_-2px_color-mix(in_srgb,var(--color-primary)_55%,transparent)]"
                    : role === "admin"
                      ? "border-warning/30 bg-warning-soft/40 text-warning"
                      : "border-border bg-surface-container-low/60 text-text-muted hover:text-text"
                }`}
              >
                {role === "admin" ? (
                  <Crown className="h-3.5 w-3.5" />
                ) : (
                  <Shield className="h-3.5 w-3.5" />
                )}
                <span>{ROLE_LABELS[role] ?? role}</span>
                <span
                  className={`tabular-nums text-[10.5px] font-bold px-1.5 py-px rounded-full ${
                    active
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-surface-container text-text-subtle"
                  }`}
                >
                  {granted}
                </span>
                {isDirty && (
                  <span
                    className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-warning ring-2 ring-bg"
                    title="Unsaved changes"
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Role rail — desktop only */}
          <aside className="hidden lg:block bg-surface-container-lowest border border-border rounded-xl p-3 lg:sticky lg:top-4 lg:self-start">
            <h3 className="px-2 pt-1 pb-3 text-[10px] font-bold uppercase tracking-widest text-text-subtle">
              Roles
            </h3>
            <div className="flex flex-col gap-1">
              {roles.map((role) => {
                const active = role === activeRole;
                const isDirty = dirtyRoles.has(role);
                const slots = draftMatrix[role] ?? {};
                const granted = role === "admin"
                  ? permissions.length
                  : (slots[""] ?? []).length;
                const deptOverrides = Object.keys(slots).filter((d) => d !== "").length;
                return (
                  <button
                    key={role}
                    onClick={() => setActiveRole(role)}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                      active
                        ? "bg-primary-soft border border-primary/30"
                        : "border border-transparent hover:bg-surface-container-low"
                    }`}
                  >
                    <span
                      className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                        role === "admin"
                          ? "bg-warning-soft text-warning"
                          : active
                            ? "bg-primary text-primary-foreground"
                            : "bg-surface-container-low text-text-muted group-hover:text-text"
                      }`}
                    >
                      {role === "admin" ? <Crown className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className={`font-medium truncate ${active ? "text-primary" : "text-text"}`}>
                        {ROLE_LABELS[role] ?? role}
                      </div>
                      <div className="text-[11px] text-text-subtle">
                        {role === "admin"
                          ? "All permissions"
                          : (
                            <>
                              {granted} permission{granted === 1 ? "" : "s"}
                              {deptOverrides > 0 && (
                                <span className="ml-1 text-info">· {deptOverrides} dept override{deptOverrides === 1 ? "" : "s"}</span>
                              )}
                            </>
                          )}
                      </div>
                    </div>
                    {isDirty && (
                      <span
                        className="h-2 w-2 rounded-full bg-warning shrink-0"
                        title="Unsaved changes"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {totalDirty > 0 && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-warning-soft border border-warning/30 text-xs text-warning flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {totalDirty} unsaved change{totalDirty === 1 ? "" : "s"}
              </div>
            )}
          </aside>

          {/* Permission panel */}
          <main className="bg-surface-container-lowest border border-border rounded-xl">
            <header className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
              <span
                className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                  activeRole === "admin"
                    ? "bg-warning-soft text-warning"
                    : "bg-primary-soft text-primary"
                }`}
              >
                {activeRole === "admin" ? <Crown className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-base font-bold text-text truncate">
                  {ROLE_LABELS[activeRole] ?? activeRole}
                  {activeDept && (
                    <span className="ml-2 text-sm font-medium text-text-muted">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-info-soft text-info text-[11px] font-bold border border-info/30">
                        <Building2 className="h-3 w-3" /> {activeDept}
                      </span>
                    </span>
                  )}
                </div>
                <div className="text-xs text-text-muted">
                  {activeRole === "admin"
                    ? "Administrator implicitly has every permission. Read-only here."
                    : activeDept
                      ? `${grantedCount} extra permission${grantedCount === 1 ? "" : "s"} granted only to users in ${activeDept}.`
                      : `${grantedCount} of ${permissions.length} permissions granted to every ${ROLE_LABELS[activeRole] ?? activeRole}.`}
                </div>
              </div>

              {/* Copy from another role — quick way to clone permissions */}
              {isAdmin && activeRole !== "admin" && (
                <div className="relative" ref={copyFromRef}>
                  <button
                    type="button"
                    onClick={() => setCopyFromOpen((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-text-muted rounded-md border border-border bg-surface-container-low hover:text-text hover:border-primary/40 transition-colors whitespace-nowrap"
                    title="Copy permissions from another role"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Copy from…</span>
                  </button>
                  {copyFromOpen && (
                    <div className="absolute right-0 z-20 mt-1 min-w-[240px] max-h-80 overflow-y-auto bg-surface-container-lowest border border-border rounded-lg shadow-xl p-1">
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-text-subtle border-b border-border mb-1">
                        Replace with permissions from
                      </div>
                      {roles
                        .filter((r) => r !== activeRole && r !== "admin")
                        .map((r) => {
                          const slots = draftMatrix[r] ?? {};
                          const count = (slots[activeDept] ?? slots[""] ?? []).length;
                          return (
                            <button
                              key={r}
                              type="button"
                              onClick={() => copyFromRole(r)}
                              className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-surface-container-low transition-colors"
                            >
                              <Shield className="h-3.5 w-3.5 text-text-muted shrink-0" />
                              <span className="truncate flex-1">{ROLE_LABELS[r] ?? r}</span>
                              <span className="text-[11px] text-text-subtle tabular-nums">
                                {count}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              <div className="relative w-full sm:w-72">
                <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-subtle pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search permissions…"
                  className="w-full pl-8 pr-3 py-2 text-sm bg-surface-container-low border border-border rounded-md focus:border-primary outline-none"
                />
              </div>
            </header>

            {/* Department slot strip — admin can scope a permission to one
                department-flavour of this role (e.g. "Finance HOD only"). */}
            {activeRole !== "admin" && (
              <div className="px-5 pt-3 pb-2 border-b border-border flex flex-wrap items-center gap-2 bg-surface-container-low/30">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-subtle mr-1">
                  Scope
                </span>
                <button
                  type="button"
                  onClick={() => setActiveDept("")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${
                    activeDept === ""
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-surface-container-lowest text-text-muted border-border hover:text-text"
                  }`}
                >
                  All {ROLE_LABELS[activeRole] ?? activeRole}s
                  {(((draftMatrix[activeRole] ?? {})[""]) ?? []).length > 0 && (
                    <span className={`px-1.5 py-px rounded-full text-[10px] font-bold ${activeDept === "" ? "bg-bg/30 text-primary-foreground" : "bg-info-soft text-info"}`}>
                      {(((draftMatrix[activeRole] ?? {})[""]) ?? []).length}
                    </span>
                  )}
                </button>
                {activeRoleDepts.map((d) => {
                  const count = (((draftMatrix[activeRole] ?? {})[d]) ?? []).length;
                  const isActive = activeDept === d;
                  return (
                    <span key={d} className="inline-flex items-center">
                      <button
                        type="button"
                        onClick={() => setActiveDept(d)}
                        className={`inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-l-full text-[12px] font-semibold border-y border-l transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-surface-container-lowest text-text-muted border-border hover:text-text"
                        }`}
                      >
                        <Building2 className="h-3 w-3" />
                        {d}
                        {count > 0 && (
                          <span className={`px-1.5 py-px rounded-full text-[10px] font-bold ${isActive ? "bg-bg/30 text-primary-foreground" : "bg-info-soft text-info"}`}>
                            +{count}
                          </span>
                        )}
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => removeDepartmentSlot(d)}
                          className={`inline-flex items-center px-2 py-1.5 rounded-r-full text-[12px] border-y border-r transition-colors ${
                            isActive
                              ? "bg-primary text-primary-foreground border-primary hover:brightness-110"
                              : "bg-surface-container-lowest text-text-subtle border-border hover:text-danger"
                          }`}
                          title="Remove this department override"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  );
                })}
                {isAdmin && availableDeptsToAdd.length > 0 && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setAddDeptOpen((v) => !v)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold border border-dashed border-border text-text-muted hover:text-primary hover:border-primary transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      Add department override
                    </button>
                    {addDeptOpen && (
                      <div className="absolute z-20 mt-1 min-w-[220px] max-h-72 overflow-y-auto bg-surface-container-lowest border border-border rounded-lg shadow-xl p-1">
                        {availableDeptsToAdd.map((d) => (
                          <button
                            key={d.code}
                            type="button"
                            onClick={() => addDepartmentSlot(d.code)}
                            className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-surface-container-low transition-colors"
                          >
                            <span className="font-mono text-[11px] font-bold text-info bg-info-soft px-1.5 rounded">
                              {d.code}
                            </span>
                            <span className="truncate flex-1">{d.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeDept && (
              <div className="px-5 py-2 text-[11px] text-text-muted bg-info-soft/30 border-b border-info/20 flex items-start gap-2">
                <Info className="h-3.5 w-3.5 text-info shrink-0 mt-0.5" />
                <span>
                  Ticking a permission here adds it <strong className="text-text">only</strong> for users in
                  {" "}<strong className="text-text">{activeDept}</strong>. Permissions inherited from the
                  role-wide tab are shown as a faded check and can't be unticked from here — move to
                  &ldquo;All {ROLE_LABELS[activeRole] ?? activeRole}s&rdquo; to change them.
                </span>
              </div>
            )}

            {Object.keys(filteredGrouped).length === 0 ? (
              <div className="px-5 py-12 text-center text-text-muted text-sm">
                No permissions match "{search}".
              </div>
            ) : (
              <div className="divide-y divide-border">
                {Object.entries(filteredGrouped).map(([module, perms]) => {
                  const collapsed = collapsedModules.has(module);
                  const grantedInModule = perms.filter((p) =>
                    isChecked(activeRole, activeDept, p.code)
                    || (activeDept !== "" && roleWideGrants.has(p.code))
                  ).length;
                  const allOn = grantedInModule === perms.length;
                  const someOn = grantedInModule > 0 && !allOn;
                  return (
                    <section key={module}>
                      <button
                        type="button"
                        onClick={() => toggleModuleCollapse(module)}
                        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-surface-container-low/40 transition-colors"
                      >
                        {collapsed ? (
                          <ChevronRight className="h-4 w-4 text-text-subtle" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-text-subtle" />
                        )}
                        <h4 className="text-[11px] font-bold uppercase tracking-widest text-primary flex-1 text-left">
                          {module}
                        </h4>
                        <span className="text-[11px] text-text-muted">
                          {grantedInModule}/{perms.length}
                        </span>
                        {isAdmin && activeRole !== "admin" && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              setAllForModule(activeRole, activeDept, perms, !allOn);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                e.stopPropagation();
                                setAllForModule(activeRole, activeDept, perms, !allOn);
                              }
                            }}
                            className={`text-[11px] font-medium px-2 py-1 rounded-md transition-colors cursor-pointer ${
                              allOn
                                ? "bg-success-soft text-success hover:bg-success/20"
                                : someOn
                                  ? "bg-warning-soft text-warning hover:bg-warning/20"
                                  : "bg-surface-container-low text-text-muted hover:bg-surface-container hover:text-text"
                            }`}
                          >
                            {allOn ? "Disable all" : "Enable all"}
                          </span>
                        )}
                      </button>

                      {!collapsed && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border/30">
                          {perms.map((p) => {
                            const checked = isChecked(activeRole, activeDept, p.code);
                            // In a dept slot, a permission already granted at
                            // the role-wide level reads as "inherited" — show
                            // the box ticked but lock interactions.
                            const inherited = activeDept !== "" && !checked && roleWideGrants.has(p.code);
                            const showAsChecked = checked || inherited;
                            const disabled = !isAdmin || activeRole === "admin" || inherited;
                            return (
                              <label
                                key={p.code}
                                className={`flex items-start gap-3 px-5 py-3 bg-surface-container-lowest transition-colors ${
                                  disabled
                                    ? "cursor-not-allowed"
                                    : "cursor-pointer hover:bg-surface-container-low/40"
                                }`}
                                title={inherited ? "Granted at the role-wide level — switch to the “All …” tab to change." : undefined}
                              >
                                <input
                                  type="checkbox"
                                  className="sr-only"
                                  checked={showAsChecked}
                                  disabled={disabled}
                                  onChange={() => toggle(activeRole, activeDept, p.code)}
                                />
                                <span
                                  className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded shrink-0 transition ${
                                    showAsChecked
                                      ? activeRole === "admin"
                                        ? "bg-warning text-warning-foreground border border-warning"
                                        : inherited
                                          ? "bg-primary/40 text-primary-foreground border border-primary/40"
                                          : "bg-primary text-primary-foreground border border-primary"
                                      : "border border-outline-variant bg-surface-container-lowest"
                                  }`}
                                >
                                  {checked && <Check className="h-3.5 w-3.5" />}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-medium text-text">{p.name}</div>
                                  <div className="font-mono text-[10px] text-text-subtle">{p.code}</div>
                                  {p.description && (
                                    <div className="text-xs text-text-muted mt-0.5">{p.description}</div>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
          </main>
        </div>
        </>
      )}

      {!isAdmin && (
        <div className="mt-4 flex items-center gap-2 text-xs text-warning">
          <AlertCircle className="h-3.5 w-3.5" />
          You're viewing in read-only mode. Only admins can change role permissions.
        </div>
      )}

      {/* Sticky save bar — only visible when there are unsaved changes */}
      {isAdmin && totalDirty > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-surface-container-lowest border-t border-border shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-3 flex items-center gap-3">
            <span className="h-8 w-8 rounded-full bg-warning-soft flex items-center justify-center shrink-0">
              <AlertCircle className="h-4 w-4 text-warning" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text">
                You have unsaved changes
              </div>
              <div className="text-xs text-text-muted truncate">
                {Array.from(dirtySlices)
                  .map((sk) => {
                    const [role, dept] = splitSliceKey(sk);
                    const label = ROLE_LABELS[role] ?? role;
                    return dept ? `${label} · ${dept}` : label;
                  })
                  .join(", ")}
              </div>
            </div>
            <button
              onClick={onDiscard}
              disabled={saving}
              className="text-sm font-medium text-text-muted hover:text-text px-3 py-2 rounded-md hover:bg-surface-container-low flex items-center gap-2 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Discard</span>
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold px-5 py-2 rounded-md flex items-center gap-2 disabled:opacity-60"
              title="Save (Ctrl+S)"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving…" : `Save ${totalDirty} change${totalDirty === 1 ? "" : "s"}`}
              <kbd className="hidden md:inline-flex items-center gap-0.5 ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-primary-foreground/15 border border-primary-foreground/20 tracking-wide">
                ⌃S
              </kbd>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function deepClone(obj) {
  // Matrix is a small object of objects of arrays — JSON clone is fine.
  return JSON.parse(JSON.stringify(obj ?? {}));
}

/**
 * Server may return either the legacy shape (matrix[role] = [perms]) or the
 * new shape (matrix[role] = { dept: [perms] }). Coerce to the new shape so
 * the rest of the page only deals with one structure.
 */
function normaliseMatrix(raw) {
  const out = {};
  for (const [role, value] of Object.entries(raw)) {
    if (Array.isArray(value)) {
      out[role] = { "": value };
    } else if (value && typeof value === "object") {
      out[role] = { ...value };
      if (!Array.isArray(out[role][""])) out[role][""] = out[role][""] ?? [];
    } else {
      out[role] = { "": [] };
    }
  }
  return out;
}

/**
 * Slice key encoding — `${role}:${dept}` where dept can be empty. We split
 * on the FIRST colon so unusual role strings with colons (none today, but
 * future-proof) still parse correctly.
 */
function splitSliceKey(key) {
  const i = key.indexOf(":");
  if (i === -1) return [key, ""];
  return [key.slice(0, i), key.slice(i + 1)];
}
