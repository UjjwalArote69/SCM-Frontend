import { create } from "zustand";
import departmentsApi from "./api.js";

export const useDepartmentsStore = create((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const items = await departmentsApi.list();
      set({ items: Array.isArray(items) ? items : [], loading: false });
      return items;
    } catch (err) {
      set({ error: err?.message ?? "Failed to load", loading: false });
      throw err;
    }
  },

  create: async (payload) => {
    const created = await departmentsApi.create(payload);
    set({ items: [created, ...get().items] });
    return created;
  },

  update: async (code, payload) => {
    const updated = await departmentsApi.update(code, payload);
    set({
      items: get().items.map((d) => (d.code === code ? updated : d)),
    });
    return updated;
  },

  remove: async (code, { force = false } = {}) => {
    await departmentsApi.remove(code, { force });
    set({ items: get().items.filter((d) => d.code !== code) });
  },
}));

export default useDepartmentsStore;
