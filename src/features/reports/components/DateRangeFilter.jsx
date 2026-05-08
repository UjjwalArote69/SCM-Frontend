import { Calendar, RefreshCw } from "lucide-react";

const PRESETS = [
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 6 months", days: 180 },
  { label: "Last 12 months", days: 365 },
  { label: "Year to date", ytd: true },
];

const iso = (d) => d.toISOString().slice(0, 10);

export default function DateRangeFilter({ from, to, onChange, onRefresh, refreshing }) {
  const apply = (preset) => {
    const today = new Date();
    if (preset.ytd) {
      onChange({ from: `${today.getFullYear()}-01-01`, to: iso(today) });
    } else {
      const f = new Date();
      f.setDate(f.getDate() - preset.days + 1);
      onChange({ from: iso(f), to: iso(today) });
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-surface-container-lowest border border-border rounded-lg p-3">
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Calendar className="h-4 w-4" />
        <span className="font-semibold">Range</span>
      </div>
      <div className="flex items-center gap-2">
        <input type="date" value={from} max={to} onChange={(e) => onChange({ from: e.target.value, to })}
               className="bg-surface-container-low border border-border rounded px-2 py-1 text-sm" />
        <span className="text-text-subtle">→</span>
        <input type="date" value={to} min={from} onChange={(e) => onChange({ from, to: e.target.value })}
               className="bg-surface-container-low border border-border rounded px-2 py-1 text-sm" />
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {PRESETS.map((p) => (
          <button key={p.label} onClick={() => apply(p)}
                  className="text-xs px-2.5 py-1 rounded-full border border-border text-text-muted hover:text-primary hover:border-primary">
            {p.label}
          </button>
        ))}
      </div>
      <button onClick={onRefresh} disabled={refreshing}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-border rounded-md hover:bg-surface-container-low disabled:opacity-50">
        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
        Refresh
      </button>
    </div>
  );
}
