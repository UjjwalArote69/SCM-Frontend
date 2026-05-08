import { useEffect, useMemo, useState } from "react";
import { Plus, Building2, Edit3, Search, Loader2 } from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import StatusPill from "../../../components/data/StatusPill.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import GenericMasterDrawer from "../components/GenericMasterDrawer.jsx";
import useCompaniesStore from "../companies/store.js";
import { useAuthStore } from "../../auth/store.js";

const COUNTRIES = ["", "India", "USA", "Germany", "Singapore", "UAE", "UK", "Japan"];

export default function CompaniesPage() {
  const { items, loading, fetchAll, create, update, remove } = useCompaniesStore();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";

  const [drawer, setDrawer] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => { fetchAll().catch(() => {}); }, [fetchAll]);

  const FIELDS = useMemo(() => ([
    { name: "code", label: "Company Code", required: true, lockOnEdit: true, placeholder: "CMP-001" },
    { name: "name", label: "Legal Name", required: true },
    { name: "gstin", label: "GSTIN / Tax ID" },
    { name: "country", label: "Country", type: "select", options: COUNTRIES },
    { name: "address", label: "Registered Address", type: "textarea" },
    { name: "active", label: "Status", type: "checkbox", checkboxLabel: "Active" },
  ]), []);

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.gstin ?? "").toLowerCase().includes(q),
    );
  }, [items, query]);

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
        title="Companies"
        subtitle="Legal entities within your organization"
        actions={
          isAdmin && (
            <button onClick={() => setDrawer({})} className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary hover:brightness-110 text-primary-foreground text-sm font-bold">
              <Plus className="h-4 w-4" /> New Company
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
            placeholder="Search companies…"
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
          title={items.length ? "No matches" : "No companies yet"}
          description={items.length ? "Try a different search." : isAdmin ? "Click “New Company” to add the first one." : "Ask an admin to add companies."}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div
              key={c.code}
              onClick={() => isAdmin && setDrawer(c)}
              className={`glass-card rounded-2xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-primary transition-all duration-200 group ${isAdmin ? "cursor-pointer" : ""}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-md bg-primary-soft flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                {isAdmin && (
                  <button className="text-text-muted hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"><Edit3 className="h-4 w-4" /></button>
                )}
              </div>
              <div className="text-xs text-info font-medium mb-1">{c.code}</div>
              <h3 className="font-bold text-text mb-1">{c.name}</h3>
              <div className="text-xs text-text-muted mb-3">{c.country || "—"}</div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-text-muted">{c.gstin || "—"}</span>
                <StatusPill tone={c.active ? "success" : "neutral"}>{c.active ? "Active" : "Inactive"}</StatusPill>
              </div>
            </div>
          ))}
        </div>
      )}

      {drawer && isAdmin && (
        <GenericMasterDrawer
          open
          onClose={() => { setDrawer(null); fetchAll().catch(() => {}); }}
          entity="Company"
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
