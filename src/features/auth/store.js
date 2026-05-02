import { create } from "zustand";
import { persist } from "zustand/middleware";
import authApi from "./api.js";
import { ROLE_HOME } from "../../data/roles.js";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,

      login: async ({ email, password }) => {
        try {
          const data = await authApi.login(email, password);
          set({ user: data.user, token: data.token });
          return {
            user: data.user,
            home: ROLE_HOME[data.user.role] ?? "/app",
          };
        } catch (err) {
          const message =
            err?.response?.data?.message ??
            err?.message ??
            "Could not sign in";
          throw new Error(message);
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          /* ignore network errors on logout */
        }
        set({ user: null, token: null });
      },

      setUser: (user) => set({ user }),

      /**
       * Refresh the cached user from the server.
       *
       * Prevents localStorage tampering from outliving a page load: if
       * someone edits their role in localStorage to "admin", this call
       * overwrites it with whatever the DB says. On 401 (expired/revoked
       * token), clears the session entirely so the UI can redirect to login.
       *
       * Returns the fresh user on success, null on failure.
       */
      fetchMe: async () => {
        const token = get().token;
        if (!token) return null;
        try {
          const user = await authApi.me();
          set({ user });
          return user;
        } catch (err) {
          if (err?.response?.status === 401) {
            // Token invalid/expired — drop session silently
            set({ user: null, token: null });
          }
          return null;
        }
      },

      homeForCurrentRole: () => {
        const role = get().user?.role;
        return ROLE_HOME[role] ?? "/login";
      },
    }),
    {
      name: "scm-auth",
      partialize: (s) => ({ user: s.user, token: s.token }),
    },
  ),
);
