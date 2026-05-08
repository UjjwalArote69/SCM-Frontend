import { Download, AlertTriangle, Clock } from "lucide-react";
import { BarChart, MultiLineChart, FunnelChart, StackedBar } from "./Charts.jsx";
import { fmtINR, fmtCompactINR, fmtNum, fmtPct, fmtDate, downloadCSV } from "../utils.js";

// ── Shared shells ────────────────────────────────────────────────────────────
function Kpi({ label, value, sub, tone = "default" }) {
  const tones = {
    default: "text-text",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    info: "text-info",
  };
  return (
    <div className="bg-surface-container-lowest border border-border rounded-lg p-4">
      <div className="text-xs uppercase tracking-wide text-text-muted font-semibold mb-1">{label}</div>
      <div className={`text-2xl font-black ${tones[tone] ?? tones.default} tabular-nums`}>{value}</div>
      {sub && <div className="text-xs text-text-muted mt-1">{sub}</div>}
    </div>
  );
}

function Section({ title, children, action }) {
  return (
    <section className="bg-surface-container-lowest border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-text">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function ExportButton({ onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-md text-xs font-semibold hover:bg-surface-container-low">
      <Download className="h-3.5 w-3.5" /> Export CSV
    </button>
  );
}

function EmptyRows({ note = "No matching records." }) {
  return <div className="text-sm text-text-muted py-6 text-center">{note}</div>;
}

// ── 1. Spend by Vendor ───────────────────────────────────────────────────────
export function SpendByVendor({ data }) {
  const rows = data.rows ?? [];
  const top = rows.slice(0, 10);
  const cols = [
    { key: "vendor", label: "Vendor" },
    { key: "po_count", label: "POs" },
    { key: "total_amount", label: "Total spend (₹)", format: (v) => Number(v).toFixed(2) },
    { key: "avg_order", label: "Avg order (₹)", format: (v) => Number(v).toFixed(2) },
    { key: "last_order_date", label: "Last order" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Total spend" value={fmtCompactINR(data.totals?.total_amount)} />
        <Kpi label="Active vendors" value={fmtNum(data.totals?.vendor_count)} />
        <Kpi label="POs in window" value={fmtNum(data.totals?.po_count)} />
        <Kpi label="Top vendor share" value={rows[0] && data.totals?.total_amount ? fmtPct(rows[0].total_amount / data.totals.total_amount * 100) : "—"}
             sub={rows[0]?.vendor} />
      </div>

      <Section title={`Top ${Math.min(10, rows.length)} vendors by spend`}>
        <BarChart
          data={top.map((r) => ({ label: r.vendor, value: r.total_amount, sublabel: `${r.po_count} POs` }))}
          formatValue={fmtCompactINR}
        />
      </Section>

      <Section title={`All vendors (${rows.length})`} action={rows.length > 0 && <ExportButton onClick={() => downloadCSV(`spend-by-vendor.csv`, cols, rows)} />}>
        {rows.length === 0 ? <EmptyRows /> : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-text-muted border-b border-border">
              <tr>
                <th className="text-left py-2">Vendor</th>
                <th className="text-right py-2">POs</th>
                <th className="text-right py-2">Total spend</th>
                <th className="text-right py-2">Avg order</th>
                <th className="text-right py-2">Last order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.vendor}>
                  <td className="py-2 font-medium">{r.vendor}</td>
                  <td className="py-2 text-right tabular-nums">{r.po_count}</td>
                  <td className="py-2 text-right tabular-nums font-semibold">{fmtINR(r.total_amount)}</td>
                  <td className="py-2 text-right tabular-nums text-text-muted">{fmtINR(r.avg_order)}</td>
                  <td className="py-2 text-right text-text-muted">{fmtDate(r.last_order_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}

// ── 2. Spend by Department ───────────────────────────────────────────────────
export function SpendByDepartment({ data }) {
  const rows = data.rows ?? [];
  const cols = [
    { key: "department", label: "Department" },
    { key: "po_count", label: "POs" },
    { key: "amount", label: "Spend (₹)", format: (v) => Number(v).toFixed(2) },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Kpi label="Total spend" value={fmtCompactINR(data.totals?.amount)} />
        <Kpi label="Departments active" value={fmtNum(rows.length)} />
        <Kpi label="Largest dept" value={rows[0]?.department ?? "—"} sub={rows[0] ? fmtCompactINR(rows[0].amount) : ""} />
      </div>

      <Section title="Spend by department">
        <BarChart
          data={rows.map((r) => ({ label: r.department, value: r.amount, sublabel: `${r.po_count} POs` }))}
          formatValue={fmtCompactINR}
        />
      </Section>

      <Section title="Detail" action={rows.length > 0 && <ExportButton onClick={() => downloadCSV("spend-by-department.csv", cols, rows)} />}>
        {rows.length === 0 ? <EmptyRows /> : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-text-muted border-b border-border">
              <tr>
                <th className="text-left py-2">Department</th>
                <th className="text-right py-2">POs</th>
                <th className="text-right py-2">Spend</th>
                <th className="text-right py-2">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => {
                const share = data.totals?.amount ? (r.amount / data.totals.amount) * 100 : 0;
                return (
                  <tr key={r.department}>
                    <td className="py-2 font-medium">{r.department}</td>
                    <td className="py-2 text-right tabular-nums">{r.po_count}</td>
                    <td className="py-2 text-right tabular-nums font-semibold">{fmtINR(r.amount)}</td>
                    <td className="py-2 text-right text-text-muted">{fmtPct(share)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}

// ── 3. Spend by Category ─────────────────────────────────────────────────────
export function SpendByCategory({ data }) {
  const rows = data.rows ?? [];
  const cols = [
    { key: "category", label: "Category" },
    { key: "line_count", label: "Line items" },
    { key: "qty_total", label: "Total qty" },
    { key: "amount", label: "Spend (₹)", format: (v) => Number(v).toFixed(2) },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Kpi label="Total spend" value={fmtCompactINR(data.totals?.amount)} />
        <Kpi label="Categories" value={fmtNum(data.totals?.category_count)} />
        <Kpi label="Top category" value={rows[0]?.category ?? "—"} sub={rows[0] ? fmtCompactINR(rows[0].amount) : ""} />
      </div>

      <Section title="Spend by category">
        <BarChart
          data={rows.slice(0, 12).map((r) => ({ label: r.category, value: r.amount, sublabel: `${r.line_count} lines` }))}
          formatValue={fmtCompactINR}
        />
      </Section>

      <Section title="All categories" action={rows.length > 0 && <ExportButton onClick={() => downloadCSV("spend-by-category.csv", cols, rows)} />}>
        {rows.length === 0 ? <EmptyRows /> : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-text-muted border-b border-border">
              <tr>
                <th className="text-left py-2">Category</th>
                <th className="text-right py-2">Lines</th>
                <th className="text-right py-2">Qty</th>
                <th className="text-right py-2">Spend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.category}>
                  <td className="py-2 font-medium">{r.category}</td>
                  <td className="py-2 text-right tabular-nums">{r.line_count}</td>
                  <td className="py-2 text-right tabular-nums">{fmtNum(r.qty_total)}</td>
                  <td className="py-2 text-right tabular-nums font-semibold">{fmtINR(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}

// ── 4. Monthly Trend ─────────────────────────────────────────────────────────
export function MonthlyTrend({ data }) {
  const rows = data.rows ?? [];
  const labels = rows.map((r) => r.label);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Kpi label="PRs raised" value={fmtNum(data.totals?.pr_count)} />
        <Kpi label="POs issued" value={fmtNum(data.totals?.po_count)} />
        <Kpi label="₹ committed" value={fmtCompactINR(data.totals?.po_amount)} />
      </div>

      <Section title="PR & PO volume by month">
        <MultiLineChart
          labels={labels}
          series={[
            { name: "PRs raised", data: rows.map((r) => r.pr_count), colour: "#2563eb", axis: "left" },
            { name: "POs issued", data: rows.map((r) => r.po_count), colour: "#dc2626", axis: "left" },
          ]}
          formatLeft={(n) => n}
        />
      </Section>

      <Section title="Spend by month (₹)">
        <BarChart
          data={rows.map((r) => ({ label: r.label, value: r.po_amount, sublabel: `${r.po_count} POs` }))}
          formatValue={fmtCompactINR}
        />
      </Section>

      <Section title="Monthly detail" action={rows.length > 0 && <ExportButton onClick={() => downloadCSV("monthly-trend.csv", [
        { key: "month", label: "Month" }, { key: "pr_count", label: "PRs" }, { key: "po_count", label: "POs" }, { key: "po_amount", label: "Spend (₹)", format: (v) => Number(v).toFixed(2) },
      ], rows)} />}>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-text-muted border-b border-border">
            <tr>
              <th className="text-left py-2">Month</th>
              <th className="text-right py-2">PRs</th>
              <th className="text-right py-2">POs</th>
              <th className="text-right py-2">Spend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.month}>
                <td className="py-2 font-medium">{r.label}</td>
                <td className="py-2 text-right tabular-nums">{r.pr_count}</td>
                <td className="py-2 text-right tabular-nums">{r.po_count}</td>
                <td className="py-2 text-right tabular-nums font-semibold">{fmtINR(r.po_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}

// ── 5. Pending Approvals (live snapshot) ────────────────────────────────────
export function PendingApprovals({ data }) {
  const ageCls = (d) => (d > 14 ? "text-danger" : d > 7 ? "text-warning" : "text-text");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Pending PRs" value={fmtNum(data.totals?.pr_count)} tone={data.totals?.pr_count ? "warning" : "default"} />
        <Kpi label="Pending POs" value={fmtNum(data.totals?.po_count)} tone={data.totals?.po_count ? "warning" : "default"} />
        <Kpi label="Pending RFQs" value={fmtNum(data.totals?.rfq_count)} />
        <Kpi label="Pending payments" value={fmtNum(data.totals?.payment_count)} sub={fmtCompactINR(data.totals?.pending_amount)} />
      </div>

      <Section title={`Purchase Requests (${data.pr?.length ?? 0})`}>
        {!data.pr?.length ? <EmptyRows note="No pending PRs." /> : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-text-muted border-b border-border">
              <tr>
                <th className="text-left py-2">Number</th>
                <th className="text-left py-2">Title</th>
                <th className="text-left py-2">Department</th>
                <th className="text-left py-2">Stage</th>
                <th className="text-right py-2">Value</th>
                <th className="text-right py-2">Age</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.pr.map((r) => (
                <tr key={r.number}>
                  <td className="py-2 font-mono text-xs">{r.number}</td>
                  <td className="py-2">{r.title}</td>
                  <td className="py-2 text-text-muted">{r.department}</td>
                  <td className="py-2 uppercase text-xs font-semibold text-info">{r.stage}</td>
                  <td className="py-2 text-right tabular-nums">{fmtINR(r.amount)}</td>
                  <td className={`py-2 text-right tabular-nums font-semibold ${ageCls(r.age_days)}`}>{r.age_days}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title={`Purchase Orders awaiting internal approval (${data.po?.length ?? 0})`}>
        {!data.po?.length ? <EmptyRows note="No pending POs." /> : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-text-muted border-b border-border">
              <tr>
                <th className="text-left py-2">Number</th>
                <th className="text-left py-2">Vendor</th>
                <th className="text-left py-2">Stage</th>
                <th className="text-right py-2">Total</th>
                <th className="text-right py-2">Age</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.po.map((r) => (
                <tr key={r.number}>
                  <td className="py-2 font-mono text-xs">{r.number}</td>
                  <td className="py-2">{r.vendor}</td>
                  <td className="py-2 uppercase text-xs font-semibold text-info">{r.stage}</td>
                  <td className="py-2 text-right tabular-nums font-semibold">{fmtINR(r.amount)}</td>
                  <td className={`py-2 text-right tabular-nums font-semibold ${ageCls(r.age_days)}`}>{r.age_days}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {data.payment?.length > 0 && (
        <Section title={`Payments awaiting approval (${data.payment.length})`}>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-text-muted border-b border-border">
              <tr>
                <th className="text-left py-2">Number</th>
                <th className="text-left py-2">Vendor</th>
                <th className="text-left py-2">Stage</th>
                <th className="text-right py-2">Amount</th>
                <th className="text-right py-2">Age</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.payment.map((r) => (
                <tr key={r.number}>
                  <td className="py-2 font-mono text-xs">{r.number}</td>
                  <td className="py-2">{r.vendor}</td>
                  <td className="py-2 uppercase text-xs font-semibold text-info">{r.stage}</td>
                  <td className="py-2 text-right tabular-nums font-semibold">{fmtINR(r.amount)}</td>
                  <td className={`py-2 text-right tabular-nums font-semibold ${ageCls(r.age_days)}`}>{r.age_days}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
    </div>
  );
}

// ── 6. Vendor Performance ────────────────────────────────────────────────────
export function VendorPerformance({ data }) {
  const rows = data.rows ?? [];
  const cols = [
    { key: "vendor", label: "Vendor" },
    { key: "sent", label: "Sent" },
    { key: "accepted", label: "Accepted" },
    { key: "fulfilled", label: "Fulfilled" },
    { key: "rejected", label: "Rejected" },
    { key: "accept_rate", label: "Accept %" },
    { key: "grn_compliance", label: "GRN compliance %" },
    { key: "amount", label: "Total ₹", format: (v) => Number(v).toFixed(2) },
  ];

  return (
    <div className="space-y-5">
      <Section title={`${rows.length} vendors evaluated`} action={rows.length > 0 && <ExportButton onClick={() => downloadCSV("vendor-performance.csv", cols, rows)} />}>
        {rows.length === 0 ? <EmptyRows /> : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.vendor} className="border border-border rounded-lg p-4 hover:border-primary transition">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-text">{r.vendor}</h4>
                  <span className="text-sm font-semibold tabular-nums">{fmtINR(r.amount)}</span>
                </div>
                <StackedBar segments={[
                  { label: "Fulfilled", value: r.fulfilled, colour: "#16a34a" },
                  { label: "Accepted", value: r.accepted, colour: "#2563eb" },
                  { label: "Pending", value: r.pending, colour: "#a3a3a3" },
                  { label: "Rejected", value: r.rejected, colour: "#dc2626" },
                ]} />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
                  <Stat label="Total POs" value={fmtNum(r.sent)} />
                  <Stat label="Accept rate" value={fmtPct(r.accept_rate)} tone={r.accept_rate > 85 ? "success" : r.accept_rate > 60 ? "default" : "warning"} />
                  <Stat label="Reject rate" value={fmtPct(r.reject_rate)} tone={r.reject_rate > 10 ? "danger" : "default"} />
                  <Stat label="GRN compliance" value={r.grn_compliance == null ? "—" : fmtPct(r.grn_compliance)} tone={r.grn_compliance != null && r.grn_compliance < 80 ? "warning" : "default"} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Stat({ label, value, tone = "default" }) {
  const tones = { default: "text-text", success: "text-success", warning: "text-warning", danger: "text-danger" };
  return (
    <div>
      <div className="text-text-muted uppercase tracking-wide">{label}</div>
      <div className={`font-bold tabular-nums ${tones[tone]}`}>{value}</div>
    </div>
  );
}

// ── 7. Procurement Funnel ────────────────────────────────────────────────────
export function Funnel({ data }) {
  const stages = data.stages ?? [];

  // Find biggest dropoff
  let worstDropoff = null;
  for (let i = 1; i < stages.length; i++) {
    const prev = stages[i - 1].count;
    if (prev === 0) continue;
    const ratio = stages[i].count / prev;
    if (ratio < 0.6 && (!worstDropoff || ratio < worstDropoff.ratio)) {
      worstDropoff = { from: stages[i - 1].label, to: stages[i].label, ratio };
    }
  }

  return (
    <div className="space-y-5">
      {worstDropoff && (
        <div className="bg-warning-soft border border-warning/30 rounded-lg p-3 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-bold text-warning">Biggest dropoff:</span>{" "}
            <span className="text-text">{worstDropoff.from} → {worstDropoff.to}</span>{" "}
            <span className="text-text-muted">({Math.round(worstDropoff.ratio * 100)}% conversion)</span>
          </div>
        </div>
      )}

      <Section title="End-to-end conversion">
        <FunnelChart stages={stages} />
      </Section>
    </div>
  );
}

// ── 8. Cycle Time ────────────────────────────────────────────────────────────
export function CycleTime({ data }) {
  const stages = data.stages ?? [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {stages.map((s) => (
          <div key={s.key} className="bg-surface-container-lowest border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-primary" />
              <div className="text-xs uppercase tracking-wide text-text-muted font-semibold">{s.label}</div>
            </div>
            {s.count === 0 ? (
              <div className="text-text-subtle italic">No completions in this window.</div>
            ) : (
              <>
                <div className="text-3xl font-black text-text tabular-nums">{s.avg}<span className="text-base font-normal text-text-muted ml-1">d avg</span></div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                  <Stat label="Median" value={`${s.median}d`} />
                  <Stat label="Fastest" value={`${s.min}d`} tone="success" />
                  <Stat label="Slowest" value={`${s.max}d`} tone={s.max > 14 ? "danger" : "default"} />
                </div>
                <div className="text-xs text-text-muted mt-2">{s.count} sample{s.count === 1 ? "" : "s"}</div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
