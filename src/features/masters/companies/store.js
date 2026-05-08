import { create } from "zustand";
import companiesApi from "./api.js";

export const useCompaniesStore = create((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const items = await companiesApi.list();
      set({ items: Array.isArray(items) ? items : [], loading: false });
      return items;
    } catch (err) {
      set({ error: err?.message ?? "Failed to load", loading: false });
      throw err;
    }
  },

  create: async (payload) => {
    const created = await companiesApi.create(payload);
    set({ items: [created, ...get().items] });
    return created;
  },

  update: async (code, payload) => {
    const updated = await companiesApi.update(code, payload);
    set({ items: get().items.map((c) => (c.code === code ? updated : c)) });
    return updated;
  },

  remove: async (code) => {
    await companiesApi.remove(code);
    set({ items: get().items.filter((c) => c.code !== code) });
  },
}));

export default useCompaniesStore;
