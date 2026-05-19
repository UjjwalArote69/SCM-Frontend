import { create } from "zustand";
import paymentApi from "./api.js";
import { makeListFetcher } from "../../utils/storeCache.js";

export const usePaymentStore = create((set, get) => ({
  items: [],
  loading: false,
  error: null,
  lastFetchedAt: null,
  _inflight: null,

  fetchAll: makeListFetcher({
    get, set,
    fetcher: () => paymentApi.list(),
    errorLabel: "Failed to load payments",
  }),

  byNumber: (number) => get().items.find((p) => p.number === number),

  create: async (payload) => {
    const record = await paymentApi.create(payload);
    set((s) => ({ items: [record, ...s.items] }));
    return record;
  },

  quickPay: async (payload) => {
    const record = await paymentApi.quickPay(payload);
    set((s) => ({ items: [record, ...s.items] }));
    return record;
  },

  markPaid: async (number, payload = {}) => {
    const updated = await paymentApi.markPaid(number, payload);
    set((s) => ({
      items: s.items.map((p) => (p.number === number ? updated : p)),
    }));
    return updated;
  },

  updateStatus: async (number, payload) => {
    const updated = await paymentApi.updateStatus(number, payload);
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
    await paymentApi.remove(number);
    set((s) => ({ items: s.items.filter((p) => p.number !== number) }));
  },
}));
