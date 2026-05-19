import { create } from "zustand";
import vendorsApi from "./api.js";
import { makeListFetcher } from "../../../utils/storeCache.js";

export const useVendorsStore = create((set, get) => ({
  items: [],
  loading: false,
  error: null,
  lastFetchedAt: null,
  _inflight: null,

  fetchAll: makeListFetcher({
    get, set,
    fetcher: () => vendorsApi.list(),
    errorLabel: "Failed to load vendors",
  }),

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
