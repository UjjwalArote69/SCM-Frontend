import { useState } from "react";

// Shared chart colour helpers — read CSS vars so they follow the theme
const PRIMARY = "var(--primary)";
const PRIMARY_SOFT = "var(--primary-soft)";
const TEXT_MUTED = "var(--text-muted)";
const BORDER = "var(--border)";

// ── Vertical bar chart ───────────────────────────────────────────────────────
/**
 * @param data  [{ label, value, secondaryValue?, sublabel? }]
 * @param formatValue  fn: number → string
 * @param height       svg height (default 220)
 */
export function BarChart({ data, formatValue = (n) => n, height = 220 }) {
  const [hover, setHover] = useState(null);
  if (!data?.length) return <EmptyChart label="No data in this range" />;

  const max = Math.max(1, ...data.map((d) => d.value));
  const padX = 20, padTop = 16, padBottom = 36;
  const barWidth = 100 / data.length;

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 1000 ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
        {/* Y axis grid */}
        {[0.25, 0.5, 0.75, 1].map((p) => (
          <line key={p} x1={padX} y1={padTop + (height - padTop - padBottom) * (1 - p)} x2={1000 - padX} y2={padTop + (height - padTop - padBottom) * (1 - p)} stroke={BORDER} strokeDasharray="2,3" strokeWidth="0.5" />
        ))}

        {data.map((d, i) => {
          const h = ((height - padTop - padBottom) * d.value) / max;
          const x = padX + (i + 0.15) * ((1000 - padX * 2) / data.length);
          const w = ((1000 - padX * 2) / data.length) * 0.7;
          const y = padTop + (height - padTop - padBottom) - h;
          const active = hover === i;
          return (
            <g key={i}
               onMouseEnter={() => setHover(i)}
               onMouseLeave={() => setHover(null)}
               className="cursor-pointer">
              <rect x={x} y={y} width={w} height={h} rx="3" fill={PRIMARY} opacity={active ? 1 : 0.85} />
              {h > 18 && (
                <text x={x + w / 2} y={y + 13} fill="white" fontSize="10" textAnchor="middle" fontWeight="600">
                  {formatValue(d.value)}
                </text>
              )}
              <text x={x + w / 2} y={height - padBottom + 14} fill={TEXT_MUTED} fontSize="10" textAnchor="middle">
                {truncate(d.label, 12)}
              </text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <Tooltip>
          <div className="font-semibold">{data[hover].label}</div>
          <div className="text-text-muted">{formatValue(data[hover].value)}</div>
          {data[hover].sublabel && <div className="text-text-muted text-[10px]">{data[hover].sublabel}</div>}
        </Tooltip>
      )}
    </div>
  );
}

// ── Multi-series line chart (for monthly trend with PR + PO + ₹) ─────────────
/**
 * @param labels      ["Jan 26", "Feb 26", …]
 * @param series      [{ name, data: number[], colour, axis: "left"|"right" }]
 * @param formatLeft  fn for left-axis values
 * @param formatRight fn for right-axis values
 */
export function MultiLineChart({ labels, series, formatLeft = (n) => n, formatRight = (n) => n, height = 240 }) {
  const [hoverX, setHoverX] = useState(null);
  if (!labels?.length || !series?.length) return <EmptyChart label="No data in this range" />;

  const padX = 50, padTop = 20, padBottom = 36;
  const innerW = 1000 - padX * 2;
  const innerH = height - padTop - padBottom;

  // Compute axis maxes per axis
  const axisMax = (axis) => Math.max(1, ...series.filter((s) => s.axis === axis).flatMap((s) => s.data));
  const leftMax = axisMax("left");
  const rightMax = axisMax("right");

  const xAt = (i) => padX + (innerW * i) / Math.max(1, labels.length - 1);
  const yAt = (val, axis) => {
    const max = axis === "right" ? rightMax : leftMax;
    return padTop + innerH - (innerH * val) / max;
  };

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 1000 ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}
           onMouseMove={(e) => {
             const rect = e.currentTarget.getBoundingClientRect();
             const x = ((e.clientX - rect.left) / rect.width) * 1000;
             const idx = Math.round(((x - padX) / innerW) * (labels.length - 1));
             if (idx >= 0 && idx < labels.length) setHoverX(idx);
           }}
           onMouseLeave={() => setHoverX(null)}>
        {/* Grid */}
        {[0.25, 0.5, 0.75, 1].map((p) => (
          <line key={p} x1={padX} y1={padTop + innerH * (1 - p)} x2={padX + innerW} y2={padTop + innerH * (1 - p)} stroke={BORDER} strokeDasharray="2,3" strokeWidth="0.5" />
        ))}

        {/* Left axis ticks */}
        {[0, 0.5, 1].map((p) => (
          <text key={p} x={padX - 8} y={padTop + innerH * (1 - p) + 4} fill={TEXT_MUTED} fontSize="10" textAnchor="end">
            {formatLeft(Math.round(leftMax * p))}
          </text>
        ))}
        {/* Right axis ticks */}
        {rightMax > 1 && [0, 0.5, 1].map((p) => (
          <text key={p} x={padX + innerW + 8} y={padTop + innerH * (1 - p) + 4} fill={TEXT_MUTED} fontSize="10" textAnchor="start">
            {formatRight(Math.round(rightMax * p))}
          </text>
        ))}

        {/* X labels */}
        {labels.map((l, i) => (
          <text key={i} x={xAt(i)} y={height - padBottom + 14} fill={TEXT_MUTED} fontSize="10" textAnchor="middle">
            {l}
          </text>
        ))}

        {/* Series */}
        {series.map((s, si) => {
          const points = s.data.map((v, i) => `${xAt(i)},${yAt(v, s.axis)}`).join(" ");
          return (
            <g key={si}>
              <polyline points={points} fill="none" stroke={s.colour} strokeWidth="2" />
              {s.data.map((v, i) => (
                <circle key={i} cx={xAt(i)} cy={yAt(v, s.axis)} r={hoverX === i ? 4 : 2.5} fill={s.colour} />
              ))}
            </g>
          );
        })}

        {/* Hover line */}
        {hoverX !== null && (
          <line x1={xAt(hoverX)} y1={padTop} x2={xAt(hoverX)} y2={padTop + innerH} stroke={TEXT_MUTED} strokeDasharray="3,3" strokeWidth="0.5" />
        )}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap mt-2 text-xs">
        {series.map((s) => (
          <div key={s.name} className="flex items-center gap-1.5">
            <span className="w-3 h-0.5" style={{ background: s.colour }} />
            <span className="text-text-muted">{s.name}</span>
          </div>
        ))}
      </div>

      {hoverX !== null && (
        <Tooltip>
          <div className="font-semibold mb-1">{labels[hoverX]}</div>
          {series.map((s) => (
            <div key={s.name} className="flex items-center gap-2 text-text-muted">
              <span className="w-2 h-2 rounded-full" style={{ background: s.colour }} />
              {s.name}: <span className="text-text font-medium">{(s.axis === "right" ? formatRight : formatLeft)(s.data[hoverX])}</span>
            </div>
          ))}
        </Tooltip>
      )}
    </div>
  );
}

