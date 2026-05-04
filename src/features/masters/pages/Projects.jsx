import { useState } from "react";
import { Plus, FolderKanban, Package, Edit3 } from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import StatusPill from "../../../components/data/StatusPill.jsx";
import GenericMasterDrawer from "../components/GenericMasterDrawer.jsx";
import AssignItemsToProjectDrawer from "../components/AssignItemsToProjectDrawer.jsx";

const PROJECTS = [
  { id: 1, code: "PRJ-2024-Falcon", name: "Falcon Assembly Line", start: "Jan 2024", end: "Dec 2024", budget: 2400000, status: "active", tone: "success" },
  { id: 2, code: "PRJ-2024-Eagle", name: "Eagle Expansion", start: "Mar 2024", end: "Jun 2025", budget: 5800000, status: "active", tone: "success" },
  { id: 3, code: "PRJ-2023-Hawk", name: "Hawk Maintenance Program", start: "Apr 2023", end: "Mar 2024", budget: 420000, status: "closing", tone: "warning" },
];

const FIELDS = [
  { name: "code", label: "Project Code", required: true },
  { name: "name", label: "Project Name", required: true },
  { name: "start", label: "Start Date", type: "date" },
  { name: "end", label: "End Date", type: "date" },
  { name: "budget", label: "Budget", type: "number" },
  { name: "description", label: "Description", type: "textarea" },
];

export default function ProjectsPage() {
  const [drawer, setDrawer] = useState(null);
  const [assignDrawer, setAssignDrawer] = useState(null);

  return (
    <div className="max-w-[1200px] mx-auto">
      <PageHeader
        title="Projects"
        subtitle="Active initiatives and their item allocations"
        actions={
          <button onClick={() => setDrawer({})} className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary hover:brightness-110 text-primary-foreground text-sm font-bold">
            <Plus className="h-4 w-4" /> New Project
          </button>
        }
      />
      <div className="space-y-3">
        {PROJECTS.map((p) => (
          <div key={p.id} className="glass-card rounded-2xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-primary transition-all duration-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-md bg-primary-soft flex items-center justify-center shrink-0">
                <FolderKanban className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs text-info font-medium">{p.code}</span>
                  <StatusPill tone={p.tone}>{p.status}</StatusPill>
                </div>
                <h3 className="font-bold text-text mb-1">{p.name}</h3>
                <div className="text-xs text-text-muted">{p.start} → {p.end} · Budget ${p.budget.toLocaleString()}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setAssignDrawer(p)} className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-md text-xs font-semibold hover:bg-surface-container-low">
                  <Package className="h-3.5 w-3.5" /> Assign Items
                </button>
                <button onClick={() => setDrawer(p)} className="text-text-muted hover:text-primary p-2"><Edit3 className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {drawer && (
        <GenericMasterDrawer open onClose={() => setDrawer(null)} entity="Project" fields={FIELDS} values={drawer} isNew={!drawer?.id} />
      )}
      {assignDrawer && (
        <AssignItemsToProjectDrawer open project={assignDrawer} onClose={() => setAssignDrawer(null)} />
      )}
    </div>
  );
}
