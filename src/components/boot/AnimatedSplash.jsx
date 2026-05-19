import { useEffect, useRef, useState } from "react";
import { Factory } from "lucide-react";

/**
 * AnimatedSplash — the first frame the user sees.
 *
 * Orchestrated CSS-only reveal (no framer-motion to keep the boot bundle
 * tiny). The animation is staged across ~1.2s so it feels intentional even
 * on fast networks; on slow boots we keep showing it until `ready` flips.
 *
 *   t=0       : warm gradient + grain fade in
 *   t=120ms   : Factory mark scales up with a soft iris ring
 *   t=240ms   : ambient bloom pulses behind it
 *   t=360ms   : wordmark letters stagger in from below
 *   t=520ms   : the six pipeline stages light up left-to-right
 *   t=1100ms  : tag line fades in
 *   on ready  : whole panel zooms toward camera + fades to transparent
 *
 * The component is purely presentational — call site mounts it during
 * the auth bootstrap and unmounts when `ready` and at least MIN_DURATION_MS
 * has elapsed.
 */

// Total experience = MIN_DURATION_MS + 600ms exit fade. The orchestrated
// reveal completes around the 1.2s mark; holding ~800ms after that lets
// the user actually register the brand moment without slowing the boot.
const MIN_DURATION_MS = 2000;

const PIPELINE = ["PR", "RFQ", "PO", "GRN", "INV", "PAY"];

