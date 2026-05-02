import { create } from "zustand";
import itemsApi from "./api.js";

export const useItemsStore = create((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchAll: async (params) => {
    set({ loading: true, error: null });
    try {
      const data = await itemsApi.list(params);
      set({ items: data, loading: false });
    } catch (err) {
      set({ loading: false, error: err?.message ?? "Failed to load items" });
    }
  },

  byCode: (code) => get().items.find((i) => i.code === code),

  create: async (payload) => {
    const record = await itemsApi.create(payload);
    set((s) => ({ items: [record, ...s.items] }));
    return record;
  },

  update: async (code, payload) => {
    const record = await itemsApi.update(code, payload);
    set((s) => ({
      items: s.items.map((i) => (i.code === code ? record : i)),
    }));
    return record;
  },

  remove: async (code) => {
    await itemsApi.remove(code);
    set((s) => ({ items: s.items.filter((i) => i.code !== code) }));
  },
}));
