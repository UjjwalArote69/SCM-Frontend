import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus, ArrowRight, Truck, ChevronRight, Sparkles, CheckCircle2,
  AlertTriangle, Clock, PackageCheck,
} from "lucide-react";
import Skeleton from "../../../components/feedback/Skeleton.jsx";
import client from "../../../api/client.js";

/**
 * SiteHero — editorial landing strip shown to role=site_person at the top
 * of the GRN list page. Mirrors EmployeeHero on the PR side: greeting,
 * "today's deliveries" focus, eligible POs waiting to be receipted, and
 * a recent activity strip. Sits above the standard GRN list so all the
 * filtering and search continue to work the same way for everyone else.
 */

const STATE_PALETTE = {
  pending_pm: { label: "Awaiting PM", tone: "warning" },
  done:       { label: "Approved",    tone: "success" },
  rejected:   { label: "Rejected",    tone: "danger"  },
};

const TONE_CLS = {
  warning: { chip: "bg-warning-soft text-warning border-warning/30", dot: "bg-warning" },
  success: { chip: "bg-success-soft text-success border-success/30", dot: "bg-success" },
  danger:  { chip: "bg-danger-soft text-danger border-danger/30",    dot: "bg-danger"  },
  neutral: { chip: "bg-surface-container text-text-muted border-border", dot: "bg-text-subtle" },
};

function greeting() {
  const h = new Date().getHours();
  if (h < 5)  return "Up early";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Working late";
}

function today() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric",
  });
}

