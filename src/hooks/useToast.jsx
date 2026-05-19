import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const TONE = {
  success: { bg: "bg-success", icon: CheckCircle2 },
  error: { bg: "bg-danger", icon: AlertCircle },
  warning: { bg: "bg-warning", icon: AlertCircle },
  info: { bg: "bg-info", icon: Info },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, tone = "success", duration = 3500) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, tone }]);
      if (duration) {
        setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss],
  );

  const success = useCallback((m) => push(m, "success"), [push]);
  const error = useCallback((m) => push(m, "error"), [push]);
  const info = useCallback((m) => push(m, "info"), [push]);
  const warning = useCallback((m) => push(m, "warning"), [push]);

  return (
    <ToastContext.Provider value={{ push, success, error, info, warning }}>
      {children}

      {/*
        Two distinct toast placements:
        - Mobile (< sm): compact pill, bottom-center, floating above the
          edge with safe-area awareness. Truncates long text.
        - Desktop (sm+): larger card, bottom-RIGHT corner. Bigger type,
          wraps long messages, supports comfortable reading distance.
      */}
      <div
        className="fixed z-[100] pointer-events-none flex flex-col gap-2
          left-1/2 -translate-x-1/2 items-center
          bottom-[max(2rem,env(safe-area-inset-bottom,2rem))]
          sm:left-auto sm:right-6 sm:translate-x-0 sm:items-end
          sm:bottom-6"
      >
        {toasts.map((t) => {
          const { bg, icon: Icon } = TONE[t.tone] ?? TONE.success;
          return (
            <div
              key={t.id}
              role="status"
              aria-live="polite"
              className={`pointer-events-auto text-white ring-1 ring-white/15 ${bg} animate-toastFloat
                /* MOBILE — tight pill, truncates */
                inline-flex items-center gap-2 pl-3 pr-1.5 py-2 rounded-full
                text-[12.5px] font-medium max-w-[calc(100vw-2rem)]
                shadow-[0_12px_28px_-6px_rgba(0,0,0,0.40),0_4px_10px_-3px_rgba(0,0,0,0.25)]
                /* DESKTOP — bigger card, wraps; vertically centered */
                sm:flex sm:items-center sm:gap-3 sm:pl-5 sm:pr-3 sm:py-3.5 sm:rounded-2xl
                sm:text-[14px] sm:font-semibold sm:min-w-[320px] sm:max-w-md
                sm:shadow-[0_16px_36px_-8px_rgba(0,0,0,0.40),0_6px_16px_-4px_rgba(0,0,0,0.28)]`}
            >
              <Icon
                className="h-3.5 w-3.5 shrink-0 sm:h-5 sm:w-5"
                strokeWidth={2.5}
              />
              <span className="truncate min-w-0 sm:whitespace-normal sm:break-words sm:flex-1 sm:leading-snug sm:text-left">
                {t.message}
              </span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="ml-0.5 p-1 rounded-full opacity-75 hover:opacity-100 hover:bg-white/20 transition-colors shrink-0 sm:p-1.5"
                aria-label="Dismiss"
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes toastFloat {
          from {
            transform: translateY(20px) scale(0.92);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        .animate-toastFloat {
          animation: toastFloat 0.32s cubic-bezier(0.22, 1, 0.36, 1);
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  return (
    ctx ?? {
      push: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
      warning: () => {},
    }
  );
}
