import { CheckCircle2, Mail, KeyRound, Clock, AlertCircle, Building2, Sparkles } from "lucide-react";
import { useOnboardingStore } from "../store.js";

export default function Step3Status() {
  const submitted    = useOnboardingStore((s) => s.submitted);
  const submitError  = useOnboardingStore((s) => s.submitError);
  const pendingEmail = useOnboardingStore((s) => s.email_address_1);
  const pendingName  = useOnboardingStore((s) => s.vendor_name);
  const email = submitted?.email ?? pendingEmail;
  const name  = submitted?.vendor_name ?? pendingName;
  const code  = submitted?.code;

  if (submitError && !submitted) {
    return (
      <div className="text-center py-6 sm:py-10">
        <div className="mx-auto w-20 h-20 bg-danger-soft rounded-2xl flex items-center justify-center mb-6">
          <AlertCircle className="h-10 w-10 text-danger" strokeWidth={1.75} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text mb-2">
          Submission failed
        </h1>
        <p className="text-sm text-text-muted max-w-md mx-auto">
          {submitError}
        </p>
        <p className="text-xs text-text-subtle mt-4">
          Go back, correct the issue, and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success header */}
      <div className="text-center py-4">
        <div className="relative inline-flex">
          <div className="w-20 h-20 bg-success-soft rounded-2xl flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-success" strokeWidth={2} />
          </div>
          <Sparkles className="h-5 w-5 text-warning absolute -top-1 -right-1" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text mt-5 mb-2">
          You&apos;re registered!
        </h1>
        <p className="text-sm text-text-muted max-w-md mx-auto leading-relaxed">
          Your application has been received. Our team will review it within
          3–5 business days — you&apos;ll get an email once approved.
        </p>
      </div>

      {/* Summary card */}
      <div className="bg-surface-container-low border border-border rounded-2xl p-5 sm:p-6">
        <h2 className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-4 pb-3 border-b border-border">
          Application summary
        </h2>
        <div className="space-y-3">
          <SummaryRow icon={Building2} label="Company" value={name} />
          {code && <SummaryRow label="Vendor code" value={code} mono />}
          <SummaryRow icon={Mail} label="Login email" value={email} />
          <SummaryRow
            label="Status"
            value={
              <span className="inline-flex items-center gap-1.5 text-warning text-xs font-bold uppercase tracking-wider bg-warning-soft px-2 py-0.5 rounded">
                <Clock className="h-3 w-3" /> Pending review
              </span>
            }
          />
        </div>
      </div>

      {/* Sign-in hint */}
      <div className="flex items-start gap-3 bg-info-soft/40 border border-info/30 rounded-2xl p-4 sm:p-5">
        <div className="w-9 h-9 rounded-xl bg-info-soft text-info flex items-center justify-center shrink-0">
          <KeyRound className="h-4 w-4" />
        </div>
        <div className="flex-1 text-sm">
          <p className="font-bold text-text">You can sign in now</p>
          <p className="text-xs text-text-muted mt-1 leading-relaxed">
            Use your work email and the password you set in Step 1. Your
            dashboard will fully unlock once your application is approved.
          </p>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ icon: Icon, label, value, mono }) {
  return (
    <div className="flex items-center gap-3">
      {Icon ? (
        <div className="w-8 h-8 rounded-lg bg-surface-container-high text-text-muted flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4" />
        </div>
      ) : (
        <div className="w-8 shrink-0" />
      )}
      <div className="min-w-0 flex-1 flex items-center justify-between gap-3">
        <span className="text-xs text-text-muted uppercase tracking-wider font-bold whitespace-nowrap">
          {label}
        </span>
        <span
          className={`text-sm text-text font-semibold truncate text-right ${
            mono ? "font-mono" : ""
          }`}
        >
          {value || "—"}
        </span>
      </div>
    </div>
  );
}
