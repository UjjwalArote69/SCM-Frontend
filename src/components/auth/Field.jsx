import { forwardRef, useState } from "react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

/**
 * Underline-style input matching the Stitch auth designs.
 * Supports left icon slot, password show/hide, and error state.
 */
const Field = forwardRef(function Field(
  {
    id,
    label,
    type = "text",
    icon: Icon,
    error,
    className = "",
    ...rest
  },
  ref,
) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  const effectiveType = isPassword ? (revealed ? "text" : "password") : type;
  const hasError = Boolean(error);

  return (
    <div>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-text mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon
              className={`h-4 w-4 ${hasError ? "text-danger" : "text-text-muted"}`}
              strokeWidth={2}
            />
          </div>
        )}
        <input
          ref={ref}
          id={id}
          type={effectiveType}
          className={`block w-full h-[40px] py-2 text-sm text-text placeholder:text-text-subtle bg-transparent border-0 border-b-2 transition-colors focus:outline-none focus:ring-0 ${
            Icon ? "pl-10" : "pl-0"
          } ${isPassword || hasError ? "pr-10" : "pr-3"} ${
            hasError
              ? "border-danger bg-danger-soft/40"
              : "border-outline-variant focus:border-primary"
          } ${className}`}
          {...rest}
        />
        {isPassword && !hasError && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text"
            aria-label={revealed ? "Hide password" : "Show password"}
          >
            {revealed ? (
              <EyeOff className="h-4 w-4" strokeWidth={2} />
            ) : (
              <Eye className="h-4 w-4" strokeWidth={2} />
            )}
          </button>
        )}
        {hasError && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <AlertCircle className="h-4 w-4 text-danger" strokeWidth={2} />
          </div>
        )}
      </div>
      {hasError && (
        <p className="mt-1.5 text-xs text-danger font-medium">{error}</p>
      )}
    </div>
  );
});

export default Field;
