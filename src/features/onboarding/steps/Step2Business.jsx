import { User, Phone, FileText, MapPin, Info, AlertCircle, ShieldCheck, Globe } from "lucide-react";
import { useOnboardingStore } from "../store.js";

const COUNTRIES = ["India", "United States", "Germany", "Japan", "United Kingdom"];

const inputCls = (error) =>
  `w-full bg-bg border rounded-xl px-4 py-3.5 text-sm text-text outline-none transition-colors placeholder:text-text-subtle ${
    error
      ? "border-danger focus:border-danger focus:ring-2 focus:ring-danger/20"
      : "border-border focus:border-primary focus:ring-2 focus:ring-primary/15"
  }`;

function Field({ label, required, hint, error, children }) {
  return (
    <div className="min-w-0">
      <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-danger mt-1.5 font-medium flex items-start gap-1">
          <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" /> <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="text-[11px] text-text-subtle mt-1.5">{hint}</p>
      ) : null}
    </div>
  );
}

function SectionCard({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="bg-surface-container-low border border-border rounded-2xl p-5 sm:p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-text">{title}</h3>
          {subtitle && (
            <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function Step2Business({ errors = {} }) {
  const s   = useOnboardingStore();
  const set = useOnboardingStore((x) => x.set);

  return (
    <div className="space-y-5">

      {/* Helpful info banner */}
      <div className="flex items-start gap-2.5 text-xs text-info bg-info-soft/50 border border-info/30 rounded-xl px-4 py-3">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <span className="leading-relaxed">
          All fields below are required so we can verify your business and
          approve your application. Bank details and other extras can be added
          from your profile later.
        </span>
      </div>

      {/* Primary contact */}
      <SectionCard
        icon={User}
        title="Primary contact"
        subtitle="Who should we reach out to about RFQs and orders?"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Contact Name" required error={errors.contact_person_1}>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
              <input
                className={`${inputCls(errors.contact_person_1)} pl-11`}
                value={s.contact_person_1}
                onChange={(e) => set("contact_person_1", e.target.value)}
                placeholder="Full name"
                autoComplete="name"
              />
            </div>
          </Field>
          <Field label="Phone" required error={errors.contact_no}>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
              <input
                type="tel"
                className={`${inputCls(errors.contact_no)} pl-11`}
                value={s.contact_no}
                onChange={(e) => set("contact_no", e.target.value)}
                placeholder="+91 98765 43210"
                autoComplete="tel"
              />
            </div>
          </Field>
        </div>
      </SectionCard>

      {/* Compliance */}
      <SectionCard
        icon={ShieldCheck}
        title="Tax & compliance"
        subtitle="GSTIN and PAN — used to verify your business"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field
            label="GST Number"
            required
            hint="15 alphanumeric characters"
            error={errors.gst}
          >
            <div className="relative">
              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
              <input
                className={`${inputCls(errors.gst)} pl-11 uppercase font-mono`}
                value={s.gst}
                onChange={(e) => set("gst", e.target.value.toUpperCase())}
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
              />
            </div>
          </Field>
          <Field
            label="PAN Number"
            required
            hint="10 characters (e.g. ABCDE1234F)"
            error={errors.pan}
          >
            <div className="relative">
              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
              <input
                className={`${inputCls(errors.pan)} pl-11 uppercase font-mono`}
                value={s.pan}
                onChange={(e) => set("pan", e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                maxLength={10}
              />
            </div>
          </Field>
        </div>
      </SectionCard>

      {/* Address */}
      <SectionCard
        icon={MapPin}
        title="Registered address"
        subtitle="Where your business is officially registered"
      >
        <div className="space-y-5">
          <Field label="Street Address" required error={errors.address}>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
              <input
                className={`${inputCls(errors.address)} pl-11`}
                value={s.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Building, street, area"
                autoComplete="street-address"
              />
            </div>
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="City" required error={errors.city}>
              <input
                className={inputCls(errors.city)}
                value={s.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Mumbai"
                autoComplete="address-level2"
              />
            </Field>
            <Field label="State" required error={errors.state}>
              <input
                className={inputCls(errors.state)}
                value={s.state}
                onChange={(e) => set("state", e.target.value)}
                placeholder="Maharashtra"
                autoComplete="address-level1"
              />
            </Field>
            <Field label="Country" required error={errors.country}>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
                <select
                  className={`${inputCls(errors.country)} pl-11 appearance-none cursor-pointer`}
                  value={s.country}
                  onChange={(e) => set("country", e.target.value)}
                >
                  <option value="">Select country</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </Field>
            <Field label="Pincode" required error={errors.zipcode}>
              <input
                className={inputCls(errors.zipcode)}
                value={s.zipcode}
                onChange={(e) => set("zipcode", e.target.value)}
                placeholder="400001"
                autoComplete="postal-code"
                inputMode="numeric"
              />
            </Field>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
