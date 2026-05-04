import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Layers,
  Package,
  ReceiptText,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { usePRStore } from "../../purchase-requests/store.js";
import { usePOStore } from "../../purchase-orders/store.js";
import { useRFQStore } from "../../quotations/store.js";
import { useGRNStore } from "../../grn/store.js";
import { useAuthStore } from "../../auth/store.js";

const APPROVER_ROLES = new Set(["admin", "hod", "cfo", "ceo"]);

/* ═════════════════════════════════════════════════════════════════
   Format helpers
   ═════════════════════════════════════════════════════════════════ */

const fmtINR = (n) =>
  "₹" +
  Math.abs(Math.round(n)).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  });

const fmtCompact = (n) => {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)}L`;
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(1)}K`;
  return `${sign}₹${abs}`;
};

const fmtDate = (d) =>
  `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;

/* Smooth Bezier path between points — gives the chart its silky curves
   instead of zig-zag polyline kinks. */
function smoothPath(points) {
  if (points.length < 2) return "";
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [px, py] = points[i - 1];
    const [cx, cy] = points[i];
    const mx = (px + cx) / 2;
    d += ` C ${mx} ${py}, ${mx} ${cy}, ${cx} ${cy}`;
  }
  return d;
}

/* ═════════════════════════════════════════════════════════════════
   Shared atoms
   ═════════════════════════════════════════════════════════════════ */

function Eyebrow({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-1.5 text-text-muted">
      {Icon && <Icon className="h-3 w-3" strokeWidth={2} />}
      <span className="text-[10px] font-semibold tracking-[0.22em] uppercase">
        {label}
      </span>
    </div>
  );
}

function ToolbarBtn({ children, onClick, title, ariaLabel, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={ariaLabel ?? title}
      className={`inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full border transition-colors text-[11px] font-semibold tabular-nums ${
        active
          ? "border-primary/40 bg-primary-soft text-primary"
          : "border-border bg-surface-container-low/60 text-text-muted hover:text-text hover:border-white/20"
      }`}
    >
      {children}
    </button>
  );
}

/* Real dropdown — fixed-width trigger + portal-rendered menu.
   The trigger pill width is FIXED via the `width` prop and the trigger only
   shows a SHORT label so picking a different option never resizes the
   trigger. The menu is rendered via createPortal into <body> so it cannot
   affect any parent flex layout, and we use a document-level mousedown
   listener for click-outside (no fixed-position overlay anywhere in the
   tree, which was the source of the previous layout-shift bug). */
function ToolbarDropdown({ value, options, onChange, label, width = 76 }) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const current = options.find((o) => o.value === value);

  // Position the portal menu directly below the trigger.
  // Anchor to whichever side is closer to the viewport edge so the menu
  // doesn't overflow off-screen.
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceRight = window.innerWidth - rect.right;
    const fromRight = spaceRight < rect.left;
    setMenuPos({
      top: rect.bottom + 4,
      ...(fromRight
        ? { right: spaceRight }
        : { left: rect.left }),
    });
  }, [open]);

  // Click-outside via document mousedown.
  useEffect(() => {
    if (!open) return;
    const onDocDown = (e) => {
      if (
        triggerRef.current?.contains(e.target) ||
        menuRef.current?.contains(e.target)
      ) {
        return;
      }
      setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDocDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  return (
    <div className="inline-block" style={{ width }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        className={`w-full inline-flex items-center justify-center gap-1 h-8 px-3 rounded-full border transition-colors text-[11px] font-semibold tabular-nums ${
          open
            ? "border-primary/40 bg-primary-soft text-primary"
            : "border-border bg-surface-container-low/60 text-text-muted hover:text-text hover:border-white/20"
        }`}
      >
        <span className="truncate">
          {current?.short ?? current?.label ?? value}
        </span>
        <ChevronDown
          className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open &&
        menuPos &&
        createPortal(
          <div
            ref={menuRef}
            className="rounded-xl py-1 border border-border shadow-2xl"
            style={{
              position: "fixed",
              top: menuPos.top,
              ...(menuPos.right !== undefined
                ? { right: menuPos.right }
                : { left: menuPos.left }),
              zIndex: 1000,
              width: 180,
              backgroundColor: "var(--color-surface)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          >
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-[12px] font-medium transition-colors ${
                  o.value === value
                    ? "text-primary bg-primary-soft"
                    : "text-text-muted hover:text-text hover:bg-surface-container-low"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}

function FilterPills({ tabs, active, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {tabs.map((t) => {
        const on = t === active;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className={`inline-flex items-center justify-center h-7 px-3.5 rounded-full text-[11px] font-semibold transition-colors whitespace-nowrap ${
              on
                ? "bg-surface-container border border-white/10 text-text"
                : "text-text-muted hover:text-text"
            }`}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

function ChangePill({ pct }) {
  const positive = pct >= 0;
  const Arrow = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-bold rounded-full px-2 py-0.5 tabular-nums shrink-0 ${
        positive
          ? "bg-success-soft text-success"
          : "bg-danger-soft text-danger"
      }`}
    >
      <Arrow className="h-3 w-3" strokeWidth={2.75} />
      {positive ? "+" : ""}
      {pct.toFixed(1)}%
    </span>
  );
}

/* ═════════════════════════════════════════════════════════════════
   Sparkline — single line, dotted center reference, halo'd endpoint
   ═════════════════════════════════════════════════════════════════ */
