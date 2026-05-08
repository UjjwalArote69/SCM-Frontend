import { create } from "zustand";
import approvalRulesApi from "./api.js";

export const useApprovalRulesStore = create((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const items = await approvalRulesApi.list();
      set({ items: Array.isArray(items) ? items : [], loading: false });
      return items;
    } catch (err) {
      set({ error: err?.message ?? "Failed to load", loading: false });
      throw err;
    }
  },

  create: async (payload) => {
    const r = await approvalRulesApi.create(payload);
    set({ items: [...get().items, r] });
    return r;
  },

  update: async (id, payload) => {
    const r = await approvalRulesApi.update(id, payload);
    set({ items: get().items.map((x) => (x.id === id ? r : x)) });
    return r;
  },

  remove: async (id) => {
    await approvalRulesApi.remove(id);
    set({ items: get().items.filter((x) => x.id !== id) });
  },
}));

export default useApprovalRulesStore;
