/**
 * Skeleton — placeholder block for content that's still loading.
 *
 * Composition over presets: pass `className` for sizing/shape (h-4, w-32,
 * rounded-full, etc). The base styles handle the pulse animation and
 * theme-aware background.
 *
 * <Skeleton className="h-4 w-32" />
 * <Skeleton className="h-10 w-10 rounded-full" />
 * <Skeleton className="h-32 w-full rounded-2xl" />
 */
export default function Skeleton({ className = "", style }) {
  return (
    <div
      aria-hidden="true"
      style={style}
      className={`bg-surface-container animate-pulse rounded ${className}`}
    />
  );
}
