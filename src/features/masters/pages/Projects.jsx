import { useEffect, useMemo, useState } from "react";
import { Plus, FolderKanban, Edit3, Search, Loader2 } from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import StatusPill from "../../../components/data/StatusPill.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import GenericMasterDrawer from "../components/GenericMasterDrawer.jsx";
import useProjectsStore from "../projects/store.js";
import { useAuthStore } from "../../auth/store.js";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "closing", label: "Closing" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On Hold" },
];

const TONES = { active: "success", closing: "warning", completed: "neutral", on_hold: "info" };

const fmtDate = (s) => {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("en-IN", { month: "short", year: "numeric" }); }
  catch { return s; }
};
const fmtBudget = (n) => {
  const v = Number(n ?? 0);
  if (!v) return "—";
  return `₹${v.toLocaleString("en-IN")}`;
};

export default function ProjectsPage() {
  const { items, loading, fetchAll, create, update, remove } = useProjectsStore();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";

  const [drawer, setDrawer] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => { fetchAll().catch(() => {}); }, [fetchAll]);

  const FIELDS = useMemo(() => ([
    { name: "code", label: "Project Code", required: true, lockOnEdit: true, placeholder: "PRJ-2024-Falcon" },
    { name: "name", label: "Project Name", required: true },
    { name: "start_date", label: "Start Date", type: "date" },
    { name: "end_date", label: "End Date", type: "date" },
    { name: "budget", label: "Budget (₹)", type: "number", placeholder: "0" },
    { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
    { name: "description", label: "Description", type: "textarea" },
    { name: "active", label: "Visibility", type: "checkbox", checkboxLabel: "Active" },
  ]), []);

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
  }, [items, query]);

  const toEditValues = (p) => ({
    ...p,
    // HTML date inputs need YYYY-MM-DD
    start_date: p.start_date ? String(p.start_date).slice(0, 10) : "",
    end_date: p.end_date ? String(p.end_date).slice(0, 10) : "",
  });

  const onSave = async (payload) => {
    if (drawer?.code) {
      const { code, ...rest } = payload;
      await update(drawer.code, rest);
    } else {
      await create(payload);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto">
      <PageHeader
        title="Projects"
        subtitle="Active initiatives and budgets"
        actions={
          isAdmin && (
            <button onClick={() => setDrawer({})} className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary hover:brightness-110 text-primary-foreground text-sm font-bold">
              <Plus className="h-4 w-4" /> New Project
            </button>
          )
        }
      />

      <div className="bg-surface-container-lowest p-4 rounded-lg mb-6 flex gap-3 items-center border border-border">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects…"
            className="w-full bg-surface-container-low border-0 border-b-2 border-transparent focus:border-primary pl-10 pr-4 py-2 text-sm text-text outline-none rounded"
          />
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={items.length ? "No matches" : "No projects yet"}
          description={items.length ? "Try a different search." : isAdmin ? "Click “New Project” to add the first one." : "Ask an admin to add projects."}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <div key={p.code} className="glass-card rounded-2xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-primary transition-all duration-200">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-md bg-primary-soft flex items-center justify-center shrink-0">
                  <FolderKanban className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs text-info font-medium">{p.code}</span>
                    <StatusPill tone={TONES[p.status] ?? "neutral"}>{(p.status ?? "—").replace("_", " ")}</StatusPill>
                  </div>
                  <h3 className="font-bold text-text mb-1">{p.name}</h3>
                  <div className="text-xs text-text-muted">
                    {fmtDate(p.start_date)} → {fmtDate(p.end_date)} · Budget {fmtBudget(p.budget)}
                  </div>
                  {p.description && (
                    <div className="text-xs text-text-muted mt-1 truncate">{p.description}</div>
                  )}
                </div>
                {isAdmin && (
                  <button onClick={() => setDrawer(toEditValues(p))} className="text-text-muted hover:text-primary p-2"><Edit3 className="h-4 w-4" /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {drawer && isAdmin && (
        <GenericMasterDrawer
          open
          onClose={() => { setDrawer(null); fetchAll().catch(() => {}); }}
          entity="Project"
          fields={FIELDS}
          values={drawer}
          isNew={!drawer?.code}
          onSave={onSave}
          onDelete={drawer?.code ? () => remove(drawer.code) : undefined}
        />
      )}
    </div>
  );
}
