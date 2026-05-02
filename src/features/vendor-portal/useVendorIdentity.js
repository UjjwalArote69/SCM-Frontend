import { useEffect } from "react";
import { create } from "zustand";
import client from "../../api/client.js";
import { useAuthStore } from "../auth/store.js";

/**
 * Resolves the authenticated vendor's business identity by looking up
 * /vendors and matching the row whose email_address_1 == user.email.
 *
 * The vendor's *business* name (`vendor_name`) is what's stored on RFQs
 * (`vendors[]`, `responses[].vendor`, `awarded_vendor`) and POs (`vendor`).
 * It's distinct from the *user's* name (`user.name`), so any UI that
 * compares against `user.name` is brittle and breaks the moment a vendor's
 * sign-in name differs from their company name.
 *
 * The cache is keyed by email so logging out as one vendor and in as
 * another within the same browser session correctly re-resolves identity
 * (otherwise the previous vendor's name would leak into the next vendor's
 * "already quoted" / "awarded to me" computations).
 */
const useVendorIdentityStore = create((set, get) => ({
  vendor: null,
  forEmail: null, // identity is only valid for this email
  loading: false,
  error: null,

  fetch: async (email) => {
    if (!email) return;
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const r = await client.get("/vendors", { params: { q: email } });
      const list = r.data?.data ?? [];
      const v = list.find((x) => x.email_address_1 === email) ?? null;
      set({ vendor: v, forEmail: email, loading: false });
    } catch (err) {
      set({
        vendor: null,
        forEmail: email,
        loading: false,
        error: err?.message ?? "Could not load vendor profile",
      });
    }
  },

  reset: () => set({ vendor: null, forEmail: null, loading: false, error: null }),
}));

/**
 * Hook for vendor-portal pages. Returns the linked AppVendor row, or null
 * when the user isn't a vendor / has no linked profile yet.
 */
export function useVendorIdentity() {
  const user = useAuthStore((s) => s.user);
  const vendor = useVendorIdentityStore((s) => s.vendor);
  const forEmail = useVendorIdentityStore((s) => s.forEmail);
  const loading = useVendorIdentityStore((s) => s.loading);
  const fetch = useVendorIdentityStore((s) => s.fetch);
  const reset = useVendorIdentityStore((s) => s.reset);

  useEffect(() => {
    // Non-vendor or signed out → drop any cached identity
    if (!user?.email || user.role !== "vendor") {
      if (forEmail) reset();
      return;
    }
    // Cached identity belongs to a different user → refetch
    if (forEmail !== user.email && !loading) {
      fetch(user.email);
    }
  }, [user?.role, user?.email, forEmail, loading, fetch, reset]);

  // The cached vendor only counts as "ours" if it matches the current email
  const isCurrent = forEmail === user?.email;
  return {
    vendor: isCurrent ? vendor : null,
    vendorName: isCurrent ? vendor?.vendor_name ?? null : null,
    loading: loading || (user?.role === "vendor" && !isCurrent),
    loaded: isCurrent,
  };
}

export { useVendorIdentityStore };
