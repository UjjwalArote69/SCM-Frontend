import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Plus, Sparkles, Clock, CheckCircle2, XCircle,
  PauseCircle, Package2, Wrench, MonitorSmartphone, Coffee,
  ChevronRight,
} from "lucide-react";
import Skeleton from "../../../components/feedback/Skeleton.jsx";

/**
 * EmployeeHero — editorial landing strip shown only to role=employee at
 * the top of the PR list page. Replaces the empty-feeling sidebar with
 * a personal command center: greeting, in-flight requests with their
 * approval chain visualised inline, and quick-start templates that
 * deep-link into Create.jsx with prefilled item names.
 *
 * Stays presentational — list filtering / KPIs continue to live in
 * List.jsx below. This is "context above the fold".
 */

const QUICK_STARTS = [
  { key: "office",      label: "Office supplies",     icon: Package2,           tint: "info"    },
  { key: "maintenance", label: "Maintenance & tools", icon: Wrench,             tint: "warning" },
  { key: "it",          label: "IT & software",       icon: MonitorSmartphone,  tint: "primary" },
  { key: "pantry",      label: "Pantry & consumables", icon: Coffee,            tint: "success" },
];

const TINT_CLS = {
  info:    { chip: "bg-info-soft text-info border-info/20",       dot: "bg-info" },
  warning: { chip: "bg-warning-soft text-warning border-warning/20", dot: "bg-warning" },
  primary: { chip: "bg-primary-soft text-primary border-primary/20", dot: "bg-primary" },
  success: { chip: "bg-success-soft text-success border-success/20", dot: "bg-success" },
};

const STAGE_PALETTE = {
  approved:  "bg-success",
  pending:   "bg-warning",
  rejected:  "bg-danger",
  hold:      "bg-warning",
  waiting:   "bg-surface-container",
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

// Per-stage state derived the same way List.jsx does it; duplicated to
// keep this component drop-in standalone.
function stageStateFor(stage, idx, row) {
  const history = Array.isArray(row.approval_history) ? row.approval_history : [];
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i]?.stage === stage.key) {
      const action = history[i].action;
      if (action === "approve") return "approved";
      if (action === "reject") return "rejected";
      if (action === "hold")
        return row.chain_stage === stage.key ? "hold" : "approved";
      // `reopen` invalidates the older reject on this stage. Stop scanning
      // back and fall through to current chain-position logic.
      if (action === "reopen") break;
    }
  }
  if (row.status === "approved") return "approved";
  if (row.status === "rejected" || row.status === "cancelled") return "rejected";
  const stages = Array.isArray(row.chain_stages) ? row.chain_stages : [];
  const currentIdx = stages.findIndex((s) => s.key === row.chain_stage);
  if (currentIdx === -1) return idx === 0 ? "pending" : "waiting";
  if (idx === currentIdx) return "pending";
  return idx < currentIdx ? "approved" : "waiting";
}

