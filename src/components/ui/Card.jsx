/**
 * Standard surface container used across the app for sectioned content.
 * Use `padding="lg"` for primary content, `"md"` for tighter cards (e.g. KPIs),
 * `"none"` when the child needs full bleed (e.g. tables).
 */
// Responsive padding: tighter on mobile, roomier from `sm` up. Cards used
// for KPIs and form sections benefit from less bezel on small screens.
const PADDING = {
  none: "",
  sm: "p-3 sm:p-4",
  md: "p-4 sm:p-5",
  lg: "p-4 sm:p-6",
};

export default function Card({
  padding = "lg",
  className = "",
  children,
  ...rest
}) {
  return (
    <div
      className={`bg-surface-container-lowest border border-border rounded-lg ${PADDING[padding] ?? PADDING.lg} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ icon: Icon, children, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-sm font-bold text-text uppercase tracking-wider flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-text-muted" />}
        {children}
      </h2>
      {action}
    </div>
  );
}
