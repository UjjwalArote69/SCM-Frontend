import { create } from "zustand";
import poApi from "./api.js";
import { makeListFetcher } from "../../utils/storeCache.js";

export const usePOStore = create((set, get) => ({
  items: [],
  loading: false,
  error: null,
  lastFetchedAt: null,
  _inflight: null,

  fetchAll: makeListFetcher({
    get, set,
    fetcher: () => poApi.list(),
    errorLabel: "Failed to load POs",
  }),

  byNumber: (number) => get().items.find((p) => p.number === number),

  create: async (payload) => {
    const record = await poApi.create(payload);
    set((s) => ({ items: [record, ...s.items] }));
    return record;
  },

  accept: async (number, payload = {}) => {
    const updated = await poApi.accept(number, payload);
    set((s) => ({ items: s.items.map((p) => (p.number === number ? updated : p)) }));
    return updated;
  },

  reject: async (number, payload = {}) => {
    const updated = await poApi.reject(number, payload);
    set((s) => ({ items: s.items.map((p) => (p.number === number ? updated : p)) }));
    return updated;
  },

  vendorNote: async (number, payload) => {
    const updated = await poApi.vendorNote(number, payload);
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
