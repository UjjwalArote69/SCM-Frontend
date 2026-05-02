import { Check } from "lucide-react";

/**
 * Horizontal stepper. Labels visible on sm+, dots-only on mobile to save space.
 * `current` is 1-based. Completed = step < current.
 */
export default function Stepper({ steps, current }) {
  return (
    <div className="relative w-full flex items-center justify-between">
      {/* baseline */}
      <div className="absolute left-4 right-4 top-4 h-[2px] bg-border -z-0" />
      {/* filled progress */}
      <div
        className="absolute left-4 top-4 h-[2px] bg-primary -z-0 transition-all duration-300"
        style={{
          width:
            current <= 1
              ? "0%"
              : current >= steps.length
                ? "calc(100% - 2rem)"
                : `calc(${((current - 1) / (steps.length - 1)) * 100}% - ${((current - 1) / (steps.length - 1)) * 2}rem)`,
        }}
      />
      {steps.map((label, idx) => {
        const step = idx + 1;
        const completed = step < current;
        const active = step === current;
        return (
          <div
            key={label}
            className="relative z-10 flex flex-col items-center bg-bg px-1"
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-200 ${
                completed
                  ? "bg-primary border-primary text-primary-foreground shadow-sm"
                  : active
                    ? "border-primary bg-surface text-primary shadow-sm scale-110"
                    : "border-border bg-surface text-text-subtle"
              }`}
            >
              {completed ? <Check className="h-4 w-4" strokeWidth={3} /> : step}
            </div>
            <span
              className={`mt-2 text-[11px] sm:text-xs font-bold whitespace-nowrap hidden sm:block ${
                active
                  ? "text-primary"
                  : completed
                    ? "text-text"
                    : "text-text-subtle"
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
