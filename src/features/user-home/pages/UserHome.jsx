import { useEffect, useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Layers,
  Package,
  ReceiptText,
  RefreshCw,
} from "lucide-react";
import { usePRStore } from "../../purchase-requests/store.js";
import { usePOStore } from "../../purchase-orders/store.js";
import { useRFQStore } from "../../quotations/store.js";
import { useAuthStore } from "../../auth/store.js";

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

function ToolbarBtn({ children, onClick, title, ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={ariaLabel ?? title}
      className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full border border-border bg-surface-container-low/60 text-text-muted hover:text-text hover:border-white/20 transition-colors text-[11px] font-semibold tabular-nums"
    >
      {children}
    </button>
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
function Sparkline({ values, tone = "success", height = 64 }) {
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
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {/* halo'd endpoint */}
      <circle cx={lastX} cy={lastY} r="7" fill={stroke} fillOpacity="0.18" />
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
      className="glass-card rounded-2xl p-5 flex flex-col fade-up hover:border-white/20 transition-colors"
    >
      {/* top row */}
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-black shrink-0 shadow-sm"
          style={{ background: iconBg, color: "#1a1a22" }}
        >
          {iconChar ?? iconLetter}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="text-[10px] font-bold tracking-[0.22em] text-text-muted uppercase">
            {eyebrow}
          </div>
          <div className="text-[15px] font-bold text-text truncate leading-tight">
            {name}
          </div>
        </div>
      </div>
      {/* value row */}
      <div className="mt-5 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[26px] font-black text-text leading-none tabular-nums tracking-tight truncate">
            {value}
          </div>
          {subValue && (
            <div className="text-[11.5px] text-text-muted mt-1.5 truncate">
              {subValue}
            </div>
          )}
        </div>
        <ChangePill pct={changePct} />
      </div>
      {/* sparkline */}
      <div className="mt-4 -mx-1">
        <div className="text-[11px] font-semibold tabular-nums px-1 mb-0.5"
             style={{ color: positive ? "#22c55e" : "#f87171" }}>
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
      className="glass-card rounded-2xl p-5 flex flex-col fade-up"
    >
      <div className="flex items-baseline gap-3">
        <div className="text-[28px] font-black text-text leading-none tabular-nums tracking-tight">
          {fmtINR(total)}
        </div>
      </div>
      <div className="mt-2.5 inline-flex items-center gap-2 text-[12.5px]">
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
          className="font-bold tabular-nums"
          style={{ color: positive ? "#ff5d3a" : "#f87171" }}
        >
          {positive ? "+" : "-"}
          {fmtINR(Math.abs(deltaAmt))}
        </span>
        <span className="text-text-muted tabular-nums">
          ({deltaPct.toFixed(2)}%)
        </span>
      </div>

      <div className="relative mt-2 -mb-2">
        <RainbowGauge slices={slices} tickAt={tickAt} />
        <div className="absolute inset-x-0 bottom-3 text-center text-[11.5px] text-text-muted leading-tight">
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
      className="glass-card rounded-2xl p-5 flex flex-col fade-up"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-bold text-text">Procurement Trend</h3>
        <Link
          to="/app/purchase-requests"
          className="text-[11px] font-semibold text-text-muted hover:text-primary"
        >
          See all
        </Link>
      </div>

      <FilterPills tabs={tabs} active={tab} onChange={setTab} />

      <div className="flex-1 min-h-[240px] mt-4">
        <MultiLineChart series={visible} xLabels={xLabels} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {totals.map((t) => (
          <span
            key={t.label}
            className="inline-flex items-center gap-1.5 text-[11px] bg-surface-container-low/60 border border-white/5 rounded-full pl-2 pr-3 py-1 tabular-nums"
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: t.color }}
            />
            <span className="text-text-muted">{t.label}</span>
            <span className="text-text font-bold">{t.value}</span>
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
      className="glass-card rounded-2xl p-5 flex flex-col fade-up"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-bold text-text">Top Vendors</h3>
        <Link
          to="/admin/vendors"
          className="text-[11px] font-semibold text-text-muted hover:text-primary"
        >
          See all
        </Link>
      </div>

      <FilterPills tabs={tabs} active={tab} onChange={setTab} />

      <div className="mt-4 flex flex-col gap-0.5">
        {sorted.length === 0 && (
          <div className="text-[12px] text-text-muted py-8 text-center">
            No vendor activity yet.
          </div>
        )}
        {sorted.slice(0, 6).map((v) => (
          <Link
            key={v.name}
            to="#"
            className="flex items-center gap-3 px-1 py-2.5 rounded-xl hover:bg-white/[0.02] transition-colors group"
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 shadow-sm"
              style={{ background: v.color, color: "#1a1a22" }}
            >
              {v.initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-text truncate">
                {v.name}
              </div>
              <div className="text-[10px] text-text-muted tabular-nums">
                {v.share.toFixed(0)}%
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[14px] font-black text-text tabular-nums leading-none">
                {v.orders}
              </div>
              <div className="text-[10px] text-text-muted tabular-nums mt-1">
                {fmtCompact(v.amount)}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-text-subtle ml-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </Link>
        ))}
      </div>
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
  const fetchPRs = usePRStore((s) => s.fetchAll);
  const pos = usePOStore((s) => s.items);
  const fetchPOs = usePOStore((s) => s.fetchAll);
  const rfqs = useRFQStore((s) => s.items);
  const fetchRFQs = useRFQStore((s) => s.fetchAll);

  const [hidden, setHidden] = useState(false);
  // Capture "now" once on mount so memoized derivations stay pure across re-renders.
  const [nowMs] = useState(() => Date.now());

  useEffect(() => {
    fetchPRs();
    fetchPOs();
    fetchRFQs();
  }, [fetchPRs, fetchPOs, fetchRFQs]);

  const refreshAll = () => {
    fetchPRs();
    fetchPOs();
    fetchRFQs();
  };

  /* ── PR card ── */
  const prCard = useMemo(() => {
    const days = 14;
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
    const recent = spark.slice(-7).reduce((a, b) => a + b, 0);
    const prior = spark.slice(0, 7).reduce((a, b) => a + b, 0);
    const change =
      prior === 0 ? (recent === 0 ? 0 : 100) : ((recent - prior) / prior) * 100;
    const approved = prs.filter((p) => p.status === "approved").length;
    const pending = prs.filter((p) => p.status === "pending").length;
    return {
      iconBg: "linear-gradient(135deg, #fbbf24, #f59e0b)",
      iconChar: "P",
      eyebrow: "PR",
      name: "Purchase Requests",
      value: hidden ? "•••" : String(prs.length),
      subValue: hidden ? "•••" : `${approved} approved · ${pending} pending`,
      changePct: change,
      delta: `${recent >= 0 ? "+" : ""}${recent} this week`,
      spark: spark.length >= 2 ? spark : [0, 1],
      to: "/app/purchase-requests",
    };
  }, [prs, hidden, nowMs]);

  /* ── PO card ── */
  const poCard = useMemo(() => {
    const days = 14;
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
    const recent = spark.slice(-7).reduce((a, b) => a + b, 0);
    const prior = spark.slice(0, 7).reduce((a, b) => a + b, 0);
    const change =
      prior === 0 ? (recent === 0 ? 0 : 100) : ((recent - prior) / prior) * 100;
    const totalSpend = pos
      .filter((p) => p.status !== "rejected")
      .reduce((s, p) => s + (Number(p.total) || 0), 0);
    return {
      iconBg: "linear-gradient(135deg, #60a5fa, #3b82f6)",
      iconChar: "O",
      eyebrow: "PO",
      name: "Purchase Orders",
      value: hidden ? "•••" : String(pos.length),
      subValue: hidden ? "•••" : `${fmtCompact(totalSpend)} spent`,
      changePct: change,
      delta: hidden
        ? "•••"
        : `${recent >= 0 ? "+" : ""}${fmtCompact(recent)} this week`,
      spark: spark.length >= 2 ? spark : [0, 1],
      to: "/app/purchase-orders",
    };
  }, [pos, hidden, nowMs]);

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

  /* ── Trend chart series — last 10 days ── */
  const trend = useMemo(() => {
    const days = 10;
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
  }, [prs, rfqs, nowMs]);

  /* ── Top vendors ── */
  const vendors = useMemo(() => {
    const map = new Map();
    let grand = 0;
    pos.forEach((po) => {
      if (po.status === "rejected") return;
      const key = po.vendor || "Unassigned";
      const cur = map.get(key) || { orders: 0, amount: 0, lastTs: 0 };
      cur.orders += 1;
      cur.amount += Number(po.total) || 0;
      const ts = new Date(po.updated_at ?? po.created_at ?? 0).getTime();
      if (ts > cur.lastTs) cur.lastTs = ts;
      grand += Number(po.total) || 0;
      map.set(key, cur);
    });
    return [...map.entries()].map(([name, v], i) => ({
      name,
      orders: v.orders,
      amount: v.amount,
      lastTs: v.lastTs,
      share: grand === 0 ? 0 : (v.amount / grand) * 100,
      color: VENDOR_PALETTE[i % VENDOR_PALETTE.length],
      initial: name[0]?.toUpperCase() ?? "?",
    }));
  }, [pos]);

  void user;

  /* ── render ── */
  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* ─── 2-section header row, positioned to mirror hero card columns ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr_1fr] gap-4 lg:gap-6 items-end">
        {/* Left section heading — sits over PR + Spend cards */}
        <div className="lg:col-span-2 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <Eyebrow icon={Layers} label="All Activity" />
            <h2 className="text-2xl font-bold text-text leading-tight tracking-tight mt-1">
              My Pipeline
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <ToolbarBtn ariaLabel="Time range">
              7d <ChevronDown className="h-3 w-3" />
            </ToolbarBtn>
            <ToolbarBtn
              ariaLabel="Toggle hidden values"
              onClick={() => setHidden((h) => !h)}
            >
              {hidden ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </ToolbarBtn>
            <ToolbarBtn ariaLabel="Refresh data" onClick={refreshAll}>
              <RefreshCw className="h-3.5 w-3.5" />
            </ToolbarBtn>
          </div>
        </div>
        {/* Right section heading — sits over PO card */}
        <div className="flex items-end justify-between gap-3">
          <div>
            <Eyebrow icon={Layers} label="All Orders" />
            <h2 className="text-2xl font-bold text-text leading-tight tracking-tight mt-1">
              Order Pulse
            </h2>
          </div>
          <ToolbarBtn ariaLabel="Vendor filter">
            All Vendors <ChevronDown className="h-3 w-3" />
          </ToolbarBtn>
        </div>
      </div>

      {/* ─── 3-card hero row ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr_1fr] gap-4 lg:gap-6">
        <TokenStatCard {...prCard} delay={0} />
        <SpendBalanceCard {...balance} delay={80} />
        <TokenStatCard {...poCard} delay={160} />
      </div>

      {/* ─── 2/3 + 1/3 lower row ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 lg:gap-6">
        <TrendChartCard
          series={trend.series}
          xLabels={trend.xLabels}
          totals={trend.totals}
          delay={240}
        />
        <TopVendorsCard vendors={vendors} delay={320} />
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
