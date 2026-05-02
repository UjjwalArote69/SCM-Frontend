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
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => {
          const { bg, icon: Icon } = TONE[t.tone] ?? TONE.success;
          return (
            <div
              key={t.id}
              role="status"
              aria-live="polite"
              className={`flex items-center gap-3 px-4 py-3 rounded-md shadow-lg text-white ${bg} pointer-events-auto animate-[slideUp_0.25s_ease-out]`}
              style={{ animation: "slideUp 0.25s ease-out" }}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={2.25} />
              <span className="text-sm font-medium">{t.message}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="ml-3 opacity-80 hover:opacity-100"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(16px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
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
