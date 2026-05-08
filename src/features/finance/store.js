import { create } from "zustand";
import invoiceApi from "./api.js";

/**
 * Vendor invoices store. Mirrors the shape used by usePRStore / usePOStore
 * (items / loading / error + fetchAll / get / create / updateStatus / remove)
 * so the UI patterns match.
 */
export const useInvoiceStore = create((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchAll: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const data = await invoiceApi.list(params);
      set({ items: Array.isArray(data) ? data : [], loading: false });
    } catch (err) {
      set({
        error: err?.response?.data?.message ?? "Failed to load invoices",
        loading: false,
      });
    }
  },

  get: async (number) => {
    const data = await invoiceApi.get(number);
    // Replace or insert into items so list views stay fresh.
    set((s) => {
      const idx = s.items.findIndex((i) => i.number === data.number);
      if (idx === -1) return { items: [data, ...s.items] };
      const next = s.items.slice();
      next[idx] = data;
      return { items: next };
    });
    return data;
  },

  create: async (payload) => {
    const data = await invoiceApi.create(payload);
    set((s) => ({ items: [data, ...s.items] }));
    return data;
  },

  updateStatus: async (number, action, comments) => {
    const data = await invoiceApi.updateStatus(number, { action, comments });
    set((s) => ({
      items: s.items.map((i) => (i.number === data.number ? data : i)),
    }));
    return data;
  },

  remove: async (number) => {
    await invoiceApi.remove(number);
    set((s) => ({ items: s.items.filter((i) => i.number !== number) }));
  },
}));

export default useInvoiceStore;
