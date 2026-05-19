import { Link, Navigate } from "react-router-dom";
import {
  Boxes, ShoppingCart, FileText, ShoppingBag, Package, ArrowRight,
  ShieldCheck, Workflow, BarChart3, Users, Wallet, FileCheck2,
  Building2, ChevronRight, CheckCircle2, Lock,
} from "lucide-react";
import { useAuthStore } from "../features/auth/store.js";
import { ROLE_HOME } from "../data/roles.js";
import ThemeToggle from "../components/ui/ThemeToggle.jsx";

/**
 * Landing — public marketing surface at `/`.
 *
 * Aesthetic mirrors AuthLayout: red brand, italic "Built on tide & steel"
 * tagline, light/dark-aware semantic tokens, Inter, soft radial primary
 * backdrop. Stays cohesive with the rest of the app.
 *
 * Logged-in users redirect to their role home; anonymous users see the page.
 */
export default function Landing() {
  const user = useAuthStore((s) => s.user);
  if (user) return <Navigate to={ROLE_HOME[user.role] ?? "/login"} replace />;

  return (
    <div className="min-h-screen bg-bg text-text">
      <TopNav />
      <Hero />
      <Pipeline />
      <Features />
      <Audiences />
      <Stats />
      <CallToAction />
      <Footer />
    </div>
  );
}

// ── Top nav ──────────────────────────────────────────────────────────────────
function TopNav() {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-bg/80 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
            <Boxes className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div className="leading-none">
            <div className="text-sm font-black tracking-tight text-text">Suppliers First</div>
            {/* <div className="text-[9px] mt-1 tracking-[0.32em] uppercase text-text-subtle"></div> */}
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6 ml-8 text-sm text-text-muted">
          <a href="#pipeline" className="hover:text-text transition-colors">How it works</a>
          <a href="#features" className="hover:text-text transition-colors">Features</a>
          <a href="#roles"    className="hover:text-text transition-colors">Who it's for</a>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Link
            to="/vendor-register"
            className="hidden sm:inline-flex text-sm font-semibold px-3 py-2 rounded-md text-text-muted hover:text-text hover:bg-surface-container-low transition-colors"
          >
            Become a vendor
          </Link>
          <Link
            to="/login"
            className="text-sm font-bold px-4 py-2 rounded-md bg-primary text-primary-foreground hover:brightness-110 transition shadow-sm"
          >
            Sign in
          </Link>
        </div>
      </div>
    </header>
  );
}

