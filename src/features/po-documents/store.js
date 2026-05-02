import { create } from "zustand";
import poDocumentsApi from "./api.js";

/**
 * Per-PO document store. Documents are scoped per PO_number internally so
 * the same store can power both the vendor upload page and the PO Detail
 * "Documents" section.
 */
// Stable empty array — see PoDocumentsCard.jsx for the same pattern.
const EMPTY = Object.freeze([]);

export const usePoDocumentsStore = create((set, get) => ({
  // { [poNumber]: AppPoDocument[] }
  byPo: {},
  loading: false,
  error: null,

  fetchForPo: async (poNumber) => {
    if (!poNumber) return;
    set({ loading: true, error: null });
    try {
      const data = await poDocumentsApi.list({ po_number: poNumber });
      set((s) => ({
        byPo: { ...s.byPo, [poNumber]: data },
        loading: false,
      }));
      return data;
    } catch (err) {
      set({ loading: false, error: err?.message ?? "Failed to load documents" });
      throw err;
    }
  },

  upload: async ({ po_number, doc_type, file }, onProgress) => {
    const record = await poDocumentsApi.upload(
      { po_number, doc_type, file },
      onProgress,
    );
    set((s) => {
      const list = s.byPo[po_number] ?? [];
      return {
        byPo: { ...s.byPo, [po_number]: [record, ...list] },
      };
    });
    return record;
  },

  remove: async (poNumber, id) => {
    await poDocumentsApi.remove(id);
    set((s) => ({
      byPo: {
        ...s.byPo,
        [poNumber]: (s.byPo[poNumber] ?? []).filter((d) => d.id !== id),
      },
    }));
  },

  download: (id, filename) => poDocumentsApi.download(id, filename),

  forPo: (poNumber) => get().byPo[poNumber] ?? EMPTY,
}));