function Sparkline({ values, tone = "success", height = 80 }) {
  const reactId = useId();
  const w = 280;
  const h = height;

  if (!values || values.length < 2) {
    return <div className="opacity-40" style={{ height: h }} />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  const padY = 8;

  const points = values.map((v, i) => [
    i * step,
    h - padY - ((v - min) / range) * (h - padY * 2),
  ]);

  const stroke = {
    success: "#22c55e",
    danger: "#f87171",
    info: "#60a5fa",
    primary: "#ff5d3a",
  }[tone] ?? "#22c55e";

  const linePath = smoothPath(points);
  const fillPath = `${linePath} L ${w} ${h} L 0 ${h} Z`;

  const [lastX, lastY] = points[points.length - 1];
  const gradId = `spark-${reactId.replace(/:/g, "")}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="w-full block"
      style={{ height: h }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* dotted center reference */}
      <line
        x1="0"
        x2={w}
        y1={h / 2}
        y2={h / 2}
        stroke="white"
        strokeOpacity="0.10"
        strokeWidth="1"
        strokeDasharray="2 5"
        vectorEffect="non-scaling-stroke"
      />
      {/* fill */}
      <path d={fillPath} fill={`url(#${gradId})`} stroke="none" />
      {/* line */}
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {/* peak highlight (max point) */}
      {(() => {
        let peakIdx = 0;
        for (let i = 1; i < values.length - 1; i++) {
          if (values[i] >= values[peakIdx]) peakIdx = i;
        }
        if (peakIdx === 0 || peakIdx === values.length - 1) return null;
        const [px, py] = points[peakIdx];
        return (
          <g>
            <circle cx={px} cy={py} r="6" fill={stroke} fillOpacity="0.20" />
            <circle cx={px} cy={py} r="2.5" fill={stroke} />
            <circle cx={px} cy={py} r="1" fill="white" />
          </g>
        );
      })()}
      {/* halo'd endpoint */}
      <circle cx={lastX} cy={lastY} r="8" fill={stroke} fillOpacity="0.20" />
      <circle cx={lastX} cy={lastY} r="3.5" fill={stroke} />
      <circle cx={lastX} cy={lastY} r="1.5" fill="white" />
    </svg>
  );
}

/* ═════════════════════════════════════════════════════════════════
   RainbowGauge — 180° semi-circle, multi-segment, white tick marker
   The arc opens DOWN (dome at top); segments are sized by `value`.
   ═════════════════════════════════════════════════════════════════ */
function RainbowGauge({ slices, tickAt }) {
  const W = 280;
  const H = 160;
  const cx = W / 2;
  const cy = H - 18;
  const r = 96;
  const stroke = 28;

  const total = slices.reduce((s, sl) => s + (sl.value || 0), 0) || 1;

  // half-circle goes from 180° (left) to 360°/0° (right) along the TOP half
  // (i.e. y decreases). We'll express angles in degrees where 180 = left, 360 = right.
  const segments = [];
  let cursor = 180;
  slices.forEach((sl) => {
    const sweep = (sl.value / total) * 180;
    segments.push({ ...sl, start: cursor, end: cursor + sweep });
    cursor += sweep;
  });

  const polar = (deg) => {
    const rad = (deg * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };

  // Find the angle at proportion `tickAt` along the whole arc (0..1).
  const tickAngle = 180 + Math.min(1, Math.max(0, tickAt)) * 180;
  const [tx, ty] = polar(tickAngle);
  const tickRotation = tickAngle - 90; // tangent

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block">
      {/* base track — keeps the dome readable when slices are sparse */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth={stroke}
        strokeLinecap="butt"
      />
      {/* segments */}
      {segments.map((seg, i) => {
        const [x1, y1] = polar(seg.start);
        const [x2, y2] = polar(seg.end);
        const sweep = seg.end - seg.start;
        const large = sweep > 180 ? 1 : 0;
        return (
          <path
            key={i}
            d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeLinecap="butt"
          />
        );
      })}
      {/* white indicator tick */}
      <g transform={`rotate(${tickRotation} ${tx} ${ty})`}>
        <rect
          x={tx - 6}
          y={ty - 18}
          width="12"
          height="36"
          rx="3"
          fill="white"
          opacity="0.96"
        />
        <rect
          x={tx - 5}
          y={ty - 17}
          width="10"
          height="34"
          rx="2"
          fill="rgba(0,0,0,0.06)"
          opacity="0.5"
        />
      </g>
    </svg>
  );
}

/* ═════════════════════════════════════════════════════════════════
   MultiLineChart — dashed grid, smooth curves, axis labels
   ═════════════════════════════════════════════════════════════════ */
function MultiLineChart({ series, xLabels, height = 240 }) {
  const W = 720;
  const H = height;
  const padL = 32;
  const padR = 12;
  const padT = 12;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const allValues = series.flatMap((s) => s.values);
  const maxRaw = Math.max(40, ...allValues);
  // round max up to nearest 10
  const max = Math.ceil(maxRaw / 10) * 10;
  const min = 0;

  const xAt = (i) =>
    padL + (i / Math.max(1, xLabels.length - 1)) * innerW;
  const yAt = (v) =>
    padT + innerH - ((v - min) / (max - min || 1)) * innerH;

  const yTicks = [0, max * 0.25, max * 0.5, max * 0.75, max].map((v) =>
    Math.round(v),
  );

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full block"
    >
      {/* y gridlines + labels */}
      {yTicks.map((v) => (
        <g key={v}>
          <line
            x1={padL}
            x2={W - padR}
            y1={yAt(v)}
            y2={yAt(v)}
            stroke="white"
            strokeOpacity="0.06"
            strokeWidth="1"
            strokeDasharray="2 6"
          />
          <text
            x={padL - 10}
            y={yAt(v) + 3}
            textAnchor="end"
            fill="rgba(255,255,255,0.32)"
            fontSize="10"
            fontWeight="600"
          >
            {v}
          </text>
        </g>
      ))}
      {/* x labels */}
      {xLabels.map((label, i) => (
        <text
          key={i}
          x={xAt(i)}
          y={H - 8}
          textAnchor="middle"
          fill="rgba(255,255,255,0.32)"
          fontSize="10"
          fontWeight="500"
        >
          {label}
        </text>
      ))}
      {/* lines (back-to-front: lower-priority on bottom for cleaner overlap) */}
      {series.map((s) => {
        const pts = s.values.map((v, i) => [xAt(i), yAt(v)]);
        return (
          <path
            key={s.label}
            d={smoothPath(pts)}
            fill="none"
            stroke={s.color}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={s.dim ? 0.35 : 0.95}
          />
        );
      })}
    </svg>
  );
}

/* ═════════════════════════════════════════════════════════════════
   HERO CARD: token-style stat (BTC/ETH equivalent)
   ═════════════════════════════════════════════════════════════════ */
function TokenStatCard({
  to,
  iconBg,
  iconLetter,
  iconChar,
  eyebrow,
  name,
  value,
  subValue,
  changePct,
  delta,
  spark,
  delay = 0,
}) {
  const positive = changePct >= 0;
  return (
    <Link
      to={to}
      style={{ animationDelay: `${delay}ms` }}
      className="glass-card rounded-2xl p-6 flex flex-col fade-up hover:shadow-lg transition-all"
    >
      {/* top row — icon+name on left, change pill in top-right corner */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: iconBg, color: "#1a1a22" }}
          >
            {iconChar ?? iconLetter}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium tracking-[0.04em] text-text-muted uppercase">
              {eyebrow}
            </div>
            <div className="text-[15px] font-semibold text-text leading-tight mt-0.5 whitespace-nowrap">
              {name}
            </div>
          </div>
        </div>
        <ChangePill pct={changePct} />
      </div>

      {/* value + sub-value */}
      <div className="mt-6">
        <div className="text-[24px] font-bold text-text leading-tight tabular-nums tracking-tight truncate">
          {value}
        </div>
        {subValue && (
          <div className="text-[13px] text-text-muted mt-1 truncate">
            {subValue}
          </div>
        )}
      </div>

      {/* delta + sparkline — directly below sub-value, no flex-spacer */}
      <div className="mt-5 -mx-1">
        <div
          className="text-[12px] font-medium tabular-nums px-1 mb-1 text-right"
          style={{ color: positive ? "#22c55e" : "#f87171" }}
        >
          {delta}
        </div>
        <Sparkline values={spark} tone={positive ? "success" : "danger"} />
      </div>
    </Link>
  );
}

