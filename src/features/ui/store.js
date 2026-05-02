import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Cross-cutting UI preferences. The sidebar's collapsed state lives here so
 * layouts (UserLayout, AdminLayout, VendorLayout) and pages (sticky footers)
 * can react instead of relying on local state inside Sidebar.
 *
 * Keep collapsed widths in lockstep with `src/components/nav/Sidebar.jsx`.
 */
export const SIDEBAR_W = 256; // px when expanded — Tailwind w-64
export const SIDEBAR_W_COLLAPSED = 64; // px when collapsed — Tailwind w-16

export const useUIStore = create(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: !!v }),
      // Mobile-only off-canvas drawer state. Not persisted in spirit (we want
      // it always closed on reload), but the persist wrapper can't be
      // partial — we just always start with `false` semantically by relying
      // on UI to never mount with a stale truthy value (see Sidebar effect).
      mobileNavOpen: false,
      openMobileNav: () => set({ mobileNavOpen: true }),
      closeMobileNav: () => set({ mobileNavOpen: false }),
      toggleMobileNav: () =>
        set({ mobileNavOpen: !get().mobileNavOpen }),
    }),
    {
      name: "scm-ui",
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }),
    },
  ),
);
