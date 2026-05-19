import { create } from "zustand";
import prApi from "./api.js";
import { makeListFetcher } from "../../utils/storeCache.js";

// Normalize server chain_stage into the {hod,cfo,ceo} shape the list UI renders
export function chainFromStage(stage, status) {
  if (status === "rejected" || status === "cancelled") {
    return { hod: "rejected", cfo: "rejected", ceo: "rejected" };
  }
  const map = {
    hod: { hod: "pending", cfo: "waiting", ceo: "waiting" },
    cfo: { hod: "approved", cfo: "pending", ceo: "waiting" },
    ceo: { hod: "approved", cfo: "approved", ceo: "pending" },
    done: { hod: "approved", cfo: "approved", ceo: "approved" },
  };
  return map[stage] ?? map.hod;
}

export const usePRStore = create((set, get) => ({
  items: [],
  loading: false,
  error: null,
  lastFetchedAt: null,
  _inflight: null,

  fetchAll: makeListFetcher({
    get, set,
    fetcher: () => prApi.list(),
    errorLabel: "Failed to load PRs",
  }),

  byNumber: (number) => get().items.find((p) => p.number === number),

  create: async (payload) => {
    const record = await prApi.create(payload);
    set((s) => ({ items: [record, ...s.items] }));
    return record;
  },

  updateStatus: async (number, { action, comments }) => {
    const updated = await prApi.updateStatus(number, { action, comments });
    set((s) => ({
      items: s.items.map((p) => (p.number === number ? updated : p)),
    }));
    return updated;
  },

  assignRfqAuthor: async (number, userId) => {
    const updated = await prApi.assignRfqAuthor(number, userId);
    set((s) => ({
      items: s.items.map((p) => (p.number === number ? updated : p)),
    }));
    return updated;
  },

  remove: async (number) => {
    await prApi.remove(number);
    set((s) => ({ items: s.items.filter((p) => p.number !== number) }));
  },
}));
