import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../features/auth/store.js";

/**
 * Simple auth gate — allows any signed-in user through.
 * For role restrictions, use <RoleGate allow={[...]}/> instead.
 */
export default function ProtectedRoute({ children }) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}
