import { useState } from "react";
import { Building2, Mail, Eye, EyeOff, Check, Lock, AlertCircle, ShieldCheck } from "lucide-react";
import { useOnboardingStore } from "../store.js";

const inputCls = (error) =>
  `w-full bg-bg border rounded-xl px-4 py-3.5 text-sm text-text outline-none transition-colors placeholder:text-text-subtle ${
    error
      ? "border-danger focus:border-danger focus:ring-2 focus:ring-danger/20"
      : "border-border focus:border-primary focus:ring-2 focus:ring-primary/15"
  }`;

function Field({ label, required, error, hint, rightSlot, children }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
        {rightSlot}
      </div>
      {children}
      {error ? (
        <p className="text-xs text-danger mt-1.5 font-medium flex items-start gap-1">
          <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="text-[11px] text-text-subtle mt-1.5 leading-relaxed">{hint}</p>
      ) : null}
    </div>
  );
}

export default function Step1Account({ errors = {} }) {
  const s   = useOnboardingStore();
  const set = useOnboardingStore((x) => x.set);

  const [confirm, setConfirm] = useState("");
  const [show, setShow]       = useState(false);

  const passTooShort = s.password.length > 0 && s.password.length < 8;
  const mismatch     = confirm.length > 0 && s.password !== confirm;
  const passOk       = s.password.length >= 8 && s.password === confirm;

  const strength = (() => {
    let n = 0;
    if (s.password.length >= 8) n++;
    if (/[A-Z]/.test(s.password)) n++;
    if (/[0-9]/.test(s.password)) n++;
    if (/[^A-Za-z0-9]/.test(s.password)) n++;
    return n;
  })();

  const nameError  = errors.vendor_name;
  const emailError = errors.email_address_1;
  const passError  = errors.password || (passTooShort ? "Must be at least 8 characters" : null);

  return (
    <div className="space-y-6">

      {/* Company section */}
      <div className="space-y-5">
        <Field
          label="Company Name"
          required
          hint={nameError ? null : "Use the legally registered entity name"}
          error={nameError}
        >
          <div className="relative">
            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
            <input
              className={`${inputCls(nameError)} pl-11`}
              value={s.vendor_name}
              onChange={(e) => set("vendor_name", e.target.value)}
              placeholder="Acme Industries Pvt. Ltd."
              autoComplete="organization"
            />
          </div>
        </Field>

        <Field
          label="Work Email"
          required
          hint={emailError ? null : "You'll use this email to sign in once approved"}
          error={emailError}
        >
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
            <input
              type="email"
              autoComplete="email"
              className={`${inputCls(emailError)} pl-11`}
              value={s.email_address_1}
              onChange={(e) => set("email_address_1", e.target.value)}
              placeholder="contact@acme.com"
            />
          </div>
        </Field>
      </div>

      {/* Password section — visually grouped */}
      <div className="bg-surface-container-low border border-border rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-text">Set a strong password</h3>
            <p className="text-xs text-text-muted mt-0.5">
              You&apos;ll use this with your work email to sign in.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field
            label="Password"
            required
            error={passError}
            hint={!passError ? "Minimum 8 characters" : null}
            rightSlot={
              <button
                type="button"
                onClick={() => setShow((x) => !x)}
                aria-label={show ? "Hide password" : "Show password"}
                className="text-[11px] font-semibold text-primary inline-flex items-center gap-1 hover:brightness-110"
              >
                {show ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {show ? "Hide" : "Show"}
              </button>
            }
          >
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
              <input
                type={show ? "text" : "password"}
                autoComplete="new-password"
                className={`${inputCls(passError)} pl-11`}
                value={s.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {s.password.length > 0 && !passError && (
              <div className="mt-2 flex items-center gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
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
                <span className="text-[10px] uppercase tracking-wider ml-2 text-text-subtle font-bold">
                  {strength >= 3 ? "Strong" : strength === 2 ? "Fair" : "Weak"}
                </span>
              </div>
            )}
          </Field>

          <Field
            label="Confirm Password"
            required
            error={mismatch ? "Passwords do not match" : null}
          >
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
              <input
                type={show ? "text" : "password"}
                autoComplete="new-password"
                className={`${inputCls(mismatch)} pl-11`}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter password"
              />
            </div>
            {passOk && (
              <p className="text-xs text-success mt-1.5 inline-flex items-center gap-1 font-medium">
                <Check className="h-3.5 w-3.5" /> Passwords match
              </p>
            )}
          </Field>
        </div>
      </div>
    </div>
  );
}