export default function AnimatedSplash({ ready, onExited }) {
  const [exiting, setExiting] = useState(false);
  const [mountedAt] = useState(() => Date.now());

  // Keep the latest onExited in a ref so we don't restart the exit timer
  // every time the parent re-renders (which it does several times during
  // boot — Providers, routes, auth-fetch). The effect itself runs once
  // per `ready` flip.
  const onExitedRef = useRef(onExited);
  useEffect(() => { onExitedRef.current = onExited; }, [onExited]);

  // Hand-off: once the host says ready AND the minimum runtime has elapsed,
  // start the exit animation. After the exit finishes, tell the host so it
  // can unmount us.
  useEffect(() => {
    if (!ready) return;
    const elapsed = Date.now() - mountedAt;
    const wait = Math.max(0, MIN_DURATION_MS - elapsed);
    const t1 = setTimeout(() => setExiting(true), wait);
    const t2 = setTimeout(() => onExitedRef.current?.(), wait + 600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [ready, mountedAt]);

  return (
    <div
      aria-hidden={exiting}
      role="status"
      className={`scm-splash fixed inset-0 z-[100] flex items-center justify-center overflow-hidden transition-[opacity,transform] duration-[600ms] ease-[cubic-bezier(.65,.05,.36,1)] ${
        exiting ? "opacity-0 scale-[1.06]" : "opacity-100 scale-100"
      }`}
    >
      {/* ── Backdrop layers ─────────────────────────────────── */}
      {/* Deep canvas */}
      <div className="absolute inset-0 splash-canvas" />
      {/* Apricot/coral radial bloom — animates outward */}
      <div className="absolute inset-0 splash-bloom" />
      {/* Subtle grain so the flat canvas reads less plastic */}
      <div className="absolute inset-0 splash-grain opacity-[0.04] mix-blend-overlay" />
      {/* Slow drifting orb for depth */}
      <div className="absolute -top-32 -right-24 w-[460px] h-[460px] rounded-full splash-orb-a" />
      <div className="absolute -bottom-40 -left-32 w-[520px] h-[520px] rounded-full splash-orb-b" />

      {/* ── Hero composition ────────────────────────────────── */}
      <div className="relative flex flex-col items-center px-6 max-w-md text-center">
        {/* Iris-ring + Factory mark */}
        <div className="relative mb-7">
          <span className="absolute inset-0 -m-6 rounded-full splash-iris" aria-hidden />
          <span className="absolute inset-0 -m-3 rounded-full splash-iris-2" aria-hidden />
          <span className="relative w-[88px] h-[88px] rounded-[22px] bg-[var(--color-primary)] flex items-center justify-center shadow-[0_18px_48px_-12px_rgba(220,38,38,0.55)] splash-mark">
            <Factory className="h-9 w-9 text-white splash-mark-inner" strokeWidth={2.6} />
          </span>
        </div>

        {/* Wordmark — per-letter stagger */}
        <h1 className="text-[28px] sm:text-[34px] font-black tracking-[-0.025em] text-white/95 leading-none flex">
          {"Suppliers First".split("").map((ch, i) => (
            <span
              key={i}
              className={`splash-letter inline-block ${ch === " " ? "w-[0.35em]" : ""}`}
              style={{ animationDelay: `${360 + i * 38}ms` }}
            >
              {ch === " " ? " " : ch}
            </span>
          ))}
        </h1>

        {/* Pipeline ribbon — six stages light up one-by-one */}
        <div className="mt-6 flex items-center gap-2">
          {PIPELINE.map((stage, i) => (
            <div key={stage} className="flex items-center gap-2">
              <span
                className="splash-pip relative inline-flex items-center justify-center w-12 h-7 rounded-full text-[10px] font-bold tracking-[0.16em] text-white/0 border border-white/15"
                style={{ animationDelay: `${520 + i * 110}ms` }}
              >
                {stage}
              </span>
              {i < PIPELINE.length - 1 && (
                <span
                  className="splash-conn h-px w-3"
                  style={{ animationDelay: `${570 + i * 110}ms` }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Tagline */}
        <p
          className="splash-tag mt-7 text-[11px] uppercase tracking-[0.35em] text-white/55"
          style={{ animationDelay: "1100ms" }}
        >
          {ready ? "Almost there" : "Procurement, signed off"}
        </p>
      </div>

      {/* Inline styles — keyframes scoped to .scm-splash so they don't bleed */}
      <style>{`
        .scm-splash .splash-canvas {
          background:
            radial-gradient(120% 80% at 50% -10%, #2a0f0c 0%, transparent 60%),
            linear-gradient(180deg, #100912 0%, #050307 100%);
        }
        .scm-splash .splash-bloom {
          background:
            radial-gradient(60% 50% at 50% 55%, rgba(251, 191, 36, 0.18) 0%, rgba(251, 191, 36, 0) 70%),
            radial-gradient(45% 40% at 50% 55%, rgba(220, 38, 38, 0.35) 0%, rgba(220, 38, 38, 0) 70%);
          animation: splash-bloom-pulse 4s ease-in-out infinite;
          transform-origin: 50% 55%;
        }
        @keyframes splash-bloom-pulse {
          0%, 100% { transform: scale(1);     opacity: 1; }
          50%      { transform: scale(1.08);  opacity: 0.85; }
        }
        .scm-splash .splash-grain {
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
        }
        .scm-splash .splash-orb-a {
          background: radial-gradient(circle, rgba(220,38,38,0.55) 0%, transparent 70%);
          filter: blur(60px);
          animation: splash-orb 9s ease-in-out infinite;
        }
        .scm-splash .splash-orb-b {
          background: radial-gradient(circle, rgba(251,191,36,0.35) 0%, transparent 70%);
          filter: blur(70px);
          animation: splash-orb 11s ease-in-out infinite reverse;
        }
        @keyframes splash-orb {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(20px, -10px) scale(1.05); }
        }

        /* Iris rings expand outward from the mark on entry. */
        .scm-splash .splash-iris {
          border: 2px solid rgba(255, 255, 255, 0.18);
          opacity: 0;
          transform: scale(0.5);
          animation: splash-iris 1.4s cubic-bezier(.22, .61, .36, 1) 80ms forwards,
                     splash-iris-loop 4s ease-out 1.4s infinite;
        }
        .scm-splash .splash-iris-2 {
          border: 1px solid rgba(251, 191, 36, 0.35);
          opacity: 0;
          transform: scale(0.5);
          animation: splash-iris 1.6s cubic-bezier(.22, .61, .36, 1) 200ms forwards,
                     splash-iris-loop-2 5s ease-out 1.6s infinite;
        }
        @keyframes splash-iris {
          0%   { opacity: 0; transform: scale(0.5); }
          40%  { opacity: 1; }
          100% { opacity: 0; transform: scale(2.2); }
        }
        @keyframes splash-iris-loop {
          0%   { opacity: 0.6; transform: scale(1.0); }
          100% { opacity: 0;   transform: scale(2.6); }
        }
        @keyframes splash-iris-loop-2 {
          0%   { opacity: 0.45; transform: scale(1.0); }
          100% { opacity: 0;    transform: scale(2.4); }
        }

        /* Brand mark scale-in with soft overshoot. */
        .scm-splash .splash-mark {
          opacity: 0;
          transform: scale(0.6) rotate(-6deg);
          animation: splash-mark 0.9s cubic-bezier(.22, 1.6, .36, 1) 120ms forwards;
        }
        .scm-splash .splash-mark-inner {
          animation: splash-mark-inner 4s ease-in-out 1.2s infinite;
        }
        @keyframes splash-mark {
          0%   { opacity: 0; transform: scale(0.6) rotate(-6deg); }
          60%  { opacity: 1; transform: scale(1.06) rotate(2deg); }
          100% { opacity: 1; transform: scale(1) rotate(0); }
        }
        @keyframes splash-mark-inner {
          0%, 100% { transform: rotate(0); }
          50%      { transform: rotate(-3deg); }
        }

        /* Wordmark letter rise-in. */
        .scm-splash .splash-letter {
          opacity: 0;
          transform: translateY(14px);
          animation: splash-letter 0.65s cubic-bezier(.22, .61, .36, 1) forwards;
        }
        @keyframes splash-letter {
          0%   { opacity: 0; transform: translateY(14px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        /* Pipeline stage chips light up sequentially. */
        .scm-splash .splash-pip {
          opacity: 0;
          background: rgba(255, 255, 255, 0.04);
          animation: splash-pip 0.55s cubic-bezier(.22, .61, .36, 1) forwards;
        }
        @keyframes splash-pip {
          0%   { opacity: 0; transform: translateY(6px); color: rgba(255,255,255,0); background: rgba(255,255,255,0.04); box-shadow: none; }
          60%  { opacity: 1; transform: translateY(0);   color: rgba(255,255,255,0.95); background: rgba(220,38,38,0.5);  box-shadow: 0 4px 14px -4px rgba(220,38,38,0.7); }
          100% { opacity: 1; transform: translateY(0);   color: rgba(255,255,255,0.75); background: rgba(255,255,255,0.07); box-shadow: 0 1px 0 rgba(255,255,255,0.06) inset; }
        }
        .scm-splash .splash-conn {
          background: linear-gradient(90deg, rgba(255,255,255,0.05), rgba(220,38,38,0.6), rgba(255,255,255,0.05));
          opacity: 0;
          transform: scaleX(0.2);
          transform-origin: left;
          animation: splash-conn 0.45s ease-out forwards;
        }
        @keyframes splash-conn {
          0%   { opacity: 0; transform: scaleX(0.2); }
          100% { opacity: 1; transform: scaleX(1); }
        }

        .scm-splash .splash-tag {
          opacity: 0;
          animation: splash-tag 0.7s ease-out forwards;
        }
        @keyframes splash-tag {
          0%   { opacity: 0; transform: translateY(6px); letter-spacing: 0.45em; }
          100% { opacity: 1; transform: translateY(0);   letter-spacing: 0.35em; }
        }

        /* Reduced-motion users get a calm fade-in only. */
        @media (prefers-reduced-motion: reduce) {
          .scm-splash * { animation: none !important; transition: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>
    </div>
  );
}
