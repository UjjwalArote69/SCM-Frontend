import { create } from "zustand";
import poApi from "./api.js";

export const usePOStore = create((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const data = await poApi.list();
      set({ items: data, loading: false });
    } catch (err) {
      set({ loading: false, error: err?.message ?? "Failed to load POs" });
    }
  },

  byNumber: (number) => get().items.find((p) => p.number === number),

  create: async (payload) => {
    const record = await poApi.create(payload);
    set((s) => ({ items: [record, ...s.items] }));
    return record;
  },

  accept: async (number) => {
    const updated = await poApi.accept(number);
    set((s) => ({ items: s.items.map((p) => (p.number === number ? updated : p)) }));
    return updated;
  },

  reject: async (number) => {
    const updated = await poApi.reject(number);
    set((s) => ({ items: s.items.map((p) => (p.number === number ? updated : p)) }));
    return updated;
  },

  updateStatus: async (number, payload) => {
    const updated = await poApi.updateStatus(number, payload);
    set((s) => {
      const exists = s.items.some((p) => p.number === number);
      return {
        items: exists
          ? s.items.map((p) => (p.number === number ? updated : p))
          : [updated, ...s.items],
      };
    });
    return updated;
  },

  remove: async (number) => {
    await poApi.remove(number);
    set((s) => ({ items: s.items.filter((p) => p.number !== number) }));
  },
}));
