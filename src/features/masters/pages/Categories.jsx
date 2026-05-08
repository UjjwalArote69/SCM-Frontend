import { useEffect, useMemo, useState } from "react";
import { Plus, Edit3, Search, Loader2 } from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import StatusPill from "../../../components/data/StatusPill.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import GenericMasterDrawer from "../components/GenericMasterDrawer.jsx";
import useCategoriesStore from "../categories/store.js";
import { useAuthStore } from "../../auth/store.js";

export default function CategoriesPage() {
  const { items, loading, fetchAll, create, update, remove } = useCategoriesStore();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";

  const [drawer, setDrawer] = useState(null);
  const [query, setQuery] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);

  useEffect(() => { fetchAll().catch(() => {}); }, [fetchAll]);

  // Parents are top-level categories (parent === null) or any unique parent value
  const parentOptions = useMemo(() => {
    const set = new Set(["—"]);
    items.forEach((c) => { if (!c.parent) set.add(c.name); });
    return Array.from(set);
  }, [items]);

  const FIELDS = useMemo(() => ([
    { name: "name", label: "Category Name", required: true },
    { name: "parent", label: "Parent Category", type: "select", options: parentOptions },
    { name: "description", label: "Description", type: "textarea" },
    { name: "active", label: "Status", type: "checkbox", checkboxLabel: "Active" },
  ]), [parentOptions]);

  const filtered = useMemo(() => {
    return items.filter((c) => {
      if (activeOnly && !c.active) return false;
      if (query) {
        const q = query.toLowerCase();
        return c.name.toLowerCase().includes(q) || (c.parent ?? "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [items, query, activeOnly]);

  const onSave = async (payload) => {
    if (drawer?.id) await update(drawer.id, payload);
    else await create(payload);
  };

  return (
    <div className="max-w-[1200px] mx-auto">
      <PageHeader
        title="Categories"
        subtitle="Organize items into a catalog hierarchy"
        actions={
          isAdmin && (
            <button onClick={() => setDrawer({})} className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary hover:brightness-110 text-primary-foreground text-sm font-bold">
              <Plus className="h-4 w-4" /> New Category
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
            placeholder="Search categories…"
            className="w-full bg-surface-container-low border-0 border-b-2 border-transparent focus:border-primary pl-10 pr-4 py-2 text-sm text-text outline-none rounded"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-text-muted">
          <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} className="h-4 w-4 rounded text-primary" />
          Active only
        </label>
      </div>

      <div className="bg-surface-container-lowest rounded-lg overflow-hidden border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-container-low text-xs font-semibold text-text-muted uppercase">
              <th className="px-6 py-3 text-left">Name</th>
              <th className="px-6 py-3 text-left">Parent</th>
              <th className="px-6 py-3 text-left">Description</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 w-16 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-text-muted">
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12">
                  <EmptyState
                    title={items.length ? "No matches" : "No categories yet"}
                    description={items.length ? "Try a different search." : isAdmin ? "Click “New Category” to add one." : "Ask an admin to add categories."}
                  />
                </td>
              </tr>
            ) : filtered.map((c) => (
              <tr key={c.id} className="hover:bg-surface-container-low">
                <td className="px-6 py-4 font-medium">{c.name}</td>
                <td className="px-6 py-4 text-text-muted">{c.parent || "—"}</td>
                <td className="px-6 py-4 text-text-muted truncate max-w-md">{c.description || "—"}</td>
                <td className="px-6 py-4"><StatusPill tone={c.active ? "success" : "neutral"}>{c.active ? "Active" : "Inactive"}</StatusPill></td>
                <td className="px-6 py-4 text-right">
                  {isAdmin && (
                    <button onClick={() => setDrawer(c)} className="text-text-muted hover:text-primary"><Edit3 className="h-4 w-4" /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {drawer && isAdmin && (
        <GenericMasterDrawer
          open
          onClose={() => { setDrawer(null); fetchAll().catch(() => {}); }}
          entity="Category"
          fields={FIELDS}
          values={drawer}
          isNew={!drawer?.id}
          onSave={onSave}
          onDelete={drawer?.id ? () => remove(drawer.id) : undefined}
        />
      )}
    </div>
  );
}
