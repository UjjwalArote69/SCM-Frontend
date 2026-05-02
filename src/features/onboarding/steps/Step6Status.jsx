import { CheckCircle2, ClipboardList, Mail, KeyRound, Clock, AlertCircle } from "lucide-react";
import { useOnboardingStore } from "../store.js";

export default function Step6Status() {
  const submitted = useOnboardingStore((s) => s.submitted);
  const submitError = useOnboardingStore((s) => s.submitError);
  const pendingEmail = useOnboardingStore((s) => s.email_address_1);
  const pendingName = useOnboardingStore((s) => s.vendor_name);
  const email = submitted?.email ?? pendingEmail;
  const name = submitted?.vendor_name ?? pendingName;
  const code = submitted?.code;

  if (submitError && !submitted) {
    return (
      <div className="text-center">
        <div className="mx-auto w-24 h-24 bg-danger-soft rounded-full flex items-center justify-center shadow-sm mb-8">
          <AlertCircle className="h-14 w-14 text-danger" strokeWidth={1.75} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-text mb-3">
          Submission failed
        </h1>
        <p className="text-base text-text-muted max-w-lg mx-auto leading-relaxed mb-4">
          {submitError}
        </p>
        <p className="text-sm text-text-subtle">
          Go back, correct the issue, and try submitting again.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="text-center">
        <div className="mx-auto w-24 h-24 bg-surface-alt rounded-full flex items-center justify-center shadow-sm mb-8">
          <CheckCircle2 className="h-14 w-14 text-primary" strokeWidth={1.75} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-text mb-3">
          Application submitted
        </h1>
        <p className="text-base text-text-muted max-w-lg mx-auto leading-relaxed">
          Our team will review your documents within 3–5 business days. You&apos;ll
          get an email once approved.
        </p>
      </div>

      {/* Login credentials callout */}
      <div className="bg-info-soft/40 border border-info/30 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-info-soft flex items-center justify-center shrink-0">
            <KeyRound className="h-5 w-5 text-info" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-text mb-2">
              How you&apos;ll sign in
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-text-muted">
                <Mail className="h-4 w-4" />
                <span>Login email:</span>
                <strong className="text-text font-semibold">
                  {email || "—"}
                </strong>
              </div>
              <div className="flex items-center gap-2 text-text-muted">
                <KeyRound className="h-4 w-4" />
                <span>Password:</span>
                <strong className="text-text font-semibold">
                  the one you set on Step 1
                </strong>
              </div>
              <div className="flex items-center gap-2 text-text-muted text-xs mt-3 pt-3 border-t border-info/20">
                <Clock className="h-4 w-4" />
                <span>
                  You can sign in now — your account is active but awaiting
                  admin approval. Your dashboard will unlock once approved.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-lg p-8 relative overflow-hidden shadow-sm">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
        <h2 className="text-lg font-bold text-text mb-6 flex items-center gap-2 border-b border-border pb-4">
          <ClipboardList className="h-5 w-5 text-primary" />
          Submission Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
          <Row label="Company Name" value={name} />
          {code && <Row label="Vendor Code" value={code} />}
          <Row label="Login Email" value={email} />
          <Row label="Application Status" value="Pending review" />
        </div>
      </div>
    </>
  );
}

function Row({ label, value }) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-text-muted uppercase tracking-wider font-semibold block">
        {label}
      </span>
      <span className="text-base text-text font-medium break-all">
        {value || "—"}
      </span>
    </div>
  );
}
