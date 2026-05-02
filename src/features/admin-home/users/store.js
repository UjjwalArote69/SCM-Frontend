import { create } from "zustand";
import usersApi from "./api.js";

export const useUsersStore = create((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchAll: async (params) => {
    set({ loading: true, error: null });
    try {
      const data = await usersApi.list(params);
      set({ items: data, loading: false });
    } catch (err) {
      set({ loading: false, error: err?.message ?? "Failed to load users" });
    }
  },

  byId: (id) => get().items.find((u) => u.id === id),

  create: async (payload) => {
    const record = await usersApi.create(payload);
    set((s) => ({ items: [record, ...s.items] }));
    return record;
  },

  update: async (id, payload) => {
    const record = await usersApi.update(id, payload);
    set((s) => ({
      items: s.items.map((u) => (u.id === id ? record : u)),
    }));
    return record;
  },

  remove: async (id) => {
    await usersApi.remove(id);
    set((s) => ({ items: s.items.filter((u) => u.id !== id) }));
  },
}));
