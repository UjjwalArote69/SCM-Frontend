import { useState } from "react";
import { Check, Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { useOnboardingStore } from "../store.js";

const CERTIFICATES = ["ISO 9001", "ISO 14001", "RoHS Compliant", "GMP", "Other"];

const CATEGORIES = ["Raw Materials", "Packaging", "Equipment", "Services"];
const SUBCATEGORIES = ["Metals", "Plastics", "Electronics", "General"];
const COUNTRIES = ["India", "United States", "Germany", "Japan", "United Kingdom"];

const inputCls =
  "w-full bg-surface-container-lowest border-0 border-b-2 border-outline-variant focus:border-primary focus:ring-0 px-4 py-3 text-text text-sm transition-colors outline-none placeholder:text-text-subtle";

function SectionHeader({ accent = "bg-primary", children }) {
  return (
    <h2 className="text-lg font-semibold text-text mb-6 flex items-center gap-2">
      <span className={`w-1 h-6 ${accent} rounded-r`} />
      {children}
    </h2>
  );
}

function Labeled({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-muted mb-2">
        {label}
        {required && " *"}
      </label>
      {children}
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}

export default function Step1VendorInfo() {
  const s = useOnboardingStore();
  const set = useOnboardingStore((x) => x.set);

  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [touched, setTouched] = useState({});

  const passTooShort = s.password.length > 0 && s.password.length < 8;
  const mismatch = confirm.length > 0 && s.password !== confirm;
  const passOk = s.password.length >= 8 && s.password === confirm;

  const strength = (() => {
    let n = 0;
    if (s.password.length >= 8) n++;
    if (/[A-Z]/.test(s.password)) n++;
    if (/[0-9]/.test(s.password)) n++;
    if (/[^A-Za-z0-9]/.test(s.password)) n++;
    return n;
  })();

  const toggleCert = (cert) => {
    const list = s.certificates ?? [];
    set(
      "certificates",
      list.includes(cert) ? list.filter((c) => c !== cert) : [...list, cert],
    );
  };

  return (
    <>
      {/* Company Details */}
      <section>
        <SectionHeader accent="bg-primary">Company Details</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Labeled label="Company Name" required>
              <input
                className={inputCls}
                value={s.vendor_name}
                onChange={(e) => set("vendor_name", e.target.value)}
                placeholder="Enter legally registered entity name"
              />
            </Labeled>
          </div>
          <Labeled label="Vendor Category" required>
            <select
              className={`${inputCls} appearance-none`}
              value={s.category}
              onChange={(e) => set("category", e.target.value)}
            >
              <option value="">Select Category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Labeled>
          <Labeled label="Subcategory">
            <select
              className={`${inputCls} appearance-none`}
              value={s.sub_categories_id}
              onChange={(e) => set("sub_categories_id", e.target.value)}
            >
              <option value="">Select Subcategory</option>
              {SUBCATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Labeled>
          <Labeled label="GST Number" required>
            <input
              className={`${inputCls} uppercase font-mono`}
              value={s.gst}
              onChange={(e) => set("gst", e.target.value)}
              placeholder="22AAAAA0000A1Z5"
            />
          </Labeled>
          <Labeled label="PAN Number" required>
            <input
              className={`${inputCls} uppercase font-mono`}
              value={s.pan}
              onChange={(e) => set("pan", e.target.value)}
              placeholder="ABCDE1234F"
            />
          </Labeled>
        </div>
      </section>

      {/* Primary Contact */}
      <section className="border-t border-border pt-10">
        <SectionHeader accent="bg-text-muted">Primary Contact</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Labeled label="Contact Name" required>
              <input
                className={inputCls}
                value={s.contact_person_1}
                onChange={(e) => set("contact_person_1", e.target.value)}
                placeholder="Full Name"
              />
            </Labeled>
          </div>
          <div className="md:col-span-2">
            <div className="flex items-start gap-2 mb-2 text-xs text-info bg-info-soft/60 border border-info/20 rounded-md px-3 py-2">
              <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                This email will be your <strong>login email</strong> once your
                application is approved.
              </span>
            </div>
            <Labeled
              label="Email Address (used for login)"
              required
              error={touched.email_address_1 && !s.email_address_1 ? "Required" : null}
            >
              <input
                type="email"
                autoComplete="email"
                className={inputCls}
                value={s.email_address_1}
                onChange={(e) => set("email_address_1", e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, email_address_1: true }))}
                placeholder="work@company.com"
              />
            </Labeled>
          </div>
          <Labeled label="Contact Number" required>
            <input
              type="tel"
              className={inputCls}
              value={s.contact_no}
              onChange={(e) => set("contact_no", e.target.value)}
              placeholder="+91 98765 43210"
            />
          </Labeled>
        </div>
      </section>

      {/* Sign-in Credentials */}
      <section className="border-t border-border pt-10">
        <SectionHeader accent="bg-primary">
          <span className="inline-flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" /> Sign-in Credentials
          </span>
        </SectionHeader>

        <div className="flex items-start gap-2 mb-6 text-xs text-text-muted bg-surface-container-lowest border border-border rounded-md px-3 py-2">
          <ShieldCheck className="h-4 w-4 mt-0.5 text-primary shrink-0" />
          <span>
            Set the password you&apos;ll use together with the email above.
            Minimum 8 characters.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Labeled
            label="Password"
            required
            error={passTooShort ? "Must be at least 8 characters." : null}
          >
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                autoComplete="new-password"
                className={`${inputCls} pr-10`}
                value={s.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                onClick={() => setShow((x) => !x)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {s.password.length > 0 && !passTooShort && (
              <div className="mt-2 flex items-center gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className={`h-1 w-8 rounded-full ${
                      i <= strength
                        ? strength >= 3
                          ? "bg-success"
                          : strength === 2
                            ? "bg-warning"
                            : "bg-danger"
                        : "bg-outline-variant"
                    }`}
                  />
                ))}
                <span className="text-[11px] uppercase tracking-wider ml-2 text-text-subtle">
                  {strength >= 3 ? "Strong" : strength === 2 ? "Fair" : "Weak"}
                </span>
              </div>
            )}
          </Labeled>

          <Labeled
            label="Confirm Password"
            required
            error={mismatch ? "Passwords do not match." : null}
          >
            <input
              type={show ? "text" : "password"}
              autoComplete="new-password"
              className={inputCls}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter the password"
            />
            {passOk && (
              <p className="text-xs text-success mt-1 inline-flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> Looks good.
              </p>
            )}
          </Labeled>
        </div>
      </section>

      {/* Address */}
      <section className="border-t border-border pt-10">
        <SectionHeader accent="bg-info">Registered Address</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-3">
            <Labeled label="Street Address" required>
              <input
                className={inputCls}
                value={s.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Building, Street, Area"
              />
            </Labeled>
          </div>
          <Labeled label="City" required>
            <input
              className={inputCls}
              value={s.city}
              onChange={(e) => set("city", e.target.value)}
            />
          </Labeled>
          <Labeled label="State/Province" required>
            <input
              className={inputCls}
              value={s.state}
              onChange={(e) => set("state", e.target.value)}
            />
          </Labeled>
          <Labeled label="Country" required>
            <select
              className={`${inputCls} appearance-none`}
              value={s.country}
              onChange={(e) => set("country", e.target.value)}
            >
              <option value="">Select Country</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Labeled>
          <Labeled label="Pincode/Zip" required>
            <input
              className={inputCls}
              value={s.zipcode}
              onChange={(e) => set("zipcode", e.target.value)}
              placeholder="000000"
            />
          </Labeled>
        </div>
      </section>

      {/* Certificates */}
      <section className="border-t border-border pt-10">
        <SectionHeader accent="bg-text-subtle">
          Required Certificates
        </SectionHeader>
        <p className="text-sm text-text-muted mb-4">
          Select all compliance certificates held by your organization.
        </p>
        <div className="flex flex-wrap gap-3">
          {CERTIFICATES.map((c) => {
            const selected = (s.certificates ?? []).includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleCert(c)}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full border transition-colors ${
                  selected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-surface-container-lowest text-text-muted border-border hover:bg-surface-alt"
                }`}
              >
                {c}
                {selected && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}
