import { create } from "zustand";
import projectsApi from "./api.js";

export const useProjectsStore = create((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const items = await projectsApi.list();
      set({ items: Array.isArray(items) ? items : [], loading: false });
      return items;
    } catch (err) {
      set({ error: err?.message ?? "Failed to load", loading: false });
      throw err;
    }
  },

  create: async (payload) => {
    const created = await projectsApi.create(payload);
    set({ items: [created, ...get().items] });
    return created;
  },

  update: async (code, payload) => {
    const updated = await projectsApi.update(code, payload);
    set({ items: get().items.map((p) => (p.code === code ? updated : p)) });
    return updated;
  },

  remove: async (code) => {
    await projectsApi.remove(code);
    set({ items: get().items.filter((p) => p.code !== code) });
  },
}));

export default useProjectsStore;
