import { create } from "zustand";
import usersApi from "./api.js";
import { makeListFetcher } from "../../../utils/storeCache.js";

export const useUsersStore = create((set, get) => ({
  items: [],
  loading: false,
  error: null,
  lastFetchedAt: null,
  _inflight: null,

  fetchAll: makeListFetcher({
    get, set,
    fetcher: () => usersApi.list(),
    errorLabel: "Failed to load users",
  }),

  byId: (id) => get().items.find((u) => u.id === id),

  create: async (payload) => {
    const record = await usersApi.create(payload);
    set((s) => ({ items: [record, ...s.items] }));
    return record;
  },

  update: async (id, payload) => {
    const record = await usersApi.update(id, payload);
    set((s) => ({
      items: s.items.map((u) => (u.id === id ? record : u)),
    }));
    return record;
  },

  remove: async (id) => {
    await usersApi.remove(id);
    set((s) => ({ items: s.items.filter((u) => u.id !== id) }));
  },
}));