function stageLabel(stage) {
  if (!stage) return "—";
  if (stage.role === "hod") {
    if (!stage.department_code) return "HOD";
    if (stage.department_code === ":requester_dept") return "Your HOD";
    return `HOD ${stage.department_code}`;
  }
  return stage.role.toUpperCase();
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

function ApprovalRibbon({ row }) {
  const stages = Array.isArray(row.chain_stages) ? row.chain_stages : [];
  if (stages.length === 0) {
    return (
      <div className="text-[11px] text-text-subtle italic">
        Auto-approved — no chain required.
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {stages.map((stage, idx) => {
        const state = stageStateFor(stage, idx, row);
        const color = STAGE_PALETTE[state] ?? STAGE_PALETTE.waiting;
        const isCurrent = state === "pending" || state === "hold";
        return (
          <div key={stage.key + idx} className="flex items-center gap-1 group shrink-0">
            <span
              className={`h-2 w-2 rounded-full ${color} ${isCurrent ? "ring-2 ring-warning/30 animate-pulse" : ""}`}
              title={`${stageLabel(stage)} — ${state}`}
            />
            {idx < stages.length - 1 && (
              <span
                className={`h-px w-4 ${idx < stages.findIndex((s, i) => stageStateFor(s, i, row) === "pending" || stageStateFor(s, i, row) === "waiting") ? "bg-success/40" : "bg-border"}`}
              />
            )}
          </div>
        );
      })}
      <span className="ml-2 text-[11px] text-text-muted font-medium truncate">
        {(() => {
          const curIdx = stages.findIndex((s, i) => {
            const st = stageStateFor(s, i, row);
            return st === "pending" || st === "hold";
          });
          if (row.status === "approved") return "Fully approved";
          if (row.status === "rejected") return "Rejected";
          if (row.status === "cancelled") return "Cancelled";
          if (curIdx === -1) return "Done";
          return `With ${stageLabel(stages[curIdx])}`;
        })()}
      </span>
    </div>
  );
}

function HeroSkeleton() {
  return (
    <div className="relative">
      <Skeleton className="h-3 w-32 mb-4" />
      <Skeleton className="h-10 w-2/3 mb-3" />
      <Skeleton className="h-5 w-1/2 mb-8" />
      <Skeleton className="h-12 w-56" />
    </div>
  );
}

export default function EmployeeHero({ user, rows, loading }) {
  const firstName = (user?.name ?? "").split(/\s+/)[0] || "there";

  const stats = useMemo(() => {
    const acc = { total: rows.length, inMotion: 0, approved: 0, rejected: 0, draftAge: null };
    for (const r of rows) {
      if (r.status === "pending" || r.status === "hold") acc.inMotion++;
      if (r.status === "approved") acc.approved++;
      if (r.status === "rejected" || r.status === "cancelled") acc.rejected++;
    }
    return acc;
  }, [rows]);

  // Newest 3 in-flight PRs — used for the "in motion" panel.
  const inMotionRows = useMemo(() => {
    return [...rows]
      .filter((r) => r.status === "pending" || r.status === "hold")
      .sort((a, b) => new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0))
      .slice(0, 3);
  }, [rows]);

  // Two most recent finalised PRs for context ("here's what landed lately").
  const recentClosed = useMemo(() => {
    return [...rows]
      .filter((r) => r.status === "approved" || r.status === "rejected")
      .sort((a, b) => new Date(b.updated_at ?? b.created_at ?? 0) - new Date(a.updated_at ?? a.created_at ?? 0))
      .slice(0, 2);
  }, [rows]);

  const sentence = useMemo(() => {
    if (loading) return null;
    if (stats.total === 0) {
      return "You haven't raised a request yet. The first one takes about 2 minutes.";
    }
    if (stats.inMotion === 0) {
      return `${stats.approved} approved · 0 in motion. The runway's clear.`;
    }
    if (stats.inMotion === 1) {
      return "One request is moving through approvals right now.";
    }
    return `${stats.inMotion} requests are moving through approvals right now.`;
  }, [stats, loading]);

  return (
    <section className="relative overflow-hidden mb-8 sm:mb-10">
      {/* Ambient apricot wash — matches the canvas glow but more concentrated */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 w-[480px] h-[480px] rounded-full opacity-[0.55] blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-primary) 32%, transparent) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-20 w-[360px] h-[360px] rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-warning) 30%, transparent) 0%, transparent 70%)",
        }}
      />

      {/* ── Hero ── */}
      <div className="relative">
        {loading ? (
          <HeroSkeleton />
        ) : (
          <>
            <div className="flex items-center gap-2.5 mb-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary">
                {today()}
              </span>
              <span className="h-px flex-1 max-w-[60px] bg-gradient-to-r from-primary/60 to-transparent" />
            </div>

            <h1 className="font-black tracking-[-0.025em] text-text leading-[0.95] text-[34px] sm:text-[52px] lg:text-[68px] break-words">
              {greeting()}, <span className="text-primary">{firstName}</span>.
            </h1>

            <p className="mt-5 sm:mt-6 text-[18px] sm:text-[22px] leading-snug text-text-muted font-light max-w-2xl">
              {sentence}
            </p>

            <div className="mt-7 sm:mt-9 flex flex-wrap items-center gap-3">
              <Link
                to="/app/purchase-requests/new"
                className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-[0_8px_24px_-6px_color-mix(in_srgb,var(--color-primary)_55%,transparent)] hover:shadow-[0_12px_32px_-6px_color-mix(in_srgb,var(--color-primary)_70%,transparent)] hover:-translate-y-0.5 transition-all duration-200"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                Compose a request
                <ArrowRight className="h-4 w-4 -mr-1 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
              </Link>

              {/* Compact at-a-glance — three numbers separated by hairlines */}
              <div className="hidden sm:flex items-center divide-x divide-border/80 border border-border rounded-full bg-surface-container-lowest/60 backdrop-blur-sm">
                <Stat label="Raised" value={stats.total} />
                <Stat label="In motion" value={stats.inMotion} tone="warning" />
                <Stat label="Approved" value={stats.approved} tone="success" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Two-column body: in-motion feed + quick start ── */}
      <div className="relative mt-10 sm:mt-12 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 lg:gap-8">
        {/* In motion */}
        <article>
          <header className="flex items-baseline justify-between mb-4">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-text-subtle">
              In motion
            </h2>
            {stats.total > 0 && (
              <a href="#all-prs" className="text-[11px] font-semibold text-text-muted hover:text-primary inline-flex items-center gap-1">
                View all {stats.total} <ChevronRight className="h-3 w-3" />
              </a>
            )}
          </header>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          ) : inMotionRows.length === 0 ? (
            <EmptyMotion stats={stats} recentClosed={recentClosed} />
          ) : (
            <ul className="space-y-3">
              {inMotionRows.map((r) => (
                <li key={r.number}>
                  <Link
                    to={`/app/purchase-requests/${r.number}`}
                    className="group block p-5 rounded-2xl border border-border bg-surface-container-lowest/80 backdrop-blur-sm hover:border-primary/40 hover:bg-surface-container-lowest hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mb-1.5">
                          <span className="font-mono text-[11px] font-bold text-primary tracking-wide whitespace-nowrap">
                            {r.number}
                          </span>
                          <span className="text-text-subtle">·</span>
                          <span className="text-[11px] text-text-muted whitespace-nowrap">
                            raised {relativeDays(r.created_at)}
                          </span>
                          {r.priority && (
                            <>
                              <span className="text-text-subtle">·</span>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-warning whitespace-nowrap">
                                {r.priority}
                              </span>
                            </>
                          )}
                        </div>
                        <h3 className="text-[15px] font-semibold text-text truncate group-hover:text-primary transition-colors">
                          {r.title ?? `Request ${r.number}`}
                        </h3>
                        <p className="text-[12px] text-text-muted mt-0.5 truncate">
                          {Array.isArray(r.items) ? r.items.length : 0} item{Array.isArray(r.items) && r.items.length === 1 ? "" : "s"}
                          {r.department && <> · {r.department}</>}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-text-subtle group-hover:text-primary group-hover:translate-x-1 transition-all" strokeWidth={2.25} />
                    </div>

                    <div className="mt-4 pt-4 border-t border-border/70">
                      <ApprovalRibbon row={r} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {/* Recently closed strip — only shown when there's content for it */}
          {!loading && recentClosed.length > 0 && (
            <div className="mt-6">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-subtle mb-3">
                Recently closed
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {recentClosed.map((r) => {
                  const isApproved = r.status === "approved";
                  const Icon = isApproved ? CheckCircle2 : XCircle;
                  return (
                    <li key={r.number}>
                      <Link
                        to={`/app/purchase-requests/${r.number}`}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border/70 hover:border-border bg-surface-container-lowest/50 hover:bg-surface-container-lowest transition-colors"
                      >
                        <Icon
                          className={`h-4 w-4 shrink-0 ${isApproved ? "text-success" : "text-danger"}`}
                          strokeWidth={2.25}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-semibold text-text truncate">
                            {r.title ?? r.number}
                          </div>
                          <div className="text-[10px] text-text-muted">
                            {r.status} · {relativeDays(r.updated_at ?? r.created_at)}
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

        {/* Quick start rail */}
        <aside>
          <header className="flex items-baseline justify-between mb-4">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-text-subtle inline-flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary" strokeWidth={2.5} /> Quick start
            </h2>
          </header>
          <ul className="space-y-2">
            {QUICK_STARTS.map((q) => {
              const Icon = q.icon;
              const tint = TINT_CLS[q.tint];
              return (
                <li key={q.key}>
                  <Link
                    to={`/app/purchase-requests/new?seed=${q.key}`}
                    className="group flex items-center gap-3 p-3.5 rounded-2xl border border-border bg-surface-container-lowest/70 hover:border-primary/40 hover:shadow-md transition-all"
                  >
                    <span className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${tint.chip}`}>
                      <Icon className="h-4 w-4" strokeWidth={2.2} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-text truncate">{q.label}</div>
                      <div className="text-[10px] text-text-subtle uppercase tracking-wider">Template</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-text-subtle group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-[11px] text-text-subtle leading-relaxed">
            Templates pre-fill common items. You can edit everything before submitting.
          </p>
        </aside>
      </div>

      {/* Anchor target for "view all" link in the in-motion header */}
      <div id="all-prs" className="absolute -bottom-6" aria-hidden />
    </section>
  );
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

function EmptyMotion({ stats, recentClosed }) {
  if (stats.total === 0) {
    return (
      <div className="p-8 rounded-2xl border border-dashed border-border bg-surface-container-lowest/50 text-center">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-primary-soft text-primary mb-4">
          <Sparkles className="h-5 w-5" strokeWidth={2} />
        </div>
        <p className="text-[15px] font-semibold text-text">A clean slate.</p>
        <p className="text-[12px] text-text-muted mt-1 max-w-sm mx-auto">
          Click "Compose a request" above, or pick a template from the right to get started in seconds.
        </p>
      </div>
    );
  }
  return (
    <div className="p-6 rounded-2xl border border-success/20 bg-success-soft/30 flex items-center gap-4">
      <PauseCircle className="h-6 w-6 text-success shrink-0" strokeWidth={2} />
      <div>
        <p className="text-[14px] font-semibold text-text">Nothing waiting on approval.</p>
        <p className="text-[12px] text-text-muted mt-0.5">
          {recentClosed.length > 0
            ? "Your recent submissions have all landed. Raise a new one when you're ready."
            : "When you raise a request, you'll see its approval chain progress here."}
        </p>
      </div>
    </div>
  );
}

// re-export tiny helpers in case List.jsx wants them later
export { Stat as EmployeeStat };
// (Clock import kept for future expansion of stat tones; suppress unused warning.)
void Clock;
