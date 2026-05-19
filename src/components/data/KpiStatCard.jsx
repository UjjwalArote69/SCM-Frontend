/**
 * Shared KPI tile used at the top of every "list" page (PR/PO/RFQ/GRN).
 *
 * Visual states:
 *   idle    glass card, soft icon tile in `tone` color, muted label
 *   active  tone-tinted card surface + solid colored border + ring,
 *           inverted icon tile (filled tone bg, white glyph),
 *           tone-colored label, and a "FILTER" chip in the top-right
 *           that makes the selection unmistakable
 *
 * Tones: neutral · info · warning · success · danger
 *
 * The active state intentionally uses a per-tone color (not a single primary
 * accent) so multi-page consistency reads at a glance — yellow-pending,
 * green-approved, red-rejected, etc.
 */
export default function KpiStatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  active,
  onClick,
}) {
  const idleIconBg = {
    neutral: "bg-surface-container",
    info: "bg-info-soft",
    warning: "bg-warning-soft",
    success: "bg-success-soft",
    danger: "bg-danger-soft",
    primary: "bg-primary-soft",
  };
  const idleIconColor = {
    neutral: "text-text-muted",
    info: "text-info",
    warning: "text-warning",
    success: "text-success",
    danger: "text-danger",
    primary: "text-primary",
  };
  const activeCard = {
    neutral: "bg-surface-container-low border-text-muted shadow-md ring-2 ring-text-muted/20",
    info:    "bg-info-soft border-info shadow-md ring-2 ring-info/20",
    warning: "bg-warning-soft border-warning shadow-md ring-2 ring-warning/20",
    success: "bg-success-soft border-success shadow-md ring-2 ring-success/20",
    danger:  "bg-danger-soft border-danger shadow-md ring-2 ring-danger/20",
    primary: "bg-primary-soft border-primary shadow-md ring-2 ring-primary/20",
  };
  const activeIconBg = {
    neutral: "bg-text-muted",
    info:    "bg-info",
    warning: "bg-warning",
    success: "bg-success",
    danger:  "bg-danger",
    primary: "bg-primary",
  };
  const activeChipCls = {
    neutral: "text-text-muted",
    info:    "text-info",
    warning: "text-warning",
    success: "text-success",
    danger:  "text-danger",
    primary: "text-primary",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative text-left flex items-center gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-2xl border transition-all duration-200 shrink-0 snap-start min-w-[125px] sm:min-w-0 hover:shadow-lg hover:-translate-y-0.5 ${
        active ? activeCard[tone] : "glass-card border-transparent"
      }`}
    >
      {active && (
        <>
          {/* Mobile: tiny dot indicator only (no text to avoid label overlap on narrow cards) */}
          <span
            className={`sm:hidden absolute top-2 right-2 w-2 h-2 rounded-full ${activeIconBg[tone]}`}
            aria-hidden
          />
          {/* Desktop: full "Filter" chip */}
          <span
            className={`hidden sm:inline-flex absolute top-2 right-2 items-center gap-1 px-1.5 py-[2px] rounded-full bg-bg/70 backdrop-blur-sm text-[8.5px] font-bold uppercase tracking-[0.14em] ${activeChipCls[tone]}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${activeIconBg[tone]}`} />
            Filter
          </span>
        </>
      )}

      <div
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
          active ? activeIconBg[tone] : idleIconBg[tone]
        }`}
      >
        <Icon
          className={`h-4 w-4 ${active ? "text-white" : idleIconColor[tone]}`}
          strokeWidth={2.25}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={`text-[10px] uppercase tracking-[0.14em] sm:tracking-[0.18em] font-semibold truncate ${
            active ? activeChipCls[tone] : "text-text-muted"
          }`}
        >
          {label}
        </div>
        <div className="text-xl sm:text-2xl font-bold tracking-tight tabular-nums leading-tight text-text">
          {value}
        </div>
      </div>
    </button>
  );
}
