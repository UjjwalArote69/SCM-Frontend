import { Link } from "react-router-dom";

/**
 * Standardised empty-state for list pages. Pass an icon, headline, supporting
 * text, and an optional CTA (`{ to, label }`).
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}) {
  return (
    <div
      className={`bg-surface-container-low rounded-2xl py-16 px-6 text-center border border-dashed border-border ${className}`}
    >
      {Icon && (
        <Icon
          className="h-12 w-12 mx-auto mb-4 text-text-subtle"
          strokeWidth={1.5}
        />
      )}
      <h2 className="text-lg font-semibold text-text mb-1">{title}</h2>
      {description && (
        <p className="text-sm text-text-muted max-w-md mx-auto">{description}</p>
      )}
      {action && (
        <div className="mt-5">
          {action.to ? (
            <Link
              to={action.to}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-bold rounded-md"
            >
              {action.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-bold rounded-md"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
