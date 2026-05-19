import { useState } from "react";
import { RefreshCw } from "lucide-react";

/**
 * Reusable refresh button for list pages.
 *
 * Props:
 *   onRefresh: async () => void  — invoked on click (awaited so the spinner
 *              keeps going until the fetch resolves)
 *   loading:   boolean           — optional external loading signal
 *                                  (from Zustand store's `loading` flag)
 *   label:     string            — button text (default: "Refresh")
 *   compact:   boolean           — hides the text, icon-only (for tight rows)
 */
export default function RefreshButton({
  onRefresh,
  loading = false,
  label = "Refresh",
  compact = false,
  className = "",
}) {
  const [busy, setBusy] = useState(false);
  const spinning = busy || loading;

  const handleClick = async () => {
    if (spinning) return;
    setBusy(true);
    try {
      // Always pass `true` so cache-aware stores bypass their TTL skip and
      // actually re-hit the API. Non-cached stores ignore the extra arg.
      await onRefresh?.(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={spinning}
      title={label}
      aria-label={label}
      className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-text rounded-md border border-border bg-surface-container-lowest hover:bg-surface-container-low disabled:opacity-60 transition-colors ${className}`}
    >
      <RefreshCw
        className={`h-4 w-4 ${spinning ? "animate-spin text-primary" : "text-text-muted"}`}
        strokeWidth={2}
      />
      {!compact && <span>{spinning ? "Refreshing…" : label}</span>}
    </button>
  );
}
