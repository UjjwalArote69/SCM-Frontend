import { useEffect, useMemo, useState } from "react";
import {
  BarChart3, Building2, Tag, TrendingUp, Hourglass,
  Award, Filter, Clock, Loader2, AlertTriangle,
} from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import DateRangeFilter from "../components/DateRangeFilter.jsx";
import {
  SpendByVendor, SpendByDepartment, SpendByCategory, MonthlyTrend,
  PendingApprovals, VendorPerformance, Funnel, CycleTime,
} from "../components/Reports.jsx";
import reportsApi from "../api.js";
import { defaultRange } from "../utils.js";

// Each entry is one report tile: kind, label, description, icon, fetch fn, renderer, supportsRange.
const REPORTS = [
  {
    kind: "spend_by_vendor",
    label: "Spend by Vendor",
    desc: "Top vendors by order value, with PO counts and last activity.",
    icon: Building2,
    api: "spendByVendor",
    Renderer: SpendByVendor,
    range: true,
  },
  {
    kind: "spend_by_department",
    label: "Spend by Department",
    desc: "Where the money is going — by requesting department.",
    icon: BarChart3,
    api: "spendByDepartment",
    Renderer: SpendByDepartment,
    range: true,
  },
  {
    kind: "spend_by_category",
    label: "Spend by Category",
    desc: "What you're buying most of, expanded from PO line items.",
    icon: Tag,
    api: "spendByCategory",
    Renderer: SpendByCategory,
    range: true,
  },
  {
    kind: "monthly_trend",
    label: "Monthly Trend",
    desc: "PR & PO volume and ₹ committed over time.",
    icon: TrendingUp,
    api: "monthlyTrend",
    Renderer: MonthlyTrend,
    range: true,
  },
  {
    kind: "pending_approvals",
    label: "Pending Approvals",
    desc: "Live snapshot — what's stuck where, and for how long.",
    icon: Hourglass,
    api: "pendingApprovals",
    Renderer: PendingApprovals,
    range: false,
  },
  {
    kind: "vendor_performance",
    label: "Vendor Performance",
    desc: "Acceptance / rejection / fulfilment ratios and GRN compliance.",
    icon: Award,
    api: "vendorPerformance",
    Renderer: VendorPerformance,
    range: true,
  },
  {
    kind: "funnel",
    label: "Procurement Funnel",
    desc: "PR → RFQ → PO → GRN with conversion at each stage.",
    icon: Filter,
    api: "funnel",
    Renderer: Funnel,
    range: true,
  },
  {
    kind: "cycle_time",
    label: "Cycle Time",
    desc: "How long it takes to get from raised to received.",
    icon: Clock,
    api: "cycleTime",
    Renderer: CycleTime,
    range: true,
  },
];

export default function ReportBuilderPage() {
  const [active, setActive] = useState(REPORTS[0].kind);
  const [range, setRange] = useState(defaultRange);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const current = useMemo(() => REPORTS.find((r) => r.kind === active), [active]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError(null);
      try {
        const res = current.range
          ? await reportsApi[current.api](range)
          : await reportsApi[current.api]();
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.message ?? err?.message ?? "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [active, range.from, range.to, current.api, current.range]);

  const refresh = () => setRange((r) => ({ ...r }));

  const Renderer = current.Renderer;

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title="Reports"
        subtitle="Pre-built procurement analytics — pick a report on the left."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar — report catalog */}
        <aside className="space-y-1.5 lg:sticky lg:top-4 self-start">
          {REPORTS.map((r) => {
            const Icon = r.icon;
            const isActive = active === r.kind;
            return (
              <button
                key={r.kind}
                onClick={() => setActive(r.kind)}
                className={`w-full text-left rounded-lg border p-3 transition flex gap-3 items-start ${
                  isActive
                    ? "bg-primary-soft border-primary"
                    : "bg-surface-container-lowest border-border hover:border-primary"
                }`}
              >
                <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${
                  isActive ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary"
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className={`font-semibold text-sm ${isActive ? "text-primary" : "text-text"}`}>
                    {r.label}
                  </div>
                  <div className="text-xs text-text-muted line-clamp-2">{r.desc}</div>
                </div>
              </button>
            );
          })}
        </aside>

        {/* Main */}
        <main className="space-y-4 min-w-0">
          {current.range && (
            <DateRangeFilter
              from={range.from}
              to={range.to}
              onChange={setRange}
              onRefresh={refresh}
              refreshing={loading}
            />
          )}

          {loading && !data && (
            <div className="bg-surface-container-lowest border border-border rounded-lg p-12 text-center text-text-muted">
              <Loader2 className="h-6 w-6 animate-spin inline mr-2" /> Loading…
            </div>
          )}

          {error && (
            <div className="bg-danger-soft border border-danger/30 rounded-lg p-4 flex gap-3 items-start">
              <AlertTriangle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-bold text-danger">Failed to load report</div>
                <div className="text-text-muted">{error}</div>
              </div>
            </div>
          )}

          {data && !error && <Renderer data={data} />}
        </main>
      </div>
    </div>
  );
}
