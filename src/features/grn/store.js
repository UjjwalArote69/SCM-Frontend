import { create } from "zustand";
import grnApi from "./api.js";

export const useGRNStore = create((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const data = await grnApi.list();
      set({ items: data, loading: false });
    } catch (err) {
      set({ loading: false, error: err?.message ?? "Failed to load GRNs" });
    }
  },

  byNumber: (number) => get().items.find((g) => g.number === number),

  create: async (payload) => {
    const record = await grnApi.create(payload);
    set((s) => ({ items: [record, ...s.items] }));
    return record;
  },

  remove: async (number) => {
    await grnApi.remove(number);
    set((s) => ({ items: s.items.filter((g) => g.number !== number) }));
  },
}));
