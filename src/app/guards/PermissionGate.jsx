import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../features/auth/store.js";

/**
 * <PermissionGate require="po.view">...</PermissionGate>
 *
 * Lets users through when their permissions array (from /api/me) contains
 * the required code OR the wildcard "*" (admin). Sends to /login when
 * not signed in, /403 when signed in but missing the grant.
 *
 * Admin permissions come back as ["*"] from the backend's scm_user_payload
 * helper — that token is the explicit signal for "implicit access to all".
 */
export default function PermissionGate({ require, children }) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  const hasIt = !require || perms.includes("*") || perms.includes(require);
  if (!hasIt) {
    return <Navigate to="/403" replace />;
  }
  return children;
}
