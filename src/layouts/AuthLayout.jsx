import { Boxes } from "lucide-react";
import ThemeToggle from "../components/ui/ThemeToggle.jsx";

/**
 * Two-pane shell used by Login / Forgot / Reset / post-action success pages.
 * Left: light brand panel (sticky, viewport height). Hidden on < lg.
 * Right: form canvas — scrolls naturally if content overflows.
 *
 * Mirrors the vendor onboarding aesthetic: light surface, italic tagline,
 * bold serif-feel heading, brand stats — keeps the experience cohesive
 * across vendor + internal sign-in.
 */
const DEFAULT_STATS = [
  { v: "45+", k: "Years" },
  { v: "1.2k", k: "Vendors" },
  { v: "₹3k cr", k: "PO/yr" },
];

export default function AuthLayout({
  children,
  brandEyebrow,
  brandTitle,
  brandSubtitle,
  brandStats = DEFAULT_STATS,
}) {
  return (
    <div className="min-h-screen w-full flex bg-bg text-text">
      {/* Left: light brand panel */}
      <aside className="hidden lg:flex lg:w-[440px] flex-col justify-between p-12 relative overflow-hidden sticky top-0 h-screen bg-surface-container-low border-r border-border">
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, var(--brand-primary), transparent 50%), radial-gradient(circle at 80% 70%, var(--brand-primary), transparent 50%)",
          }}
        />

        <div className="relative inline-flex items-center gap-3">
          <div className="h-11 w-11 rounded-lg bg-primary text-primary-foreground inline-flex items-center justify-center shadow-sm">
            <Boxes className="h-5 w-5" strokeWidth={2} />
          </div>
          <div className="leading-none">
            <div className="text-sm font-black tracking-[0.22em] uppercase text-text">
              SCM
            </div>
            <div className="text-[9px] mt-1 tracking-[0.32em] uppercase text-text-subtle">
              Meka Group
            </div>
          </div>
        </div>

        <div className="relative max-w-sm">
          {brandEyebrow && (
            <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-primary mb-3">
              {brandEyebrow}
            </p>
          )}
          <div className="italic text-text-muted text-2xl mb-3">
            Built on tide & steel.
          </div>
          <h1 className="text-3xl xl:text-4xl font-bold leading-[1.1] text-text">
            {brandTitle ?? (
              <>
                Supply Chain,
                <br />
                Simplified.
              </>
            )}
          </h1>
          <p className="text-[14px] text-text-muted mt-5 leading-relaxed">
            {brandSubtitle ??
              "Streamline operations, optimize logistics, and drive efficiency with absolute precision."}
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-4">
          {brandStats.map((s) => (
            <div key={s.k}>
              <div className="text-2xl font-bold text-text">{s.v}</div>
              <div className="text-[10px] tracking-[0.22em] uppercase text-text-subtle mt-1">
                {s.k}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Right: scrollable form pane */}
      <main className="relative flex-1 bg-bg flex flex-col">
        {/* Sticky mini-header with logo (mobile) + theme toggle */}
        <div className="sticky top-0 z-20 bg-bg/95 backdrop-blur-sm border-b border-border/50 lg:border-0 flex items-center justify-between px-6 sm:px-8 py-4">
          <div className="flex items-center gap-2 lg:invisible">
            <Boxes className="h-6 w-6 text-primary" strokeWidth={2.25} />
            <span className="text-primary font-black tracking-tighter text-xl uppercase">
              SCM
            </span>
          </div>
          <ThemeToggle />
        </div>

        {/* Form content — grows, natural flow, page scrolls if overflow */}
        <div className="flex-1 flex items-start sm:items-center justify-center px-6 sm:px-8 py-6 sm:py-10">
          <div className="w-full max-w-[440px]">{children}</div>
        </div>
      </main>
    </div>
  );
}
