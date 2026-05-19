import { create } from "zustand";
import grnApi from "./api.js";
import { makeListFetcher } from "../../utils/storeCache.js";

export const useGRNStore = create((set, get) => ({
  items: [],
  loading: false,
  error: null,
  lastFetchedAt: null,
  _inflight: null,

  fetchAll: makeListFetcher({
    get, set,
    fetcher: () => grnApi.list(),
    errorLabel: "Failed to load GRNs",
  }),

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

  updateStatus: async (number, payload) => {
    const updated = await grnApi.updateStatus(number, payload);
    set((s) => ({
      items: s.items.some((g) => g.number === number)
        ? s.items.map((g) => (g.number === number ? updated : g))
        : [updated, ...s.items],
    }));
    return updated;
  },

  acceptReplacement: async (number, payload) => {
    const updated = await grnApi.acceptReplacement(number, payload);
    set((s) => ({
      items: s.items.some((g) => g.number === number)
        ? s.items.map((g) => (g.number === number ? updated : g))
        : [updated, ...s.items],
    }));
    return updated;
  },

  rejectReplacement: async (number, payload) => {
    const updated = await grnApi.rejectReplacement(number, payload);
    set((s) => ({
      items: s.items.some((g) => g.number === number)
        ? s.items.map((g) => (g.number === number ? updated : g))
        : [updated, ...s.items],
    }));
    return updated;
  },

  siteRespondTargetDate: async (number, payload) => {
    const updated = await grnApi.siteRespondTargetDate(number, payload);
    set((s) => ({
      items: s.items.some((g) => g.number === number)
        ? s.items.map((g) => (g.number === number ? updated : g))
        : [updated, ...s.items],
    }));
    return updated;
  },
}));
