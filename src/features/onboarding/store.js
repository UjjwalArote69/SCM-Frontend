import { create } from "zustand";
import { persist } from "zustand/middleware";
import client from "../../api/client.js";

const EMPTY = {
  // Step 1 — Vendor Info
  vendor_name: "",
  category: "",
  sub_categories_id: "",
  gst: "",
  pan: "",
  contact_person_1: "",
  email_address_1: "",
  contact_no: "",
  password: "",
  address: "",
  address_1: "",
  city: "",
  state: "",
  country: "",
  zipcode: "",
  certificates: [],

  // Step 2 — References
  references: [
    { name: "", company: "", email: "", phone: "", relationship: "" },
  ],

  // Step 3 — Bank Details
  account_number: "",
  bank_name: "",
  branch_name: "",
  ifsc_code: "",

  // Step 4 — Statutory Documents (paths placeholder — upload wiring not enabled)
  document: "",
  pan_document: "",

  // Step 5 — Business Profile
  deals_in: "",
  nature_of_vendor: "",
  bussines_nature: "",
  po_type: "",
  turnover: "",
  employees: "",

  // --- submission state ---
  submitting: false,
  submitError: null,
  submitted: null, // { code, email, vendor_name }
};

export const useOnboardingStore = create(
  persist(
    (set, get) => ({
      ...EMPTY,

      set: (k, v) => set({ [k]: v }),
      setMany: (patch) => set(patch),

      reset: () => set({ ...EMPTY }),

      validateStep1: () => {
        const s = get();
        const errors = {};
        if (!s.vendor_name.trim()) errors.vendor_name = "Company name required";
        if (!s.email_address_1.trim()) {
          errors.email_address_1 = "Email required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email_address_1)) {
          errors.email_address_1 = "Enter a valid email";
        }
        if (!s.password || s.password.length < 8) {
          errors.password = "Password must be at least 8 characters";
        }
        return errors;
      },

      validateStep2: () => {
        const s = get();
        const errors = {};
        if (!s.contact_person_1.trim()) errors.contact_person_1 = "Contact name required";
        if (!s.contact_no.trim()) errors.contact_no = "Phone number required";

        if (!s.gst.trim()) {
          errors.gst = "GST number required";
        } else if (!/^[0-9A-Z]{15}$/.test(s.gst.trim().toUpperCase())) {
          errors.gst = "GST must be 15 alphanumeric characters";
        }

        if (!s.pan.trim()) {
          errors.pan = "PAN number required";
        } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(s.pan.trim().toUpperCase())) {
          errors.pan = "PAN must be 10 chars (e.g. ABCDE1234F)";
        }

        if (!s.address.trim()) errors.address = "Street address required";
        if (!s.city.trim())    errors.city    = "City required";
        if (!s.state.trim())   errors.state   = "State required";
        if (!s.country)        errors.country = "Country required";
        if (!s.zipcode.trim()) errors.zipcode = "Pincode required";

        return errors;
      },

      submit: async () => {
        set({ submitting: true, submitError: null });
        const s = get();

        const payload = {
          vendor_name: s.vendor_name.trim(),
          category: s.category || null,
          sub_categories_id: s.sub_categories_id || null,
          gst: s.gst.trim().toUpperCase() || null,
          pan: s.pan.trim().toUpperCase() || null,
          contact_person_1: s.contact_person_1 || null,
          email_address_1: s.email_address_1.trim(),
          password: s.password,
          contact_no: s.contact_no || null,
          address: s.address || null,
          address_1: s.address_1 || null,
          city: s.city || null,
          state: s.state || null,
          country: s.country || null,
          zipcode: s.zipcode || null,
          account_number: s.account_number || null,
          bank_name: s.bank_name || null,
          branch_name: s.branch_name || null,
          ifsc_code: s.ifsc_code || null,
          deals_in: s.deals_in || null,
          nature_of_vendor: s.nature_of_vendor || null,
          bussines_nature: s.bussines_nature || null,
          po_type: s.po_type || null,
          approval_status: "pending",
        };

        try {
          const res = await client.post("/vendor-register", payload);
          const vendor = res.data?.data;
          set({
            submitting: false,
            submitted: {
              code: vendor?.code,
              email: vendor?.email_address_1,
              vendor_name: vendor?.vendor_name,
            },
          });
          return vendor;
        } catch (err) {
          const msg =
            err?.response?.data?.message ??
            err?.response?.data?.errors?.email_address_1?.[0] ??
            err?.message ??
            "Submission failed";
          set({ submitting: false, submitError: msg });
          throw new Error(msg);
        }
      },
    }),
    {
      name: "scm-onboarding",
      partialize: (s) => {
        const { submitting, submitError, ...rest } = s;
        void submitting;
        void submitError;
        return rest;
      },
    },
  ),
);
