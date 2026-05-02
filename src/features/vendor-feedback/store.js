import { create } from "zustand";
import vendorFeedbackApi from "./api.js";

// Stable empty array — see PoDocumentsCard for the same pattern.
const EMPTY = Object.freeze([]);

/**
 * Per-vendor feedback store. Keyed by vendor_name so the same store can
 * power both the PO Detail surface and a future vendor-master surface.
 */
export const useVendorFeedbackStore = create((set, get) => ({
  byVendor: {},

  fetchForVendor: async (vendorName) => {
    if (!vendorName) return;
    const data = await vendorFeedbackApi.list({ vendor_name: vendorName });
    set((s) => ({ byVendor: { ...s.byVendor, [vendorName]: data } }));
    return data;
  },

  forVendor: (vendorName) => get().byVendor[vendorName] ?? EMPTY,

  create: async (payload) => {
    const row = await vendorFeedbackApi.create(payload);
    set((s) => {
      const list = s.byVendor[row.vendor_name] ?? [];
      return {
        byVendor: { ...s.byVendor, [row.vendor_name]: [row, ...list] },
      };
    });
    return row;
  },

  remove: async (vendorName, id) => {
    await vendorFeedbackApi.remove(id);
    set((s) => ({
      byVendor: {
        ...s.byVendor,
        [vendorName]: (s.byVendor[vendorName] ?? []).filter((r) => r.id !== id),
      },
    }));
  },
}));
