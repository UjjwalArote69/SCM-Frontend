import { create } from "zustand";
import vendorsApi from "./api.js";

export const useVendorsStore = create((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchAll: async (params) => {
    set({ loading: true, error: null });
    try {
      const data = await vendorsApi.list(params);
      set({ items: data, loading: false });
    } catch (err) {
      set({ loading: false, error: err?.message ?? "Failed to load vendors" });
    }
  },

  byCode: (code) => get().items.find((v) => v.code === code),

  create: async (payload) => {
    const record = await vendorsApi.create(payload);
    set((s) => ({ items: [record, ...s.items] }));
    return record;
  },

  update: async (code, payload) => {
    const record = await vendorsApi.update(code, payload);
    set((s) => ({
      items: s.items.map((v) => (v.code === code ? record : v)),
    }));
    return record;
  },

  remove: async (code) => {
    await vendorsApi.remove(code);
    set((s) => ({ items: s.items.filter((v) => v.code !== code) }));
  },
}));
