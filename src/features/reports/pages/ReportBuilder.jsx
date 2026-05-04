import { useState } from "react";
import { BarChart3, Download, Play } from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";

export default function ReportBuilderPage() {
  const [ran, setRan] = useState(false);

  return (
    <div className="max-w-[1200px] mx-auto">
      <PageHeader
        title="Report Builder"
        subtitle="Build custom reports across PRs, POs, and Invoices"
        actions={
          ran && (
            <button className="flex items-center gap-2 px-4 py-2 rounded-md border border-border text-text text-sm font-semibold hover:bg-surface-container-low">
              <Download className="h-4 w-4" /> Export CSV
            </button>
          )
        }
      />

      <div className="bg-surface-container-low p-6 rounded-lg mb-6">
        <h2 className="text-lg font-bold text-text mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Entity</label>
            <select className="w-full bg-surface-container-lowest border-0 border-b-2 border-outline-variant focus:border-primary px-3 py-2 text-sm outline-none"><option>Purchase Requests</option><option>Purchase Orders</option><option>Invoices</option></select></div>
          <div><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">From</label><input type="date" className="w-full bg-surface-container-lowest border-0 border-b-2 border-outline-variant focus:border-primary px-3 py-2 text-sm outline-none" /></div>
          <div><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">To</label><input type="date" className="w-full bg-surface-container-lowest border-0 border-b-2 border-outline-variant focus:border-primary px-3 py-2 text-sm outline-none" /></div>
          <div><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Group By</label>
            <select className="w-full bg-surface-container-lowest border-0 border-b-2 border-outline-variant focus:border-primary px-3 py-2 text-sm outline-none"><option>Department</option><option>Vendor</option><option>Month</option></select></div>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={() => setRan(true)} className="flex items-center gap-2 px-5 py-2 bg-primary hover:brightness-110 text-primary-foreground rounded-md font-bold text-sm">
            <Play className="h-4 w-4" /> Run Report
          </button>
        </div>
      </div>

      {!ran ? (
        <div className="bg-surface-container-lowest rounded-lg p-16 text-center border border-border">
          <BarChart3 className="h-16 w-16 text-text-subtle mx-auto mb-4" strokeWidth={1.25} />
          <h3 className="text-lg font-bold text-text mb-2">No report yet</h3>
          <p className="text-text-muted">Adjust the filters above and click <strong>Run Report</strong> to see results.</p>
        </div>
      ) : (
        <section className="bg-surface-container-lowest rounded-lg p-6 border border-border">
          <h3 className="text-lg font-bold text-text mb-4">Results — 23 records</h3>
          <div className="h-48 bg-surface-container-low rounded flex items-end gap-2 p-4 mb-6">
            {[60, 30, 80, 45, 70, 55, 90].map((h, i) => (
              <div key={i} className="flex-1 bg-primary rounded-t" style={{ height: `${h}%` }} />
            ))}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs font-semibold text-text-muted uppercase border-b border-border">
                <th className="py-2 text-left">Group</th>
                <th className="py-2 text-right">Count</th>
                <th className="py-2 text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[{ g: "Engineering", c: 8, v: 142500 }, { g: "Operations", c: 6, v: 89200 }, { g: "IT", c: 9, v: 65400 }].map((r) => (
                <tr key={r.g}><td className="py-3">{r.g}</td><td className="py-3 text-right">{r.c}</td><td className="py-3 text-right font-medium">${r.v.toLocaleString()}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
