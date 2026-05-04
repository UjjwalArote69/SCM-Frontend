import { useState } from "react";
import Drawer from "../../../components/feedback/Drawer.jsx";
import { useToast } from "../../../hooks/useToast.jsx";
import { useVendorsStore } from "../vendors/store.js";

const inputCls =
  "w-full bg-surface-container-lowest border-0 border-b-2 border-outline-variant focus:border-primary px-3 py-2 text-sm text-text outline-none";

const VENDOR_STATUSES = [
  "individual",
  "huf",
  "partnership",
  "firm",
  "company",
  "trust",
  "aop",
  "boi",
];

const APPROVAL_STATUSES = ["pending", "approved", "suspended"];

const EMPTY = {
  // Vendor Information
  category: "",
  sub_categories_id: "",
  vendor_name: "",
  building_name: "",
  contact_no: "",
  address: "",
  address_1: "",
  zipcode: "",
  country: "",
  state: "",
  city: "",
  vendor_logo: "",
  // Login Information
  email_address_1: "",
  password: "",
  // Reference Information
  vendor_status: "",
  contact_person_1: "",
  individual: "",
  contact_no_1: "",
  landline_number: "",
  fax: "",
  contact_person_2: "",
  contact_no_2: "",
  deals_in: "",
  other_email: "",
  // Account
  account_number: "",
  bank_name: "",
  branch_name: "",
  ifsc_code: "",
  // Documents
  gst: "",
  document: "",
  pan: "",
  pan_document: "",
  // MSME
  udhyam: "no",
  service_text_no: "",
  date_of_tax: "",
  vat_tin_no: "",
  cst_of_no: "",
  prn: "",
  date_r: "",
  m_enterprise: "",
  // Nature of Business
  nature_of_vendor: "",
  bussines_nature: "",
  brochure_pdf: "",
  po_type: "",
  // Internal
  approval_status: "pending",
  rating: 0,
  notes: "",
};

function initialForm(vendor) {
  if (!vendor || !vendor.code) return EMPTY;
  const merged = { ...EMPTY };
  for (const k of Object.keys(EMPTY)) {
    if (k === "password") continue; // never prefill
    if (vendor[k] !== undefined && vendor[k] !== null) {
      merged[k] = vendor[k];
    }
  }
  return merged;
}

