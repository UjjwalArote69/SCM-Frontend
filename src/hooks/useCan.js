import { useAuthStore } from "../features/auth/store.js";
import { can as legacyCan } from "../utils/rbac.js";

/**
 * useCan("module.action") — single source of truth for UI permission gating.
 *
 * Resolution order:
 *   1. Server-authoritative `user.permissions` array from /api/me. This is
 *      what `<PermissionGate>` checks for route access, so UI affordances
 *      must use the same signal to avoid drift (showing a button the user
 *      can't actually click).
 *   2. Wildcard "*" = admin → grants all.
 *   3. Falls back to the legacy static role→action map in utils/rbac.js
 *      only when `permissions` isn't loaded yet (e.g. mid-bootstrap).
 *
 * The array refreshes on every /api/me call, so admin changes to the
 * role-permissions matrix surface in the UI on next bootstrap/login.
 */
export function useCan(action) {
  const user = useAuthStore((s) => s.user);
  const perms = Array.isArray(user?.permissions) ? user.permissions : null;
  if (perms) {
    if (perms.includes("*")) return true;
    return perms.includes(action);
  }
  return legacyCan(user?.role, action);
}
