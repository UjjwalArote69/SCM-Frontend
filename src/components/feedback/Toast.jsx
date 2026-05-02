import { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

const TONE = {
  success: { bg: "bg-success", icon: CheckCircle2 },
  error: { bg: "bg-danger", icon: AlertCircle },
  info: { bg: "bg-info", icon: Info },
};

export default function Toast({
  open,
  tone = "success",
  message,
  onClose,
  duration = 4000,
}) {
  useEffect(() => {
    if (!open || !duration) return;
    const t = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(t);
  }, [open, duration, onClose]);

  if (!open) return null;

  const { bg, icon: Icon } = TONE[tone] ?? TONE.success;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-md shadow-lg text-white ${bg} animate-[slideUp_0.3s_ease-out]`}
      style={{
        animation: "slideUp 0.3s ease-out",
      }}
    >
      <Icon className="h-5 w-5 shrink-0" strokeWidth={2.25} />
      <span className="text-sm font-medium">{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="ml-3 opacity-80 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(16px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
