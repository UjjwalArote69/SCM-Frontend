const TONE = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  neutral: "bg-surface-container-high text-text",
};

export default function StatusPill({ tone = "neutral", children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TONE[tone] ?? TONE.neutral} ${className}`}
    >
      {children}
    </span>
  );
}