function Section({ title, children }) {
  return (
    <section className="space-y-4">
      <h3 className="text-sm font-bold text-text uppercase tracking-wider border-b border-border pb-2">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}

function VendorDrawerInner({ vendor, onClose }) {
  const isNew = !vendor?.code;
  const toast = useToast();
  const createVendor = useVendorsStore((s) => s.create);
  const updateVendor = useVendorsStore((s) => s.update);

  const [form, setForm] = useState(() => initialForm(vendor));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    const next = {};
    if (!form.vendor_name.trim()) next.vendor_name = "Vendor Name is required";
    if (isNew && form.email_address_1 && !form.password) {
      next.password = "Password required when email is set";
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = { ...form };
    // strip empties to let backend casts work
    Object.keys(payload).forEach((k) => {
      if (payload[k] === "") payload[k] = null;
    });
    if (!isNew) delete payload.password; // only send if user types new password
    if (isNew && !payload.password) delete payload.password;
    payload.rating = Number(form.rating) || 0;

    setSubmitting(true);
    try {
      if (isNew) {
        const created = await createVendor(payload);
        toast.success(`Vendor ${created.code} created`);
      } else {
        await updateVendor(vendor.code, payload);
        toast.success(`Vendor ${vendor.code} saved`);
      }
      onClose?.();
    } catch (err) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Save failed";
      toast.error(msg);
      const serverErrors = err?.response?.data?.errors;
      if (serverErrors && typeof serverErrors === "object") {
        const flat = Object.fromEntries(
          Object.entries(serverErrors).map(([k, v]) => [
            k,
            Array.isArray(v) ? v[0] : v,
          ]),
        );
        setErrors(flat);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const showIndividual = form.vendor_status === "individual";
  const showUdhyamDetails = form.udhyam === "yes";
  const showNatureOther = form.nature_of_vendor === "other";

  return (
    <div className="space-y-6">
      {/* ===== Vendor Information ===== */}
      <Section title="Vendor Information">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Vendor Category" required error={errors.category}>
            <input
              className={inputCls}
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              placeholder="e.g. Electrical"
            />
          </Field>
          <Field label="Sub Category" required error={errors.sub_categories_id}>
            <input
              className={inputCls}
              value={form.sub_categories_id}
              onChange={(e) => set("sub_categories_id", e.target.value)}
              placeholder="e.g. Motors"
            />
          </Field>
          <Field label="Vendor Name" required error={errors.vendor_name}>
            <input
              className={inputCls}
              value={form.vendor_name}
              onChange={(e) => set("vendor_name", e.target.value)}
            />
          </Field>
          <Field label="Building Name, Floor" required error={errors.building_name}>
            <input
              className={inputCls}
              value={form.building_name}
              onChange={(e) => set("building_name", e.target.value)}
            />
          </Field>
          <Field label="Vendor Contact" required error={errors.contact_no}>
            <input
              className={inputCls}
              value={form.contact_no}
              onChange={(e) => set("contact_no", e.target.value)}
            />
          </Field>
          <Field label="Address" required error={errors.address}>
            <input
              className={inputCls}
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </Field>
          <Field label="Address 1" required error={errors.address_1}>
            <input
              className={inputCls}
              value={form.address_1}
              onChange={(e) => set("address_1", e.target.value)}
            />
          </Field>
          <Field label="Zip Code" required error={errors.zipcode}>
            <input
              className={inputCls}
              value={form.zipcode}
              onChange={(e) => set("zipcode", e.target.value)}
            />
          </Field>
          <Field label="Country" required error={errors.country}>
            <input
              className={inputCls}
              value={form.country}
              onChange={(e) => set("country", e.target.value)}
              placeholder="e.g. India"
            />
          </Field>
          <Field label="State" required error={errors.state}>
            <input
              className={inputCls}
              value={form.state}
              onChange={(e) => set("state", e.target.value)}
            />
          </Field>
          <Field label="City" required error={errors.city}>
            <input
              className={inputCls}
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
            />
          </Field>
          <Field label="Vendor Logo" error={errors.vendor_logo}>
            <input
              type="file"
              className={inputCls}
              disabled
              title="File upload wiring not enabled yet"
            />
          </Field>
        </div>
      </Section>

      {/* ===== Login Information ===== */}
      <Section title="Login Information">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email Address First" required error={errors.email_address_1}>
            <input
              type="email"
              className={inputCls}
              value={form.email_address_1}
              onChange={(e) => set("email_address_1", e.target.value)}
            />
          </Field>
          <Field
            label={isNew ? "Password" : "New Password (leave blank to keep)"}
            required={isNew}
            error={errors.password}
          >
            <input
              type="password"
              className={inputCls}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder={isNew ? "Create Password" : "•••• (unchanged)"}
            />
          </Field>
        </div>
      </Section>

      {/* ===== Reference Information ===== */}
      <Section title="Reference Information">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Status" required error={errors.vendor_status}>
            <select
              className={inputCls}
              value={form.vendor_status}
              onChange={(e) => set("vendor_status", e.target.value)}
            >
              <option value="">-- Set Status --</option>
              {VENDOR_STATUSES.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Contact Person First" error={errors.contact_person_1}>
            <input
              className={inputCls}
              value={form.contact_person_1}
              onChange={(e) => set("contact_person_1", e.target.value)}
            />
          </Field>
          {showIndividual && (
            <Field label="Add Individual" error={errors.individual}>
              <input
                className={inputCls}
                value={form.individual}
                onChange={(e) => set("individual", e.target.value)}
              />
            </Field>
          )}
          <Field label="Contact No First" error={errors.contact_no_1}>
            <input
              className={inputCls}
              value={form.contact_no_1}
              onChange={(e) => set("contact_no_1", e.target.value)}
            />
          </Field>
          <Field label="Landline Number" error={errors.landline_number}>
            <input
              className={inputCls}
              value={form.landline_number}
              onChange={(e) => set("landline_number", e.target.value)}
            />
          </Field>
          <Field label="Fax" error={errors.fax}>
            <input
              className={inputCls}
              value={form.fax}
              onChange={(e) => set("fax", e.target.value)}
            />
          </Field>
          <Field label="Contact Person Second" error={errors.contact_person_2}>
            <input
              className={inputCls}
              value={form.contact_person_2}
              onChange={(e) => set("contact_person_2", e.target.value)}
            />
          </Field>
          <Field label="Contact No Second" error={errors.contact_no_2}>
            <input
              className={inputCls}
              value={form.contact_no_2}
              onChange={(e) => set("contact_no_2", e.target.value)}
            />
          </Field>
          <Field label="Deals In" required error={errors.deals_in}>
            <input
              className={inputCls}
              value={form.deals_in}
              onChange={(e) => set("deals_in", e.target.value)}
            />
          </Field>
          <Field label="Other Email" error={errors.other_email}>
            <input
              type="email"
              className={inputCls}
              value={form.other_email}
              onChange={(e) => set("other_email", e.target.value)}
            />
          </Field>
        </div>
      </Section>

      {/* ===== Account Information ===== */}
      <Section title="Account Information">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Account Number" required error={errors.account_number}>
            <input
              className={inputCls}
              value={form.account_number}
              onChange={(e) => set("account_number", e.target.value)}
            />
          </Field>
          <Field label="Bank Name" required error={errors.bank_name}>
            <input
              className={inputCls}
              value={form.bank_name}
              onChange={(e) => set("bank_name", e.target.value)}
            />
          </Field>
          <Field label="Branch Name" required error={errors.branch_name}>
            <input
              className={inputCls}
              value={form.branch_name}
              onChange={(e) => set("branch_name", e.target.value)}
            />
          </Field>
          <Field label="IFSC Code" required error={errors.ifsc_code}>
            <input
              className={`${inputCls} font-mono`}
              value={form.ifsc_code}
              onChange={(e) => set("ifsc_code", e.target.value)}
              placeholder="ABCD0123456"
            />
          </Field>
        </div>
      </Section>

      {/* ===== Document Information ===== */}
      <Section title="Document Information">
        <div className="space-y-4">
          <Field
            label="GST / Company Registration / VAT Registration Certificate Number"
            required
            error={errors.gst}
          >
            <input
              className={`${inputCls} font-mono`}
              value={form.gst}
              onChange={(e) => set("gst", e.target.value)}
            />
          </Field>
          <Field label="GST Certificate (PDF only)" error={errors.document}>
            <input
              type="file"
              accept="application/pdf"
              className={inputCls}
              disabled
              title="File upload wiring not enabled yet"
            />
          </Field>
          <Field
            label="PAN / Tax Card / Equivalent Tax Identification Card Number"
            required
            error={errors.pan}
          >
            <input
              className={`${inputCls} font-mono`}
              value={form.pan}
              onChange={(e) => set("pan", e.target.value)}
            />
          </Field>
          <Field label="PAN Card (PDF only)" error={errors.pan_document}>
            <input
              type="file"
              accept="application/pdf"
              className={inputCls}
              disabled
              title="File upload wiring not enabled yet"
            />
          </Field>
        </div>
      </Section>

      {/* ===== MSME (Udhyam Aadhar) ===== */}
      <Section title="MSME (Udhyam Aadhar) — Yes/No (if yes, mention the MSME Number)">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Udhyam" error={errors.udhyam}>
            <select
              className={inputCls}
              value={form.udhyam}
              onChange={(e) => set("udhyam", e.target.value)}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </Field>
          {showUdhyamDetails && (
            <>
              <Field label="Service Tax Registration No" error={errors.service_text_no}>
                <input
                  className={inputCls}
                  value={form.service_text_no}
                  onChange={(e) => set("service_text_no", e.target.value)}
                />
              </Field>
              <Field
                label="Date of Service Tax Registration"
                error={errors.date_of_tax}
              >
                <input
                  type="date"
                  className={inputCls}
                  value={form.date_of_tax ?? ""}
                  onChange={(e) => set("date_of_tax", e.target.value)}
                />
              </Field>
              <Field label="VAT TIN No" error={errors.vat_tin_no}>
                <input
                  className={inputCls}
                  value={form.vat_tin_no}
                  onChange={(e) => set("vat_tin_no", e.target.value)}
                />
              </Field>
              <Field label="CST TIN No" error={errors.cst_of_no}>
                <input
                  className={inputCls}
                  value={form.cst_of_no}
                  onChange={(e) => set("cst_of_no", e.target.value)}
                />
              </Field>
              <Field label="Registration No" error={errors.prn}>
                <input
                  className={inputCls}
                  value={form.prn}
                  onChange={(e) => set("prn", e.target.value)}
                />
              </Field>
              <Field label="Date of Registration" error={errors.date_r}>
                <input
                  type="date"
                  className={inputCls}
                  value={form.date_r ?? ""}
                  onChange={(e) => set("date_r", e.target.value)}
                />
              </Field>
              <Field
                label="Micro / Small / Medium Enterprise Certificate"
                error={errors.m_enterprise}
              >
                <input
                  type="file"
                  className={inputCls}
                  disabled
                  title="File upload wiring not enabled yet"
                />
              </Field>
            </>
          )}
        </div>
      </Section>

      {/* ===== Nature of Business ===== */}
      <Section title="Nature of Business">
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Please Specify Nature of Vendor's"
            required
            error={errors.nature_of_vendor}
          >
            <input
              className={inputCls}
              value={form.nature_of_vendor}
              onChange={(e) => set("nature_of_vendor", e.target.value)}
              placeholder="e.g. Manufacturer / Trader / Service Provider / other"
            />
          </Field>
          {showNatureOther && (
            <Field label="Specify Nature (Other)" error={errors.bussines_nature}>
              <input
                className={inputCls}
                value={form.bussines_nature}
                onChange={(e) => set("bussines_nature", e.target.value)}
              />
            </Field>
          )}
          <Field label="Company Brochure PDF" error={errors.brochure_pdf}>
            <input
              type="file"
              accept="application/pdf"
              className={inputCls}
              disabled
              title="File upload wiring not enabled yet"
            />
          </Field>
          <Field label="Activity / Business Type" required error={errors.po_type}>
            <input
              className={inputCls}
              value={form.po_type}
              onChange={(e) => set("po_type", e.target.value)}
              placeholder="e.g. Goods / Services / Works"
            />
          </Field>
        </div>
      </Section>

      {/* ===== Internal (not on blade, but shown in list) ===== */}
      <Section title="Internal">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Approval Status" error={errors.approval_status}>
            <select
              className={inputCls}
              value={form.approval_status}
              onChange={(e) => set("approval_status", e.target.value)}
            >
              {APPROVAL_STATUSES.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Rating (0–5)" error={errors.rating}>
            <input
              type="number"
              min="0"
              max="5"
              step="0.1"
              className={inputCls}
              value={form.rating}
              onChange={(e) => set("rating", e.target.value)}
            />
          </Field>
          <div className="col-span-2">
            <Field label="Notes" error={errors.notes}>
              <textarea
                rows={3}
                className={`${inputCls} resize-none`}
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
              />
            </Field>
          </div>
        </div>
      </Section>

      <div className="pt-4 border-t border-border flex justify-end gap-3 sticky bottom-0 bg-surface-container-lowest -mx-6 px-6 pb-2">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="px-4 py-2 text-sm font-medium text-text border border-border rounded-md hover:bg-surface-container-low disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={submitting}
          className="px-6 py-2 text-sm font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-md disabled:opacity-60"
        >
          {submitting
            ? "Saving…"
            : isNew
              ? "Create Vendor"
              : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

export default function VendorDrawer({ open, vendor, onClose }) {
  const isNew = !vendor?.code;
  return (
    <Drawer
      open={open}
      title={isNew ? "New Vendor" : (vendor?.vendor_name ?? vendor?.code)}
      onClose={onClose}
      width="720px"
    >
      <VendorDrawerInner vendor={vendor} onClose={onClose} />
    </Drawer>
  );
}
