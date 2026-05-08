import { create } from "zustand";
import categoriesApi from "./api.js";

export const useCategoriesStore = create((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const items = await categoriesApi.list();
      set({ items: Array.isArray(items) ? items : [], loading: false });
      return items;
    } catch (err) {
      set({ error: err?.message ?? "Failed to load", loading: false });
      throw err;
    }
  },

  create: async (payload) => {
    const created = await categoriesApi.create(payload);
    set({ items: [created, ...get().items] });
    return created;
  },

  update: async (id, payload) => {
    const updated = await categoriesApi.update(id, payload);
    set({ items: get().items.map((c) => (c.id === id ? updated : c)) });
    return updated;
  },

  remove: async (id) => {
    await categoriesApi.remove(id);
    set({ items: get().items.filter((c) => c.id !== id) });
  },
}));

export default useCategoriesStore;
