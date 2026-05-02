import { create } from "zustand";
import vendorRatingApi from "./api.js";

const EMPTY = Object.freeze([]);
const EMPTY_SUMMARY = Object.freeze({ count: 0 });

/**
 * Per-vendor multi-dimensional rating store.
 * Keyed by vendor_name. Holds list, summary, and current user's row.
 */
export const useVendorRatingStore = create((set, get) => ({
  byVendor: {}, // { [vendorName]: { rows: [], summary: {}, mine: row | null } }

  fetchForVendor: async (vendorName) => {
    if (!vendorName) return;
    const [{ data, summary }, mine] = await Promise.all([
      vendorRatingApi.list(vendorName),
      vendorRatingApi.me(vendorName),
    ]);
    set((s) => ({
      byVendor: {
        ...s.byVendor,
        [vendorName]: { rows: data, summary: summary ?? EMPTY_SUMMARY, mine },
      },
    }));
  },

  rowsFor: (vendorName) => get().byVendor[vendorName]?.rows ?? EMPTY,
  summaryFor: (vendorName) =>
    get().byVendor[vendorName]?.summary ?? EMPTY_SUMMARY,
  mineFor: (vendorName) => get().byVendor[vendorName]?.mine ?? null,

  upsert: async (payload) => {
    const row = await vendorRatingApi.upsert(payload);
    // Re-fetch the entire bundle so summary recomputes server-side.
    await get().fetchForVendor(payload.vendor_name);
    return row;
  },

  remove: async (vendorName, id) => {
    await vendorRatingApi.remove(id);
    await get().fetchForVendor(vendorName);
  },
}));
