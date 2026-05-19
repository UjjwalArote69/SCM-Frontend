import { create } from "zustand";
import departmentsApi from "./api.js";
import { makeListFetcher } from "../../../utils/storeCache.js";

export const useDepartmentsStore = create((set, get) => ({
  items: [],
  loading: false,
  error: null,
  lastFetchedAt: null,
  _inflight: null,

  // Departments are a small, slow-changing master — keep them fresh for
  // 5 minutes instead of the default 30s to cut redundant requests across
  // the many pages that resolve dept codes (PRs, GRNs, payments, ...).
  fetchAll: makeListFetcher({
    get, set,
    fetcher: () => departmentsApi.list(),
    ttlMs: 300_000,
    errorLabel: "Failed to load departments",
  }),

  create: async (payload) => {
    const created = await departmentsApi.create(payload);
    set({ items: [created, ...get().items] });
    return created;
  },

  update: async (code, payload) => {
    const updated = await departmentsApi.update(code, payload);
    set({
      items: get().items.map((d) => (d.code === code ? updated : d)),
    });
    return updated;
  },

  remove: async (code, { force = false } = {}) => {
    await departmentsApi.remove(code, { force });
    set({ items: get().items.filter((d) => d.code !== code) });
  },
}));

export default useDepartmentsStore;
