import { useAuthStore } from "../features/auth/store.js";
import { can } from "../utils/rbac.js";

export function useCan(action) {
  const role = useAuthStore((s) => s.user?.role);
  return can(role, action);
}