// ── Hero — split, mirroring AuthLayout's two-pane rhythm ────────────────────
function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Soft radial brand glow — same trick AuthLayout uses */}
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 18% 30%, var(--brand-primary), transparent 45%), radial-gradient(circle at 82% 60%, var(--brand-primary), transparent 50%)",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-24 sm:pt-24 sm:pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Copy */}
          <div className="lg:col-span-7">
            <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-primary mb-4">
              Procurement · Procure to Pay
            </p>

            <div className="italic text-text-muted text-2xl mb-3">
              Built on tide &amp; steel.
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight text-text mb-5">
              Supply Chain,
              <br />
              <span className="text-primary">Simplified.</span>
            </h1>

            <p className="text-[15px] sm:text-base lg:text-lg text-text-muted leading-relaxed mb-8 max-w-2xl">
              From the request raised on the shop floor to the cheque cleared at HQ — one
              platform. Editable approval rules, auto-routed RFQs, and PM-gated goods
              receipts with damage tracking. Streamline operations with absolute precision.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-md font-bold hover:brightness-110 shadow-sm transition"
              >
                Sign in to your workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/vendor-register"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-surface-container-lowest text-text border border-border rounded-md font-bold hover:border-primary hover:text-primary transition"
              >
                Apply as a vendor
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-text-muted">
              <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Defense-in-depth RBAC</span>
              <span className="inline-flex items-center gap-1.5"><FileCheck2 className="h-3.5 w-3.5" /> Editable approval rules</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> ₹ INR · GST · HSN</span>
            </div>
          </div>

          {/* Hero visual — pipeline preview */}
          <div className="lg:col-span-5">
            <HeroPanel />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroPanel() {
  const rows = [
    { tag: "PR-2026-1071", label: "IT laptop refresh",                   status: "HOD review",  tone: "primary" },
    { tag: "QT-2026-0042", label: "Auto-invited 6 vendors",              status: "Sourcing",    tone: "info"    },
    { tag: "PO-2026-8939", label: "Acme Industries · accepted",          status: "PO sent",     tone: "warning" },
    { tag: "GRN-2026-083", label: "PM approved · 2 damaged",             status: "Done",        tone: "success" },
  ];
  const tones = {
    primary: "bg-primary-soft text-primary",
    info:    "bg-info-soft text-info",
    warning: "bg-warning-soft text-warning",
    success: "bg-success-soft text-success",
  };
  const stages = ["PR", "RFQ", "PO", "GRN"];
  return (
    <div className="glass-card rounded-2xl p-5 shadow-lg space-y-3">
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs font-bold uppercase tracking-wider text-text-muted">Pipeline · live</div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-xs text-text-muted">Updated just now</span>
        </div>
      </div>
      {rows.map((r, i) => (
        <div key={i} className="rounded-xl bg-surface-container-low/60 border border-border p-3 sm:p-4 hover:border-primary/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-md ${tones[r.tone]} flex items-center justify-center font-mono text-[10px] font-bold shrink-0`}>
              {stages[i]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-mono text-xs text-text-muted">{r.tag}</div>
              <div className="text-sm font-semibold text-text truncate">{r.label}</div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-surface-container-low text-text-muted shrink-0">
              {r.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Pipeline section ────────────────────────────────────────────────────────
function Pipeline() {
  const stages = [
    {
      Icon: ShoppingCart, key: "PR", title: "Purchase Request",  tone: "primary",
      blurb: "Anyone on the floor raises what they need. Approval routes through your editable rule chain — HOD, CFO, CEO, or whatever you defined this morning.",
    },
    {
      Icon: FileText, key: "RFQ", title: "Quote Sourcing",  tone: "info",
      blurb: "Vendors auto-invited from the catalog by item category. Three-party HOD consensus locks in the winner before the CFO sees it.",
    },
    {
      Icon: ShoppingBag, key: "PO", title: "Purchase Order",  tone: "warning",
      blurb: "Five-stage internal approval before the vendor sees it. Vendor accepts. Uploads invoice + e-way bill + delivery note in one place.",
    },
    {
      Icon: Package, key: "GRN", title: "Goods Receipt",  tone: "success",
      blurb: "Site staff log received qty + damage with photos. Project Manager inspects on-site and signs off. Damaged units don't count toward fulfilment.",
    },
  ];
  return (
    <section id="pipeline" className="border-y border-border bg-surface-container-lowest py-20 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <SectionHeader
          eyebrow="The pipeline"
          title="From shop floor to vendor cheque, in one trail."
          sub="Every stage is auditable. Every approver is rule-defined. Every document is attached. No spreadsheets, no email threads, no orphaned PDFs."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mt-12">
          {stages.map((s, i) => (
            <PipelineCard key={s.key} stage={s} index={i} isLast={i === stages.length - 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PipelineCard({ stage, index, isLast }) {
  const tones = {
    primary: { dot: "bg-primary", chip: "bg-primary-soft text-primary" },
    info:    { dot: "bg-info",    chip: "bg-info-soft text-info"        },
    warning: { dot: "bg-warning", chip: "bg-warning-soft text-warning"  },
    success: { dot: "bg-success", chip: "bg-success-soft text-success"  },
  };
  const t = tones[stage.tone];
  const Icon = stage.Icon;
  return (
    <div className="group relative glass-card rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-center justify-between mb-5">
        <div className={`w-12 h-12 rounded-xl ${t.chip} flex items-center justify-center`}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="text-[10px] font-bold tracking-widest text-text-subtle">
          STEP {String(index + 1).padStart(2, "0")}
        </div>
      </div>
      <div className="text-xs font-mono font-bold text-text-muted mb-1">{stage.key}</div>
      <h4 className="text-lg font-bold text-text mb-2">{stage.title}</h4>
      <p className="text-sm text-text-muted leading-relaxed">{stage.blurb}</p>

      {!isLast && (
        <div className="hidden lg:flex absolute top-1/2 -right-3 z-10">
          <div className={`w-2 h-2 rounded-full ${t.dot}`} />
        </div>
      )}
    </div>
  );
}

// ── Features grid ───────────────────────────────────────────────────────────
function Features() {
  const features = [
    { Icon: FileCheck2, title: "Editable Approval Rules", blurb: "Admin-edited rule engine drives every PR / PO / Payment chain. No code change to add a director-level approval." },
    { Icon: Workflow,   title: "Three-Party Consensus",   blurb: "Procurement, Finance and Purchase HODs must agree before the CFO sees the RFQ. Bias removed by design." },
    { Icon: Users,      title: "Vendor Self-Service",     blurb: "Vendors get their own portal — see RFQs, submit quotes, accept POs, upload invoice + e-way bill + delivery note." },
    { Icon: BarChart3,  title: "Reports That Matter",     blurb: "Spend by vendor, by category, by department. Cycle-time analysis. Procurement funnel. CSV export on every report." },
    { Icon: Wallet,     title: "Cost-Tiered Payments",    blurb: "Under ₹50k clears straight away. ₹50k–5L needs CFO. ≥ ₹5L needs CFO + CEO. Tiers are admin-configurable." },
    { Icon: ShieldCheck,title: "PM Inspection Gate",      blurb: "Goods receipts don't auto-fulfil POs. A Project Manager inspects, logs damages, signs off. Vendor must replace damaged units." },
  ];
  return (
    <section id="features" className="py-20 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <SectionHeader
          eyebrow="What's inside"
          title="Built for the way procurement actually works."
          sub="Not a generic ERP module. Every flow was designed against the rough edges of real procurement at industrial scale — damage reports, vendor disputes, multi-stage approvals."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
          {features.map((f) => (
            <div key={f.title} className="group glass-card rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
              <div className="w-11 h-11 rounded-xl bg-primary-soft text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <f.Icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <h4 className="text-base font-bold text-text mb-2">{f.title}</h4>
              <p className="text-sm text-text-muted leading-relaxed">{f.blurb}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Audiences ───────────────────────────────────────────────────────────────
function Audiences() {
  const roles = [
    {
      Icon: Users, title: "Procurement",
      tag: "Officers · HODs · CPOs",
      blurb: "Auto-routed RFQs by item category. Three-party HOD consensus before award. Cycle-time analytics by department.",
      bullets: ["Auto-vendor invitations", "Consensus-based award gate", "Funnel + cycle-time reports"],
    },
    {
      Icon: Wallet, title: "Finance",
      tag: "CFOs · Accountants · Finance HODs",
      blurb: "Cost-tiered payment clearance. Vendor invoice tracking. Real-time spend by vendor and category — INR / GST / TDS aware.",
      bullets: ["Editable cost-tier rules", "Outstanding payment ageing", "Audit trail per stage"],
    },
    {
      Icon: Package, title: "Plant Operations",
      tag: "Site Persons · Project Managers",
      blurb: "Log GRNs against POs at the site. Capture damage with photos. PM signs off before fulfilment. Vendor must commit to replacement.",
      bullets: ["Damage capture with photos", "PM signs off before close", "Replacement workflow built-in"],
    },
    {
      Icon: Building2, title: "Vendors",
      tag: "Suppliers · OEMs",
      blurb: "Receive RFQs that match your category. Submit quotes. Accept POs. Upload invoice + e-way bill + delivery note.",
      bullets: ["Category-matched routing", "Self-serve onboarding", "Damage acknowledgement flow"],
    },
  ];
  return (
    <section id="roles" className="border-y border-border bg-surface-container-lowest py-20 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <SectionHeader
          eyebrow="Built for everyone"
          title="One workspace. The right view for every role."
          sub="Eleven roles. Department-scoped permissions. Defense-in-depth — route guards, axios bearer, controller RBAC, terminal-state guards. No one sees what they shouldn't."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-12">
          {roles.map((r) => (
            <div key={r.title} className="glass-card rounded-2xl p-6 lg:p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
                  <r.Icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xl font-bold text-text">{r.title}</h4>
                  <div className="text-xs text-text-muted">{r.tag}</div>
                </div>
              </div>
              <p className="text-sm text-text-muted leading-relaxed mb-5">{r.blurb}</p>
              <ul className="space-y-2 pt-4 border-t border-border">
                {r.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm text-text">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Stats / proof ───────────────────────────────────────────────────────────
function Stats() {
  const stats = [
    { num: "11", label: "Roles supported",    sub: "From employee to CEO + vendor"             },
    { num: "5",  label: "Approval chains",    sub: "PR · RFQ · PO · GRN · Payment"             },
    { num: "8",  label: "Pre-built reports",  sub: "Spend, funnel, cycle time, performance"    },
    { num: "₹",  label: "Indian-tax aware",   sub: "GST, HSN, e-way bill out of the box"       },
  ];
  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center sm:text-left">
              <div className="text-5xl sm:text-6xl font-black text-text leading-none mb-2 tabular-nums">{s.num}</div>
              <div className="text-sm font-bold text-text mb-0.5">{s.label}</div>
              <div className="text-xs text-text-muted">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Final CTA ───────────────────────────────────────────────────────────────
function CallToAction() {
  return (
    <section className="py-20 sm:py-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-deep text-primary-foreground p-8 sm:p-14 shadow-xl">
          <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />

          <div className="relative">
            <div className="italic text-2xl text-primary-foreground/80 mb-2">Built on tide &amp; steel.</div>
            <h3 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">Ready to upgrade your procurement?</h3>
            <p className="text-base sm:text-lg opacity-90 mb-7 max-w-2xl">
              Sign in with your Suppliers First credentials, or apply as a vendor to start receiving
              RFQs that actually match what you do.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-bg text-text rounded-md font-bold hover:bg-surface-container-lowest transition shadow-md"
              >
                Sign in
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/vendor-register"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/15 backdrop-blur text-primary-foreground rounded-md font-bold hover:bg-white/25 transition border border-white/20"
              >
                Apply as a vendor
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Footer ──────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-border bg-surface-container-lowest">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row gap-6 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Boxes className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div className="leading-none">
            <div className="text-sm font-black tracking-tight text-text">Suppliers First</div>
            {/* <div className="text-[9px] mt-1 tracking-[0.32em] uppercase text-text-subtle"></div> */}
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-text-muted">
          <Link to="/login" className="hover:text-text transition-colors">Sign in</Link>
          <Link to="/vendor-register" className="hover:text-text transition-colors">Vendor signup</Link>
          <Link to="/forgot-password" className="hover:text-text transition-colors">Forgot password</Link>
          <a href="mailto:procurement@meka.in" className="hover:text-text transition-colors">procurement@meka.in</a>
        </nav>

        <div className="text-xs text-text-subtle">
          © {new Date().getFullYear()}  India
        </div>
      </div>
    </footer>
  );
}

// ── Reusable section header ─────────────────────────────────────────────────
function SectionHeader({ eyebrow, title, sub }) {
  return (
    <div className="max-w-2xl">
      <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-primary mb-3">{eyebrow}</p>
      <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-text leading-[1.1] mb-3">
        {title}
      </h2>
      <p className="text-base text-text-muted leading-relaxed">{sub}</p>
    </div>
  );
}
