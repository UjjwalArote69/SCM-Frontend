import { create } from "zustand";
import rfqApi from "./api.js";
import { makeListFetcher } from "../../utils/storeCache.js";

export const useRFQStore = create((set, get) => ({
  items: [],
  loading: false,
  error: null,
  lastFetchedAt: null,
  _inflight: null,

  fetchAll: makeListFetcher({
    get, set,
    fetcher: () => rfqApi.list(),
    errorLabel: "Failed to load RFQs",
  }),

  byNumber: (number) => get().items.find((r) => r.number === number),

  create: async (payload) => {
    const record = await rfqApi.create(payload);
    set((s) => ({ items: [record, ...s.items] }));
    return record;
  },

  award: async (number, vendor) => {
    const updated = await rfqApi.award(number, vendor);
    set((s) => ({ items: s.items.map((r) => (r.number === number ? updated : r)) }));
    return updated;
  },

  close: async (number) => {
    const updated = await rfqApi.close(number);
    set((s) => ({ items: s.items.map((r) => (r.number === number ? updated : r)) }));
    return updated;
  },

  submitQuote: async (number, payload) => {
    const updated = await rfqApi.submit(number, payload);
    set((s) => ({ items: s.items.map((r) => (r.number === number ? updated : r)) }));
    return updated;
  },

  // Award flow (FLOW.md §3) — all three actions (agree, withdraw, status)
  // share an "upsert" semantic so deep-linked detail pages (where the rfq
  // wasn't pre-loaded into items) still see the updated state. Without the
  // upsert, items.map() is a no-op for rfqs not in the cache and the page
  // re-reads stale data, making the CFO/CEO chain look "not working".
  _upsert: (number, updated) =>
    set((s) => {
      const exists = s.items.some((r) => r.number === number);
      return {
        items: exists
          ? s.items.map((r) => (r.number === number ? updated : r))
          : [updated, ...s.items],
      };
    }),

  agree: async (number, vendor) => {
    const updated = await rfqApi.agree(number, vendor);
    get()._upsert(number, updated);
    return updated;
  },

  withdrawAgreement: async (number) => {
    const updated = await rfqApi.withdrawAgreement(number);
    get()._upsert(number, updated);
    return updated;
  },

  updateStatus: async (number, action, comments) => {
    const updated = await rfqApi.updateStatus(number, action, comments);
    get()._upsert(number, updated);
    return updated;
  },

  assignPoAuthor: async (number, userId) => {
    const updated = await rfqApi.assignPoAuthor(number, userId);
    get()._upsert(number, updated);
    return updated;
  },

  remove: async (number) => {
    await rfqApi.remove(number);
    set((s) => ({ items: s.items.filter((r) => r.number !== number) }));
  },
}));
