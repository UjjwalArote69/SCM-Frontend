import { create } from "zustand";
import settingsApi from "./api.js";

export const useSettingsStore = create((set, get) => ({
  data: null,
  loading: false,
  saving: false,
  error: null,

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const data = await settingsApi.get();
      set({ data, loading: false });
      return data;
    } catch (err) {
      set({ error: err?.message ?? "Failed to load", loading: false });
      throw err;
    }
  },

  save: async (patch) => {
    set({ saving: true });
    try {
      const data = await settingsApi.update(patch);
      set({ data, saving: false });
      return data;
    } catch (err) {
      set({ saving: false });
      throw err;
    }
  },

  uploadLogo: async (file) => {
    const data = await settingsApi.uploadLogo(file);
    set({ data });
    return data;
  },

  deleteLogo: async () => {
    const data = await settingsApi.deleteLogo();
    set({ data });
    return data;
  },
}));

export default useSettingsStore;
