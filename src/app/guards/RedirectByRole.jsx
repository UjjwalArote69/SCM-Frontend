import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../features/auth/store.js";
import { ROLE_HOME } from "../../data/roles.js";

/**
 * Root redirect. Sends the user to their role's home,
 * or to /login if they aren't signed in.
 */
export default function RedirectByRole() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_HOME[user.role] ?? "/login"} replace />;
}
