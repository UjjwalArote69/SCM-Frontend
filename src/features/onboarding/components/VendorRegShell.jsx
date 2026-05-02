import { Link } from "react-router-dom";
import { Boxes, ArrowLeft, ArrowRight, Loader2, Check } from "lucide-react";
import ThemeToggle from "../../../components/ui/ThemeToggle.jsx";

// Single source of truth for step labels — also drives Stepper.jsx widths.
export const VENDOR_REG_STEPS = [
  { label: "Account",  desc: "Email & password" },
  { label: "Business", desc: "Verify your business" },
  { label: "Done",     desc: "Application submitted" },
];

/**
 * Split-screen registration shell.
 *  - Desktop (lg+): left brand panel (sticky) + right form column
 *  - Mobile:        compact top header + horizontal stepper + form below
 *
 * Action buttons live inline at the bottom of the form (no fixed footer).
 */
export default function VendorRegShell({
  currentStep,
  title,
  subtitle,
  onBack,
  onNext,
  nextLabel = "Continue",
  backLabel = "Back",
  nextDisabled = false,
  busy = false,
  singleAction,
  children,
}) {
  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Mobile top bar — keeps brand & sign-in visible above the form */}
      <header className="lg:hidden sticky top-0 z-30 h-14 bg-surface border-b border-border flex items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <Boxes className="h-5 w-5 text-primary" strokeWidth={2.25} />
          <span className="text-primary font-black tracking-tighter text-base uppercase">
            SCM
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            to="/login"
            className="text-xs font-semibold text-primary hover:brightness-110 uppercase tracking-wide"
          >
            Sign in
          </Link>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[420px_1fr] lg:min-h-screen">

        {/* ── Left brand panel (desktop only) ── */}
        <aside className="hidden lg:flex lg:flex-col bg-surface-container-low border-r border-border p-10 xl:p-14 lg:sticky lg:top-0 lg:h-screen">
          <Link to="/" className="flex items-center gap-2 mb-12">
            <Boxes className="h-6 w-6 text-primary" strokeWidth={2.25} />
            <span className="text-primary font-black tracking-tighter text-xl uppercase">
              SCM
            </span>
          </Link>

          <div className="flex-1">
            <h2 className="text-3xl font-bold tracking-tight text-text leading-tight">
              Become a verified supplier
            </h2>
            <p className="text-sm text-text-muted mt-3 leading-relaxed">
              Join our supplier network in three quick steps. Once approved,
              you&apos;ll receive RFQs, manage purchase orders, and get paid —
              all in one place.
            </p>

            {/* Vertical step indicator */}
            <ol className="mt-12 space-y-6">
              {VENDOR_REG_STEPS.map((step, idx) => {
                const num       = idx + 1;
                const completed = num < currentStep;
                const active    = num === currentStep;
                return (
                  <li key={step.label} className="flex items-start gap-4 relative">
                    {/* Connector line */}
                    {idx < VENDOR_REG_STEPS.length - 1 && (
                      <div
                        className={`absolute left-[15px] top-9 bottom-[-12px] w-px transition-colors ${
                          completed ? "bg-primary" : "bg-border"
                        }`}
                      />
                    )}
                    <div
                      className={`relative w-8 h-8 shrink-0 rounded-full border-2 flex items-center justify-center text-sm font-black transition-all ${
                        completed
                          ? "bg-primary border-primary text-primary-foreground shadow-sm"
                          : active
                            ? "border-primary bg-surface text-primary scale-110 shadow-sm"
                            : "border-border bg-surface text-text-subtle"
                      }`}
                    >
                      {completed ? <Check className="h-4 w-4" strokeWidth={3} /> : num}
                    </div>
                    <div className="pt-0.5 min-w-0 flex-1">
                      <div
                        className={`text-sm font-bold ${
                          active
                            ? "text-primary"
                            : completed
                              ? "text-text"
                              : "text-text-muted"
                        }`}
                      >
                        {step.label}
                      </div>
                      <div className="text-xs text-text-subtle mt-0.5">
                        {step.desc}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Sign in link + theme toggle pinned at the bottom */}
          <div className="mt-10 pt-6 border-t border-border flex items-center justify-between">
            <span className="text-xs text-text-muted">
              Already registered?{" "}
              <Link
                to="/login"
                className="text-primary font-bold hover:brightness-110"
              >
                Sign in →
              </Link>
            </span>
            <ThemeToggle />
          </div>
        </aside>

        {/* ── Right form column ── */}
        <main className="px-4 sm:px-6 lg:px-12 py-6 sm:py-10 lg:py-16">

          {/* Mobile horizontal stepper */}
          <div className="lg:hidden mb-6">
            <MobileStepper steps={VENDOR_REG_STEPS} current={currentStep} />
          </div>

          <div className="w-full max-w-2xl mx-auto">
            {(title || subtitle) && (
              <div className="mb-6 sm:mb-8">
                {title && (
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-text leading-tight">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-sm sm:text-base text-text-muted mt-2 sm:mt-3 leading-relaxed">
                    {subtitle}
                  </p>
                )}
              </div>
            )}

            {children}

            {/* Inline action bar */}
            <div className="mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-border flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
              <span className="text-[10px] sm:text-xs uppercase tracking-widest font-semibold text-text-subtle text-center sm:text-left">
                Step {currentStep} of {VENDOR_REG_STEPS.length}
              </span>

              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:items-center">
                {singleAction
                  ? singleAction
                  : (
                    <>
                      {currentStep > 1 && (
                        <button
                          type="button"
                          onClick={onBack}
                          disabled={busy}
                          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold border border-border text-text hover:bg-surface-container-low disabled:opacity-40 transition-colors"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          {backLabel}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={onNext}
                        disabled={nextDisabled || busy}
                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-60 transition-all shadow-sm"
                      >
                        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                        {!busy && nextLabel}
                        {!busy && <ArrowRight className="h-4 w-4" />}
                        {busy && nextLabel}
                      </button>
                    </>
                  )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Compact horizontal stepper for mobile — just dots + connector + active label.
function MobileStepper({ steps, current }) {
  const total = steps.length;
  return (
    <div>
      <div className="relative flex items-center justify-between">
        <div className="absolute left-4 right-4 top-3.5 h-[2px] bg-border -z-0" />
        <div
          className="absolute left-4 top-3.5 h-[2px] bg-primary -z-0 transition-all duration-300"
          style={{
            width:
              current <= 1
                ? "0%"
                : current >= total
                  ? "calc(100% - 2rem)"
                  : `calc(${((current - 1) / (total - 1)) * 100}% - ${((current - 1) / (total - 1)) * 2}rem)`,
          }}
        />
        {steps.map((s, idx) => {
          const num = idx + 1;
          const completed = num < current;
          const active    = num === current;
          return (
            <div key={s.label} className="relative z-10 flex flex-col items-center bg-bg px-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all duration-200 ${
                  completed
                    ? "bg-primary border-primary text-primary-foreground"
                    : active
                      ? "border-primary bg-surface text-primary scale-110 shadow-sm"
                      : "border-border bg-surface text-text-subtle"
                }`}
              >
                {completed ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : num}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-center text-xs font-bold uppercase tracking-widest text-primary mt-3">
        {steps[current - 1]?.label}
      </p>
    </div>
  );
}