function relativeDays(iso) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "—";
  const days = Math.floor(ms / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function HeroSkeleton() {
  return (
    <div>
      <Skeleton className="h-3 w-32 mb-4" />
      <Skeleton className="h-10 w-2/3 mb-3" />
      <Skeleton className="h-5 w-1/2 mb-8" />
      <Skeleton className="h-12 w-56" />
    </div>
  );
}

export default function SiteHero({ user, rows, loading }) {
  const firstName = (user?.name ?? "").split(/\s+/)[0] || "there";

  // Eligible POs are fetched from the dedicated endpoint that already
  // applies the site-person scoping; we keep this hero zero-state friendly
  // by tolerating a network failure.
  const [eligible, setEligible] = useState([]);
  const [eligibleLoading, setEligibleLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    client
      .get("/grns/eligible-pos")
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res?.data?.data) ? res.data.data
          : Array.isArray(res?.data) ? res.data : [];
        setEligible(list);
      })
      .catch(() => { if (!cancelled) setEligible([]); })
      .finally(() => { if (!cancelled) setEligibleLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => {
    const acc = { total: rows.length, pendingPm: 0, done: 0, withDamage: 0 };
    for (const r of rows) {
      if (r.chain_stage === "pending_pm") acc.pendingPm++;
      if (r.chain_stage === "done") acc.done++;
      const items = Array.isArray(r.items) ? r.items : [];
      if (items.some((it) => Number(it.damaged) > 0)) acc.withDamage++;
    }
    return acc;
  }, [rows]);

  const recent = useMemo(() => {
    return [...rows]
      .sort((a, b) => new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0))
      .slice(0, 3);
  }, [rows]);

  const sentence = useMemo(() => {
    if (loading) return null;
    if (eligible.length === 0 && stats.total === 0) {
      return "No deliveries to record yet. POs will appear here as they get accepted.";
    }
    if (eligible.length > 0) {
      const word = eligible.length === 1 ? "delivery" : "deliveries";
      return `${eligible.length} ${word} ready to be received.`;
    }
    if (stats.pendingPm > 0) {
      return `Receipts are caught up. ${stats.pendingPm} waiting on PM approval.`;
    }
    return `Everything's logged. ${stats.done} receipt${stats.done === 1 ? "" : "s"} on the books.`;
  }, [eligible, stats, loading]);

  return (
    <section className="relative overflow-hidden mb-8 sm:mb-10">
      {/* Ambient gradient — uses warning/amber to evoke "warehouse / loading dock" warmth */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 w-[480px] h-[480px] rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-warning) 30%, transparent) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-20 w-[360px] h-[360px] rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-primary) 28%, transparent) 0%, transparent 70%)",
        }}
      />

      <div className="relative">
        {loading ? (
          <HeroSkeleton />
        ) : (
          <>
            <div className="flex items-center gap-2.5 mb-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-warning">
                {today()}
              </span>
              <span className="h-px flex-1 max-w-[60px] bg-gradient-to-r from-warning/60 to-transparent" />
            </div>

            <h1 className="font-black tracking-[-0.025em] text-text leading-[0.95] text-[34px] sm:text-[52px] lg:text-[68px] break-words">
              {greeting()}, <span className="text-primary">{firstName}</span>.
            </h1>

            <p className="mt-5 sm:mt-6 text-[18px] sm:text-[22px] leading-snug text-text-muted font-light max-w-2xl">
              {sentence}
            </p>

            <div className="mt-7 sm:mt-9 flex flex-wrap items-center gap-3">
              <Link
                to="/app/grn/new"
                className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-[0_8px_24px_-6px_color-mix(in_srgb,var(--color-primary)_55%,transparent)] hover:shadow-[0_12px_32px_-6px_color-mix(in_srgb,var(--color-primary)_70%,transparent)] hover:-translate-y-0.5 transition-all duration-200"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                Log a receipt
                <ArrowRight className="h-4 w-4 -mr-1 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
              </Link>

              <div className="hidden sm:flex items-center divide-x divide-border/80 border border-border rounded-full bg-surface-container-lowest/60 backdrop-blur-sm">
                <Stat label="Today" value={recent.filter((r) => isToday(r.created_at)).length} />
                <Stat label="Awaiting PM" value={stats.pendingPm} tone="warning" />
                <Stat label="Approved" value={stats.done} tone="success" />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="relative mt-10 sm:mt-12 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 lg:gap-8">
        {/* Eligible POs — primary focus for a site person */}
        <article>
          <header className="flex items-baseline justify-between mb-4">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-text-subtle inline-flex items-center gap-1.5">
              <Truck className="h-3 w-3 text-warning" strokeWidth={2.5} /> Ready to receive
            </h2>
            {eligible.length > 3 && (
              <Link to="/app/grn/new" className="text-[11px] font-semibold text-text-muted hover:text-primary inline-flex items-center gap-1">
                Pick one <ChevronRight className="h-3 w-3" />
              </Link>
            )}
          </header>

          {eligibleLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          ) : eligible.length === 0 ? (
            <EmptyEligible recent={recent} />
          ) : (
            <ul className="space-y-3">
              {eligible.slice(0, 3).map((po) => (
                <li key={po.number}>
                  <Link
                    to={`/app/grn/new?po=${encodeURIComponent(po.number)}`}
                    className="group block p-5 rounded-2xl border border-border bg-surface-container-lowest/80 backdrop-blur-sm hover:border-primary/40 hover:bg-surface-container-lowest hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <span className="h-11 w-11 rounded-xl bg-warning-soft text-warning flex items-center justify-center shrink-0 border border-warning/20">
                        <Truck className="h-5 w-5" strokeWidth={2} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mb-1">
                          <span className="font-mono text-[11px] font-bold text-primary tracking-wide whitespace-nowrap">
                            {po.number}
                          </span>
                          <span className="text-text-subtle">·</span>
                          <span className="text-[11px] text-text-muted min-w-0 truncate">
                            from {po.vendor}
                          </span>
                        </div>
                        <h3 className="text-[15px] font-semibold text-text truncate group-hover:text-primary transition-colors">
                          {po.title ?? `${Array.isArray(po.items) ? po.items.length : 0} item${Array.isArray(po.items) && po.items.length === 1 ? "" : "s"}`}
                        </h3>
                        <p className="text-[12px] text-text-muted mt-0.5">
                          Expected {po.expected_delivery ?? "—"}
                          {po.status === "fulfilled" && (
                            <> · <span className="text-success font-semibold">partial OK</span></>
                          )}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-text-subtle group-hover:text-primary group-hover:translate-x-1 transition-all" strokeWidth={2.25} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {/* Recent receipts strip */}
          {recent.length > 0 && (
            <div className="mt-6">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-subtle mb-3">
                Recent receipts
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {recent.slice(0, 2).map((g) => {
                  const meta = STATE_PALETTE[g.chain_stage] ?? { label: g.chain_stage, tone: "neutral" };
                  const t = TONE_CLS[meta.tone];
                  return (
                    <li key={g.number}>
                      <Link
                        to={`/app/grn/${g.number}`}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border/70 hover:border-border bg-surface-container-lowest/50 hover:bg-surface-container-lowest transition-colors"
                      >
                        <span className={`h-2 w-2 rounded-full shrink-0 ${t.dot}`} />
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-semibold text-text truncate">
                            {g.number}
                            <span className="ml-1.5 text-[10px] text-text-subtle font-normal">
                              · {g.vendor}
                            </span>
                          </div>
                          <div className="text-[10px] text-text-muted">
                            {meta.label} · {relativeDays(g.created_at)}
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </article>

        {/* Right rail — at-a-glance + tips */}
        <aside className="space-y-4">
          <header className="flex items-baseline justify-between mb-1">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-text-subtle inline-flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary" strokeWidth={2.5} /> Today at a glance
            </h2>
          </header>

          <div className="grid grid-cols-2 gap-2">
            <MetricTile
              icon={Truck}
              label="To recv"
              value={eligibleLoading ? "…" : eligible.length}
              tone="warning"
            />
            <MetricTile
              icon={Clock}
              label="With PM"
              value={stats.pendingPm}
              tone="info"
            />
            <MetricTile
              icon={CheckCircle2}
              label="Approved"
              value={stats.done}
              tone="success"
            />
            <MetricTile
              icon={AlertTriangle}
              label="Damaged"
              value={stats.withDamage}
              tone="danger"
            />
          </div>

          <div className="p-4 rounded-2xl border border-border bg-surface-container-lowest/70 text-[12px] text-text-muted leading-relaxed">
            <div className="font-bold text-text text-[11px] uppercase tracking-[0.18em] mb-1.5">
              Before you log
            </div>
            Photograph any damaged units before the carrier leaves. They become evidence on the receipt and feed the replacement loop.
          </div>
        </aside>
      </div>
    </section>
  );
}

function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
      && d.getMonth() === now.getMonth()
      && d.getDate() === now.getDate();
}

function Stat({ label, value, tone = "neutral" }) {
  const numTone =
    tone === "warning" ? "text-warning"
    : tone === "success" ? "text-success"
    : "text-text";
  return (
    <div className="px-4 py-2 flex items-baseline gap-2">
      <span className={`text-[18px] font-black tabular-nums leading-none ${numTone}`}>
        {value}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-subtle">
        {label}
      </span>
    </div>
  );
}

function MetricTile({ icon: Icon, label, value, tone }) {
  const t = TONE_CLS[tone] ?? TONE_CLS.neutral;
  return (
    <div className="p-3 rounded-xl border border-border bg-surface-container-lowest/70 flex items-center gap-2.5">
      <span className={`h-9 w-9 rounded-lg flex items-center justify-center border shrink-0 ${t.chip}`}>
        <Icon className="h-4 w-4" strokeWidth={2.25} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[16px] font-black tabular-nums text-text leading-none">{value}</div>
        <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-subtle mt-0.5 whitespace-nowrap">
          {label}
        </div>
      </div>
    </div>
  );
}

function EmptyEligible({ recent }) {
  if (recent.length === 0) {
    return (
      <div className="p-8 rounded-2xl border border-dashed border-border bg-surface-container-lowest/50 text-center">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-primary-soft text-primary mb-4">
          <PackageCheck className="h-5 w-5" strokeWidth={2} />
        </div>
        <p className="text-[15px] font-semibold text-text">A quiet dock.</p>
        <p className="text-[12px] text-text-muted mt-1 max-w-sm mx-auto">
          When a PO is accepted by procurement and routed to your site, it'll show up here.
        </p>
      </div>
    );
  }
  return (
    <div className="p-6 rounded-2xl border border-success/20 bg-success-soft/30 flex items-center gap-4">
      <CheckCircle2 className="h-6 w-6 text-success shrink-0" strokeWidth={2} />
      <div>
        <p className="text-[14px] font-semibold text-text">All caught up.</p>
        <p className="text-[12px] text-text-muted mt-0.5">
          No deliveries pending. New POs will surface here automatically.
        </p>
      </div>
    </div>
  );
}
