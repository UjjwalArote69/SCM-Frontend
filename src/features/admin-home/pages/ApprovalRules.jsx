import { Plus, ArrowRight } from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";

const RULES = [
  { id: 1, name: "PR < $5,000", chain: ["Manager"], active: true },
  { id: 2, name: "PR $5k–$50k", chain: ["Manager", "HOD"], active: true },
  { id: 3, name: "PR > $50,000", chain: ["Manager", "HOD", "CFO"], active: true },
  { id: 4, name: "PR > $500,000", chain: ["Manager", "HOD", "CFO", "CEO"], active: true },
];

export default function ApprovalRulesPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Approval Rules"
        subtitle="Configure multi-stage approval chains based on amount, department, or project"
        actions={
          <button className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-bold">
            <Plus className="h-4 w-4" /> New Rule
          </button>
        }
      />
      <div className="space-y-3">
        {RULES.map((r) => (
          <div key={r.id} className="bg-surface-container-lowest rounded-lg p-5 border border-border flex items-center justify-between">
            <div className="flex-1">
              <div className="font-bold text-text mb-2">{r.name}</div>
              <div className="flex items-center gap-2 flex-wrap">
                {r.chain.map((stage, i) => (
                  <div key={stage} className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-primary-soft text-primary text-xs font-bold">{stage}</span>
                    {i < r.chain.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-text-muted" />}
                  </div>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked={r.active} className="h-4 w-4 rounded text-primary" />
              <span className="text-sm text-text-muted">Active</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
