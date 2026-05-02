import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../features/auth/store.js";

/**
 * <RoleGate allow={["admin"]}>...</RoleGate>
 *   - No user       → /login (preserving return location)
 *   - Wrong role    → /403 (clean forbidden page, don't bounce logged-in
 *                           users through the login redirect chain)
 */
export default function RoleGate({ allow = [], children }) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (allow.length && !allow.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }
  return children;
}