// ── Funnel chart (horizontal stages with shrinking width) ────────────────────
/**
 * @param stages [{ key, label, count, pct_of_top }]
 */
export function FunnelChart({ stages }) {
  if (!stages?.length) return <EmptyChart label="No data" />;
  const top = Math.max(1, ...stages.map((s) => s.count));

  return (
    <div className="space-y-2">
      {stages.map((s, i) => {
        const w = (s.count / top) * 100;
        const dropoff = i > 0 ? Math.round((s.count / Math.max(1, stages[i - 1].count)) * 100) : 100;
        return (
          <div key={s.key} className="group">
            <div className="flex items-center justify-between text-xs text-text-muted mb-1">
              <span className="font-semibold text-text">{s.label}</span>
              <span>
                {s.count.toLocaleString("en-IN")}
                {i > 0 && <span className={`ml-2 ${dropoff < 60 ? "text-warning" : "text-text-subtle"}`}>{dropoff}%</span>}
              </span>
            </div>
            <div className="h-8 rounded bg-surface-container-low overflow-hidden">
              <div className="h-full bg-primary group-hover:brightness-110 transition" style={{ width: `${Math.max(2, w)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Stacked horizontal bar (used for vendor accept/reject ratio) ─────────────
export function StackedBar({ segments, height = 8 }) {
  const total = Math.max(1, segments.reduce((a, s) => a + s.value, 0));
  return (
    <div className="flex w-full rounded-full overflow-hidden" style={{ height }}>
      {segments.map((s, i) => (
        <div key={i} title={`${s.label}: ${s.value}`} className="h-full" style={{ width: `${(s.value / total) * 100}%`, background: s.colour }} />
      ))}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function Tooltip({ children }) {
  return (
    <div className="absolute top-2 right-2 bg-surface-container-lowest border border-border rounded-md px-3 py-2 text-xs shadow-lg pointer-events-none">
      {children}
    </div>
  );
}

function EmptyChart({ label }) {
  return (
    <div className="h-40 flex items-center justify-center text-text-muted text-sm border border-dashed border-border rounded-md">
      {label}
    </div>
  );
}

function truncate(s, n) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export { PRIMARY, PRIMARY_SOFT };
