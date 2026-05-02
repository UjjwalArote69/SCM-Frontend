import { useState } from "react";
import { Plus, Building2, Edit3 } from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import StatusPill from "../../../components/data/StatusPill.jsx";
import GenericMasterDrawer from "../components/GenericMasterDrawer.jsx";

const COMPANIES = [
  { id: 1, code: "CMP-001", name: "Meka Industries Pvt Ltd", gstin: "09AADCB2230M1Z2", country: "India", bu: 3, active: true },
  { id: 2, code: "CMP-002", name: "Meka Global LLC", gstin: "—", country: "USA", bu: 2, active: true },
  { id: 3, code: "CMP-003", name: "Meka Europe GmbH", gstin: "DE123456789", country: "Germany", bu: 1, active: true },
];

const FIELDS = [
  { name: "code", label: "Company Code", required: true },
  { name: "name", label: "Legal Name", required: true },
  { name: "gstin", label: "GSTIN / Tax ID" },
  { name: "country", label: "Country", type: "select", options: ["India", "USA", "Germany", "Singapore", "UAE"] },
  { name: "address", label: "Registered Address", type: "textarea" },
];

export default function CompaniesPage() {
  const [drawer, setDrawer] = useState(null);
  return (
    <div className="max-w-[1200px] mx-auto">
      <PageHeader
        title="Companies"
        subtitle="Legal entities within your organization"
        actions={
          <button onClick={() => setDrawer({})} className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-bold">
            <Plus className="h-4 w-4" /> New Company
          </button>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {COMPANIES.map((c) => (
          <div key={c.id} onClick={() => setDrawer(c)} className="bg-surface-container-lowest border border-border rounded-lg p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-primary cursor-pointer transition-all duration-200 group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-md bg-primary-soft flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <button className="text-text-muted hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"><Edit3 className="h-4 w-4" /></button>
            </div>
            <div className="text-xs text-info font-medium mb-1">{c.code}</div>
            <h3 className="font-bold text-text mb-1">{c.name}</h3>
            <div className="text-xs text-text-muted mb-3">{c.country} · {c.bu} Business Units</div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-text-muted">{c.gstin}</span>
              <StatusPill tone={c.active ? "success" : "neutral"}>{c.active ? "Active" : "Inactive"}</StatusPill>
            </div>
          </div>
        ))}
      </div>
      {drawer && (
        <GenericMasterDrawer open onClose={() => setDrawer(null)} entity="Company" fields={FIELDS} values={drawer} isNew={!drawer?.id} />
      )}
    </div>
  );
}