/* ═════════════════════════════════════════════════════════════════
   HERO CARD: Spend balance + rainbow gauge (centerpiece)
   ═════════════════════════════════════════════════════════════════ */
function SpendBalanceCard({ total, deltaAmt, deltaPct, slices, tickAt, betterPct, delay = 0 }) {
  const positive = deltaAmt >= 0;
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className="glass-card rounded-2xl p-6 flex flex-col fade-up"
    >
      <div className="text-[28px] font-bold text-text leading-tight tabular-nums tracking-tight">
        {fmtINR(total)}
      </div>
      <div className="mt-2 inline-flex items-center gap-2 text-[13px]">
        <span
          className={`inline-flex items-center justify-center h-5 w-5 rounded-full ${
            positive ? "bg-primary text-white" : "bg-danger text-white"
          }`}
        >
          {positive ? (
            <ArrowUpRight className="h-3 w-3" strokeWidth={3} />
          ) : (
            <ArrowDownRight className="h-3 w-3" strokeWidth={3} />
          )}
        </span>
        <span
          className="font-semibold tabular-nums"
          style={{ color: positive ? "#ff5d3a" : "#f87171" }}
        >
          {positive ? "+" : "-"}
          {fmtINR(Math.abs(deltaAmt))}
        </span>
        <span className="text-text-muted tabular-nums">
          ({deltaPct.toFixed(2)})
        </span>
      </div>

      {/* gauge fills the rest of the card */}
      <div className="relative flex-1 flex items-end mt-2">
        <RainbowGauge slices={slices} tickAt={tickAt} />
        <div className="absolute inset-x-0 bottom-2 text-center text-[12px] text-text-muted leading-snug pointer-events-none">
          {betterPct >= 0 ? "+" : ""}
          {betterPct.toFixed(2)}% More than
          <br />
          last week
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════
   LOWER CARD: Trend chart (Profile Chart equivalent)
   ═════════════════════════════════════════════════════════════════ */
function TrendChartCard({ series, xLabels, totals, delay = 0 }) {
  const tabs = ["All", "Approved", "Pending", "Rejected", "Awarded"];
  const [tab, setTab] = useState("All");

  const visible = series.map((s) =>
    tab === "All" ? s : { ...s, dim: s.label !== tab },
  );

  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className="glass-card rounded-2xl p-6 flex flex-col fade-up"
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[16px] font-semibold text-text">Procurement Trend</h3>
        <Link
          to="/app/purchase-requests"
          className="text-[12px] text-text-muted hover:text-primary"
        >
          See all
        </Link>
      </div>

      <FilterPills tabs={tabs} active={tab} onChange={setTab} />

      <div className="flex-1 min-h-[260px] mt-5">
        <MultiLineChart series={visible} xLabels={xLabels} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {totals.map((t) => (
          <span
            key={t.label}
            className="inline-flex items-center gap-2 text-[12px] bg-surface-container-low/50 border border-white/5 rounded-full pl-2.5 pr-3.5 py-1.5 tabular-nums"
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: t.color }}
            />
            <span className="text-text-muted">{t.label}</span>
            <span className="text-text font-semibold">{t.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════
   LOWER CARD: Top vendors (Top Token equivalent)
   ═════════════════════════════════════════════════════════════════ */
function TopVendorsCard({ vendors, delay = 0 }) {
  const tabs = ["By spend", "By orders", "By recency"];
  const [tab, setTab] = useState("By spend");

  const sorted = useMemo(() => {
    const copy = [...vendors];
    if (tab === "By spend") copy.sort((a, b) => b.amount - a.amount);
    if (tab === "By orders") copy.sort((a, b) => b.orders - a.orders);
    if (tab === "By recency") copy.sort((a, b) => b.lastTs - a.lastTs);
    return copy;
  }, [vendors, tab]);

  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className="glass-card rounded-2xl p-6 flex flex-col fade-up"
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[16px] font-semibold text-text">Top Vendors</h3>
        <Link
          to="/admin/vendors"
          className="text-[12px] text-text-muted hover:text-primary"
        >
          See all
        </Link>
      </div>

      <FilterPills tabs={tabs} active={tab} onChange={setTab} />

      <div className="mt-5 flex flex-col gap-1">
        {sorted.length === 0 && (
          <div className="text-[12px] text-text-muted py-8 text-center">
            No vendor activity yet.
          </div>
        )}
        {sorted.slice(0, 6).map((v) => (
          <Link
            key={v.name}
            to={`/admin/vendors?search=${encodeURIComponent(v.name)}`}
            className="flex items-center gap-3 px-1 py-3 rounded-xl hover:bg-white/[0.02] transition-colors group"
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0"
              style={{ background: v.color, color: "#1a1a22" }}
            >
              {v.initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-text truncate">
                {v.name}
              </div>
              <div className="text-[11px] text-text-muted tabular-nums mt-0.5">
                {v.share.toFixed(0)}%
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[15px] font-semibold text-text tabular-nums leading-tight">
                {v.orders}
              </div>
              <div className="text-[11px] text-text-muted tabular-nums">
                {fmtCompact(v.amount)}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-text-subtle ml-1 opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════
   Pipeline Strip — 4 stages PR → RFQ → PO → GRN with counts + alerts
   ═════════════════════════════════════════════════════════════════ */
function PipelineStrip({ prs, rfqs, pos, grns, delay = 0 }) {
  const stages = [
    {
      label: "Requests",
      Icon: ClipboardList,
      iconBg: "linear-gradient(135deg, #fbbf24, #f59e0b)",
      total: prs.length,
      pending: prs.filter((p) => p.status === "pending").length,
      pendingLabel: "pending",
      to: "/app/purchase-requests",
    },
    {
      label: "Quotations",
      Icon: FileSpreadsheet,
      iconBg: "linear-gradient(135deg, #a78bfa, #8b5cf6)",
      total: rfqs.length,
      pending: rfqs.filter(
        (r) => r.status === "open" || r.status === "compared",
      ).length,
      pendingLabel: "open",
      to: "/app/quotations",
    },
    {
      label: "Orders",
      Icon: ReceiptText,
      iconBg: "linear-gradient(135deg, #60a5fa, #3b82f6)",
      total: pos.length,
      pending: pos.filter(
        (p) => p.status === "pending" || p.status === "accepted",
      ).length,
      pendingLabel: "active",
      to: "/app/purchase-orders",
    },
    {
      label: "Receipts",
      Icon: Package,
      iconBg: "linear-gradient(135deg, #34d399, #10b981)",
      total: grns.length,
      pending: grns.filter((g) => g.status === "partial").length,
      pendingLabel: "partial",
      to: "/app/grn",
    },
  ];

  return (
    <div
      className="glass-card rounded-2xl p-2 fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {stages.map((s) => (
          <Link
            key={s.label}
            to={s.to}
            className="group flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.04] transition-colors"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: s.iconBg, color: "#1a1a22" }}
            >
              <s.Icon className="h-4 w-4" strokeWidth={2.25} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-[20px] font-bold text-text tabular-nums leading-none">
                  {s.total}
                </span>
                <span className="text-[12px] text-text-muted font-medium truncate">
                  {s.label}
                </span>
              </div>
              <div className="text-[11px] mt-1 tabular-nums">
                {s.pending > 0 ? (
                  <span className="text-primary font-semibold">
                    {s.pending} {s.pendingLabel}
                  </span>
                ) : (
                  <span className="text-text-subtle">All clear</span>
                )}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-text-subtle opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════
   Recent Activity — chronological feed of PR/RFQ/PO/GRN events
   ═════════════════════════════════════════════════════════════════ */
const ACTIVITY_KIND = {
  success: { Icon: CheckCircle2, bg: "bg-success-soft", iconColor: "text-success" },
  warning: { Icon: Clock, bg: "bg-warning-soft", iconColor: "text-warning" },
  danger: { Icon: XCircle, bg: "bg-danger-soft", iconColor: "text-danger" },
  info: { Icon: AlertCircle, bg: "bg-info-soft", iconColor: "text-info" },
};

const TYPE_PILL = {
  PR: "bg-warning-soft text-warning",
  RFQ: "bg-primary-soft text-primary",
  PO: "bg-info-soft text-info",
  GRN: "bg-success-soft text-success",
};

function timeAgo(iso, nowMs) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  const diff = Math.max(0, nowMs - t);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function ActivityCard({ items, delay = 0 }) {
  return (
    <div
      className="glass-card rounded-2xl p-6 flex flex-col fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[16px] font-semibold text-text">Recent Activity</h3>
        <span className="text-[11px] text-text-muted tabular-nums">
          {items.length} events
        </span>
      </div>
      <div className="flex flex-col gap-1">
        {items.length === 0 && (
          <div className="text-[12px] text-text-muted py-10 text-center">
            No recent activity yet.
          </div>
        )}
        {items.map((ev) => {
          const style = ACTIVITY_KIND[ev.kind] ?? ACTIVITY_KIND.info;
          const { Icon } = style;
          return (
            <Link
              key={ev.key}
              to={ev.to ?? "#"}
              className="flex items-start gap-3 px-2 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors group"
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${style.bg}`}
              >
                <Icon className={`h-4 w-4 ${style.iconColor}`} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${TYPE_PILL[ev.docType] ?? "bg-surface-container text-text-muted"}`}
                  >
                    {ev.docType}
                  </span>
                  <span className="text-[13px] text-text font-medium truncate">
                    {ev.text}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] font-mono text-text-muted">
                    {ev.ref}
                  </span>
                  <span className="text-[11px] text-text-subtle">·</span>
                  <span className="text-[11px] text-text-subtle">{ev.ago}</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-text-subtle opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════
   Approvals Queue — PRs/POs awaiting current user's action
   ═════════════════════════════════════════════════════════════════ */
function ApprovalsCard({ approvals, role, delay = 0 }) {
  return (
    <div
      className="glass-card rounded-2xl p-6 flex flex-col fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[16px] font-semibold text-text">My Approvals</h3>
        <span
          className={`text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-full ${
            approvals.length > 0
              ? "bg-primary text-primary-foreground"
              : "bg-surface-container-low text-text-muted"
          }`}
        >
          {approvals.length}
        </span>
      </div>

      {approvals.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-10 text-center">
          <div>
            <CheckCircle2 className="h-7 w-7 text-success mx-auto mb-2 opacity-60" />
            <p className="text-[12px] text-text-muted">
              {APPROVER_ROLES.has(role)
                ? "Nothing needs your attention right now."
                : "Approval queues are scoped to HOD / CFO / CEO."}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {approvals.slice(0, 5).map((a) => (
            <Link
              key={a.id}
              to={a.to}
              className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors group"
            >
              <div className="w-9 h-9 rounded-xl bg-warning-soft text-warning flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-mono font-semibold text-text truncate">
                  {a.id}
                </div>
                <div className="text-[11px] text-text-muted truncate mt-0.5">
                  {a.meta}
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary px-2.5 py-1 rounded-full border border-primary/30 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors shrink-0">
                Review
              </span>
            </Link>
          ))}
          {approvals.length > 5 && (
            <Link
              to="/app/purchase-requests"
              className="text-[11px] text-text-muted hover:text-primary text-center py-2"
            >
              View all {approvals.length} →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════
   PAGE
   ═════════════════════════════════════════════════════════════════ */

const VENDOR_PALETTE = [
  "linear-gradient(135deg, #60a5fa, #3b82f6)",
  "linear-gradient(135deg, #fbbf24, #f59e0b)",
  "linear-gradient(135deg, #34d399, #10b981)",
  "linear-gradient(135deg, #a78bfa, #8b5cf6)",
  "linear-gradient(135deg, #fb923c, #ea580c)",
  "linear-gradient(135deg, #f472b6, #ec4899)",
];

export default function HomeView() {
  const user = useAuthStore((s) => s.user);
  const prs = usePRStore((s) => s.items);
  const prLoading = usePRStore((s) => s.loading);
  const fetchPRs = usePRStore((s) => s.fetchAll);
  const pos = usePOStore((s) => s.items);
  const fetchPOs = usePOStore((s) => s.fetchAll);
  const rfqs = useRFQStore((s) => s.items);
  const fetchRFQs = useRFQStore((s) => s.fetchAll);
  const grns = useGRNStore((s) => s.items);
  const fetchGRNs = useGRNStore((s) => s.fetchAll);

  const [hidden, setHidden] = useState(false);
  const [range, setRange] = useState(7); // 7 / 14 / 30 days
  const [vendorFilter, setVendorFilter] = useState("all"); // all / top5 / active
  const [refreshing, setRefreshing] = useState(false);
  // Capture "now" once on mount so memoized derivations stay pure across re-renders.
  const [nowMs] = useState(() => Date.now());

  useEffect(() => {
    fetchPRs();
    fetchPOs();
    fetchRFQs();
    fetchGRNs();
  }, [fetchPRs, fetchPOs, fetchRFQs, fetchGRNs]);

  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([fetchPRs(), fetchPOs(), fetchRFQs(), fetchGRNs()]);
    setRefreshing(false);
  };

  /* ── PR card ── */
  const prCard = useMemo(() => {
    const days = range * 2; // sparkline shows 2× the active range so we can compare halves
    const half = range;
    const buckets = Array.from({ length: days }, (_, i) => {
      const d = new Date(nowMs);
      d.setDate(d.getDate() - (days - 1 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });
    const spark = buckets.map(
      (d) =>
        prs.filter((p) => {
          if (!p.created_at) return false;
          const t = new Date(p.created_at);
          return (
            t.getFullYear() === d.getFullYear() &&
            t.getMonth() === d.getMonth() &&
            t.getDate() === d.getDate()
          );
        }).length,
    );
    const recent = spark.slice(-half).reduce((a, b) => a + b, 0);
    const prior = spark.slice(0, half).reduce((a, b) => a + b, 0);
    const change =
      prior === 0 ? (recent === 0 ? 0 : 100) : ((recent - prior) / prior) * 100;
    const approved = prs.filter((p) => p.status === "approved").length;
    const pending = prs.filter((p) => p.status === "pending").length;
    const rangeLabel =
      range === 7 ? "this week" : range === 14 ? "last 2w" : `last ${range}d`;
    return {
      iconBg: "linear-gradient(135deg, #fbbf24, #f59e0b)",
      iconChar: "P",
      eyebrow: "PR",
      name: "Requests",
      value: hidden ? "•••" : String(prs.length),
      subValue: hidden ? "•••" : `${approved} approved · ${pending} pending`,
      changePct: change,
      delta: `${recent >= 0 ? "+" : ""}${recent} ${rangeLabel}`,
      spark: spark.length >= 2 ? spark : [0, 1],
      to: "/app/purchase-requests",
    };
  }, [prs, hidden, nowMs, range]);

  /* ── PO card ── */
  const poCard = useMemo(() => {
    const days = range * 2;
    const half = range;
    const buckets = Array.from({ length: days }, (_, i) => {
      const d = new Date(nowMs);
      d.setDate(d.getDate() - (days - 1 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });
    const spark = buckets.map((d) =>
      pos
        .filter((p) => {
          if (!p.created_at) return false;
          const t = new Date(p.created_at);
          return (
            t.getFullYear() === d.getFullYear() &&
            t.getMonth() === d.getMonth() &&
            t.getDate() === d.getDate()
          );
        })
        .reduce((s, p) => s + (Number(p.total) || 0), 0),
    );
    const recent = spark.slice(-half).reduce((a, b) => a + b, 0);
    const prior = spark.slice(0, half).reduce((a, b) => a + b, 0);
    const change =
      prior === 0 ? (recent === 0 ? 0 : 100) : ((recent - prior) / prior) * 100;
    const totalSpend = pos
      .filter((p) => p.status !== "rejected")
      .reduce((s, p) => s + (Number(p.total) || 0), 0);
    const rangeLabel =
      range === 7 ? "this week" : range === 14 ? "last 2w" : `last ${range}d`;
    return {
      iconBg: "linear-gradient(135deg, #60a5fa, #3b82f6)",
      iconChar: "O",
      eyebrow: "PO",
      name: "Orders",
      value: hidden ? "•••" : String(pos.length),
      subValue: hidden ? "•••" : `${fmtCompact(totalSpend)} spent`,
      changePct: change,
      delta: hidden
        ? "•••"
        : `${recent >= 0 ? "+" : ""}${fmtCompact(recent)} ${rangeLabel}`,
      spark: spark.length >= 2 ? spark : [0, 1],
      to: "/app/purchase-orders",
    };
  }, [pos, hidden, nowMs, range]);

  /* ── Spend balance + gauge ── */
  const balance = useMemo(() => {
    const total = pos
      .filter((p) => p.status !== "rejected")
      .reduce((s, p) => s + (Number(p.total) || 0), 0);
    const recent = pos
      .filter((p) => {
        const t = new Date(p.updated_at ?? p.created_at ?? 0).getTime();
        return nowMs - t < 7 * 86400000;
      })
      .reduce((s, p) => s + (Number(p.total) || 0), 0);
    const prior = total - recent;
    const deltaPct = prior === 0 ? 0 : (recent / prior) * 100;

    // 5 segments — fixed order so the rainbow stays consistent
    const groups = [
      { key: "pending", color: "#fb923c", label: "Pending" },
      { key: "accepted", color: "#f59e0b", label: "Accepted" },
      { key: "rejected", color: "#ef4444", label: "Rejected" },
      { key: "open", color: "#a78bfa", label: "Open" }, // RFQs awarded but not yet PO'd
      { key: "fulfilled", color: "#22c55e", label: "Fulfilled" },
    ];
    const sliceValues = groups.map((g) => {
      let v = 0;
      if (g.key === "open") {
        v = rfqs
          .filter((r) => r.status === "awarded")
          .length;
      } else {
        v = pos
          .filter((p) => p.status === g.key)
          .reduce((s, p) => s + (Number(p.total) || 0), 0);
      }
      return { ...g, value: v };
    });
    const allZero = sliceValues.every((sl) => sl.value === 0);
    const slices = allZero
      ? groups.map((g) => ({ ...g, value: 1 }))
      : sliceValues;

    // tick position = "current commitment" — proportion of (pending + accepted)
    // out of total; visualizes how much of the rainbow is still "in flight".
    const totalSlice = slices.reduce((s, sl) => s + sl.value, 0);
    const inflight =
      slices
        .filter((sl) => sl.key === "pending" || sl.key === "accepted")
        .reduce((s, sl) => s + sl.value, 0) || 0;
    const tickAt = totalSlice === 0 ? 0.5 : inflight / totalSlice;

    return {
      total,
      deltaAmt: recent,
      deltaPct,
      slices,
      tickAt,
      betterPct: 7.52, // mirror reference; replace with real WoW once we track it
    };
  }, [pos, rfqs, nowMs]);

  /* ── Trend chart series — driven by range dropdown ── */
  const trend = useMemo(() => {
    const days = range === 7 ? 7 : range === 14 ? 14 : 30;
    const buckets = Array.from({ length: days }, (_, i) => {
      const d = new Date(nowMs);
      d.setDate(d.getDate() - (days - 1 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });
    const xLabels = buckets.map(fmtDate);
    const sameDay = (ts, b) => {
      const t = new Date(ts);
      return (
        t.getFullYear() === b.getFullYear() &&
        t.getMonth() === b.getMonth() &&
        t.getDate() === b.getDate()
      );
    };
    const series = [
      {
        label: "Approved",
        color: "#22c55e",
        values: buckets.map(
          (b) =>
            prs.filter(
              (p) =>
                p.status === "approved" &&
                p.updated_at &&
                sameDay(p.updated_at, b),
            ).length,
        ),
      },
      {
        label: "Pending",
        color: "#f59e0b",
        values: buckets.map(
          (b) =>
            prs.filter(
              (p) =>
                p.status === "pending" &&
                p.created_at &&
                sameDay(p.created_at, b),
            ).length,
        ),
      },
      {
        label: "Rejected",
        color: "#ef4444",
        values: buckets.map(
          (b) =>
            prs.filter(
              (p) =>
                (p.status === "rejected" || p.status === "cancelled") &&
                p.updated_at &&
                sameDay(p.updated_at, b),
            ).length,
        ),
      },
      {
        label: "Awarded",
        color: "#a78bfa",
        values: buckets.map(
          (b) =>
            rfqs.filter(
              (r) =>
                r.status === "awarded" &&
                r.updated_at &&
                sameDay(r.updated_at, b),
            ).length,
        ),
      },
    ];
    const totals = series.map((s) => ({
      label: s.label,
      color: s.color,
      value: s.values.reduce((a, b) => a + b, 0),
    }));
    return { series, xLabels, totals };
  }, [prs, rfqs, nowMs, range]);

  /* ── Top vendors (filtered by vendorFilter dropdown) ── */
  const vendors = useMemo(() => {
    const map = new Map();
    let grand = 0;
    const cutoff = nowMs - 30 * 86400000;
    pos.forEach((po) => {
      if (po.status === "rejected") return;
      // "active" filter: only POs created in the last 30 days
      if (vendorFilter === "active") {
        const ts = new Date(po.created_at ?? 0).getTime();
        if (ts < cutoff) return;
      }
      const key = po.vendor || "Unassigned";
      const cur = map.get(key) || { orders: 0, amount: 0, lastTs: 0 };
      cur.orders += 1;
      cur.amount += Number(po.total) || 0;
      const ts = new Date(po.updated_at ?? po.created_at ?? 0).getTime();
      if (ts > cur.lastTs) cur.lastTs = ts;
      grand += Number(po.total) || 0;
      map.set(key, cur);
    });
    let list = [...map.entries()].map(([name, v], i) => ({
      name,
      orders: v.orders,
      amount: v.amount,
      lastTs: v.lastTs,
      share: grand === 0 ? 0 : (v.amount / grand) * 100,
      color: VENDOR_PALETTE[i % VENDOR_PALETTE.length],
      initial: name[0]?.toUpperCase() ?? "?",
    }));
    if (vendorFilter === "top5") {
      list = [...list].sort((a, b) => b.amount - a.amount).slice(0, 5);
    }
    return list;
  }, [pos, vendorFilter, nowMs]);

  /* ── Activity feed (cross-domain, sorted by recency) ── */
  const activity = useMemo(() => {
    const events = [];
    [...prs]
      .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
      .slice(0, 4)
      .forEach((p) => {
        const kind =
          p.status === "approved"
            ? "success"
            : p.status === "rejected" || p.status === "cancelled"
              ? "danger"
              : p.status === "pending"
                ? "warning"
                : "info";
        const verb =
          p.status === "approved"
            ? "approved"
            : p.status === "rejected"
              ? "rejected"
              : p.status === "cancelled"
                ? "cancelled"
                : `awaiting ${p.chain_stage?.toUpperCase() ?? "review"}`;
        events.push({
          key: `pr-${p.number}`,
          docType: "PR",
          ref: p.number,
          to: `/app/purchase-requests/${p.number}`,
          text: `Request ${verb}`,
          kind,
          ago: timeAgo(p.updated_at, nowMs),
          ts: p.updated_at,
        });
      });
    [...pos]
      .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
      .slice(0, 3)
      .forEach((po) => {
        const kind =
          po.status === "accepted" || po.status === "fulfilled"
            ? "success"
            : po.status === "rejected"
              ? "danger"
              : "info";
        const verb =
          po.status === "accepted"
            ? `accepted by ${po.vendor}`
            : po.status === "fulfilled"
              ? `fulfilled by ${po.vendor}`
              : po.status === "rejected"
                ? `rejected by ${po.vendor}`
                : `issued to ${po.vendor}`;
        events.push({
          key: `po-${po.number}`,
          docType: "PO",
          ref: po.number,
          to: `/app/purchase-orders/${po.number}`,
          text: `Order ${verb}`,
          kind,
          ago: timeAgo(po.updated_at, nowMs),
          ts: po.updated_at,
        });
      });
    [...rfqs]
      .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
      .slice(0, 3)
      .forEach((r) => {
        const kind =
          r.status === "awarded"
            ? "success"
            : r.status === "closed"
              ? "danger"
              : "info";
        const verb =
          r.status === "awarded"
            ? `awarded to ${r.awarded_vendor ?? "vendor"}`
            : r.status === "closed"
              ? "closed"
              : "open for bids";
        events.push({
          key: `rfq-${r.number}`,
          docType: "RFQ",
          ref: r.number,
          to: `/app/quotations/${r.number}`,
          text: `Quotation ${verb}`,
          kind,
          ago: timeAgo(r.updated_at, nowMs),
          ts: r.updated_at,
        });
      });
    [...grns]
      .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
      .slice(0, 2)
      .forEach((g) => {
        events.push({
          key: `grn-${g.number}`,
          docType: "GRN",
          ref: g.number,
          to: `/app/grn/${g.number}`,
          text: `Receipt logged from ${g.vendor ?? "vendor"}`,
          kind: g.status === "fulfilled" ? "success" : "info",
          ago: timeAgo(g.updated_at, nowMs),
          ts: g.updated_at,
        });
      });
    return events
      .sort((a, b) => (b.ts ?? "").localeCompare(a.ts ?? ""))
      .slice(0, 8);
  }, [prs, pos, rfqs, grns, nowMs]);

  /* ── My approvals (role-gated) ── */
  const approvals = useMemo(() => {
    if (!user || !APPROVER_ROLES.has(user.role)) return [];
    return prs
      .filter(
        (p) =>
          p.status === "pending" &&
          (user.role === "admin" || p.chain_stage === user.role),
      )
      .map((p) => ({
        id: p.number,
        meta: `${p.title ?? "—"}${p.requester_name ? ` · by ${p.requester_name}` : ""}`,
        to: `/app/purchase-requests/${p.number}`,
      }));
  }, [prs, user]);

  // Initial loading: show skeleton while the very first PR fetch is pending
  // AND we have no data yet.
  const initialLoading = prLoading && prs.length === 0;

  /* ── render ── */
  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {initialLoading && (
        <div className="glass-card rounded-2xl p-8 text-center fade-up">
          <RefreshCw className="h-5 w-5 text-text-muted mx-auto mb-2 animate-spin" />
          <p className="text-[12px] text-text-muted">Loading procurement data…</p>
        </div>
      )}
      {/* ─── Section header — single row, positioned to mirror reference ─── */}
      <div className="flex flex-col lg:flex-row lg:items-end gap-4 lg:gap-6">
        {/* Left heading + its toolbar (covers PR + center Spend cards) */}
        <div className="flex items-end gap-4 lg:gap-6 flex-1">
          <div>
            <Eyebrow icon={Layers} label="All Activity" />
            <h2 className="text-[22px] font-bold text-text leading-tight tracking-tight mt-1">
              My Pipeline
            </h2>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <ToolbarDropdown
              label="Time range"
              value={range}
              onChange={setRange}
              width={76}
              options={[
                { value: 7, short: "7d", label: "Last 7 days" },
                { value: 14, short: "14d", label: "Last 14 days" },
                { value: 30, short: "30d", label: "Last 30 days" },
              ]}
            />
            <ToolbarBtn
              ariaLabel="Toggle hidden values"
              onClick={() => setHidden((h) => !h)}
              active={hidden}
            >
              {hidden ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </ToolbarBtn>
            <ToolbarBtn ariaLabel="Refresh data" onClick={refreshAll}>
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
            </ToolbarBtn>
          </div>
          {/* Center heading — sits over the wide spend card */}
          <div className="hidden lg:block ml-8">
            <Eyebrow icon={Layers} label="All Spend" />
            <h2 className="text-[22px] font-bold text-text leading-tight tracking-tight mt-1">
              Spend Snapshot
            </h2>
          </div>
        </div>
        {/* Right toolbar */}
        <div className="flex items-center gap-2 mb-1">
          <ToolbarDropdown
            label="Vendor filter"
            value={vendorFilter}
            onChange={setVendorFilter}
            width={108}
            options={[
              { value: "all", short: "All", label: "All Vendors" },
              { value: "top5", short: "Top 5", label: "Top 5 by spend" },
              { value: "active", short: "Active", label: "Active (30d)" },
            ]}
          />
          <ToolbarDropdown
            label="Time range"
            value={range}
            onChange={setRange}
            options={[
              { value: 7, label: "Last 7 days" },
              { value: 14, label: "Last 14 days" },
              { value: 30, label: "Last 30 days" },
            ]}
          />
        </div>
      </div>

      {/* ─── 3-card hero row — 1 : 2 : 1 ratio ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] gap-4 lg:gap-6">
        <TokenStatCard {...prCard} delay={0} />
        <SpendBalanceCard {...balance} delay={80} />
        <TokenStatCard {...poCard} delay={160} />
      </div>

      {/* ─── Pipeline strip — 4 stages PR / RFQ / PO / GRN ─── */}
      <PipelineStrip
        prs={prs}
        rfqs={rfqs}
        pos={pos}
        grns={grns}
        delay={200}
      />

      {/* ─── 2/3 + 1/3 lower row — chart + vendors ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[2.3fr_1fr] gap-4 lg:gap-6">
        <TrendChartCard
          series={trend.series}
          xLabels={trend.xLabels}
          totals={trend.totals}
          delay={240}
        />
        <TopVendorsCard vendors={vendors} delay={320} />
      </div>

      {/* ─── 2/3 + 1/3 row — activity + approvals ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[2.3fr_1fr] gap-4 lg:gap-6">
        <ActivityCard items={activity} delay={360} />
        <ApprovalsCard
          approvals={approvals}
          role={user?.role}
          delay={400}
        />
      </div>

      {/* ─── Quick actions footer ─── */}
      <div
        className="glass-card rounded-2xl p-5 fade-up"
        style={{ animationDelay: "400ms" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-bold text-text">Quick Actions</h3>
          <span className="text-[11px] text-text-muted">
            Jump straight into a workflow
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "New PR",
              icon: ClipboardList,
              to: "/app/purchase-requests/new",
            },
            {
              label: "New RFQ",
              icon: FileSpreadsheet,
              to: "/app/quotations/new",
            },
            {
              label: "New PO",
              icon: ReceiptText,
              to: "/app/purchase-orders/new",
            },
            { label: "Log GRN", icon: Package, to: "/app/grn/new" },
          ].map(({ label, icon: Icon, to }) => (
            <Link
              key={label}
              to={to}
              className="flex items-center gap-2.5 px-3 py-3 rounded-xl border border-white/5 bg-surface-container-low/60 hover:border-white/15 hover:bg-surface-container/60 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4" strokeWidth={2} />
              </div>
              <span className="text-[13px] font-semibold text-text truncate">
                {label}
              </span>
              <ChevronRight className="h-4 w-4 text-text-subtle ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
