import { create } from "zustand";
import { persist } from "zustand/middleware";

const SEED = [
  { id: 1, tone: "success", icon: "check", title: "PR-2023-0891 approved by HOD", body: "Sarah Jenkins approved your purchase request for $142,500.", time: "10 min ago", unread: true, link: "/app/purchase-requests/PR-2023-0891" },
  { id: 2, tone: "info", icon: "info", title: "Vendor accepted PO-2023-8895", body: "GlobalTech Sys confirmed delivery for Nov 15.", time: "1 h ago", unread: true, link: "/app/purchase-orders/PO-2023-8895" },
  { id: 3, tone: "warning", icon: "mail", title: "New invoice from SteelWorks Ltd", body: "INV-2023-331 ($45,200) is awaiting CFO approval.", time: "2 h ago", unread: true, link: "/app/invoices" },
  { id: 4, tone: "danger", icon: "alert", title: "PR-2023-0884 rejected", body: "Reason: budget exceeds quarterly allocation.", time: "Yesterday", unread: false, link: "/app/purchase-requests/PR-2023-0884" },
  { id: 5, tone: "info", icon: "bell", title: "Quarterly report is ready", body: "October procurement analytics are available.", time: "Yesterday", unread: false, link: "/app/reports" },
];

export const useNotificationsStore = create(
  persist(
    (set, get) => ({
      items: SEED,

      unreadCount: () => get().items.filter((n) => n.unread).length,

      markRead: (id) =>
        set((s) => ({
          items: s.items.map((n) => (n.id === id ? { ...n, unread: false } : n)),
        })),

      markAllRead: () =>
        set((s) => ({
          items: s.items.map((n) => ({ ...n, unread: false })),
        })),

      push: (notif) =>
        set((s) => ({
          items: [{ id: Date.now(), time: "Just now", unread: true, ...notif }, ...s.items],
        })),

      reset: () => set({ items: SEED }),
    }),
    { name: "scm-notifications" },
  ),
);
