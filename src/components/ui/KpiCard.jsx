import { Link } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";

const TONE_CHIP = {
  primary: "bg-primary-soft text-primary",
  info:    "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger:  "bg-danger-soft text-danger",
  neutral: "bg-surface-container-high text-text-muted",
};

const TONE_BAR = {
  primary: "bg-primary",
  info:    "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger:  "bg-danger",
  neutral: "bg-surface-container-high",
};

const TONE_VALUE = {
  primary: "text-primary",
  info:    "text-text",
  success: "text-success",
  warning: "text-warning",
  danger:  "text-danger",
  neutral: "text-text-muted",
};

export default function KpiCard({
  label,
  value,
  icon: Icon,
  desc,
  tone = "info",
  to,
  loading,
  onClick,
}) {
  const inner = (
    <>
      <div className={`absolute top-0 left-0 right-0 h-1 ${TONE_BAR[tone] ?? TONE_BAR.info} rounded-t-xl`} />
      <div className="flex items-start justify-between mt-1 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${TONE_CHIP[tone] ?? TONE_CHIP.info}`}>
          {Icon && <Icon className="h-5 w-5" />}
        </div>
        {(to || onClick) && (
          <ArrowRight className="h-4 w-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
      <div className={`text-3xl font-black leading-none ${TONE_VALUE[tone] ?? "text-text"}`}>
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
        ) : (
          value ?? 0
        )}
      </div>
      <div className="text-sm font-semibold text-text mt-2">{label}</div>
      {desc && <div className="text-xs text-text-muted mt-1">{desc}</div>}
    </>
  );

  const cls =
    "bg-surface-container-lowest border border-border rounded-xl p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 shadow-sm group block text-left w-full relative overflow-hidden";

  if (to) {
    return (
      <Link to={to} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}
