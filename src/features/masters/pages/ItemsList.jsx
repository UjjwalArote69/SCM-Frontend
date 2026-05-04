import { useEffect, useState } from "react";
import { Plus, Upload, Edit3, Trash2, Search } from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import EditItemDrawer from "../components/EditItemDrawer.jsx";
import ImportItemsModal from "../components/ImportItemsModal.jsx";
import { useItemsStore } from "../items/store.js";
import { useToast } from "../../../hooks/useToast.jsx";
import RefreshButton from "../../../components/data/RefreshButton.jsx";
import Skeleton from "../../../components/feedback/Skeleton.jsx";

function currency(n) {
  const v = Number(n ?? 0);
  return `₹${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function SkRow() {
  return (
    <tr>
      <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
      <td className="px-6 py-4"><Skeleton className="h-4 w-44" /></td>
      <td className="px-6 py-4"><Skeleton className="h-3 w-20" /></td>
      <td className="px-6 py-4"><Skeleton className="h-3 w-16" /></td>
      <td className="px-6 py-4"><Skeleton className="h-3 w-12" /></td>
      <td className="px-6 py-4 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
      <td className="px-6 py-4 text-center"><Skeleton className="h-5 w-16 rounded-full mx-auto" /></td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-4" />
        </div>
      </td>
    </tr>
  );
}

export default function ItemsListPage() {
  const items = useItemsStore((s) => s.items);
  const loading = useItemsStore((s) => s.loading);
  const fetchAll = useItemsStore((s) => s.fetchAll);
  const remove = useItemsStore((s) => s.remove);
  const [drawer, setDrawer] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [query, setQuery] = useState("");
  const toast = useToast();

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filtered = items.filter((it) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      it.code.toLowerCase().includes(q) ||
      it.name.toLowerCase().includes(q) ||
      (it.category ?? "").toLowerCase().includes(q)
    );
  });

  const handleDelete = async (code) => {
    if (!window.confirm(`Delete item ${code}?`)) return;
    try {
      await remove(code);
      toast.success(`Item ${code} deleted`);
    } catch (err) {
      toast.error(err?.message ?? "Could not delete item");
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto">
      <PageHeader
        title="Items Master"
        subtitle="Manage all items and SKUs in the catalog"
        actions={
          <>
            <RefreshButton onRefresh={fetchAll} loading={loading} />
            <button
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-md border border-border text-text text-sm font-semibold hover:bg-surface-container-low"
            >
              <Upload className="h-4 w-4" /> Import
            </button>
            <button
              onClick={() => setDrawer({})}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary hover:brightness-110 text-primary-foreground text-sm font-bold"
            >
              <Plus className="h-4 w-4" /> New Item
            </button>
          </>
        }
      />

      <div className="mb-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by code, name, category…"
          className="w-full bg-surface-container-lowest border-0 border-b-2 border-outline-variant focus:border-primary focus:ring-0 pl-10 pr-3 py-2 text-sm text-text outline-none"
        />
      </div>

      <div className="bg-surface-container-lowest rounded-lg overflow-hidden border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-container-low text-xs font-semibold text-text-muted uppercase">
              <th className="px-6 py-3 text-left">Code</th>
              <th className="px-6 py-3 text-left">Name</th>
              <th className="px-6 py-3 text-left">Category</th>
              <th className="px-6 py-3 text-left">HSN</th>
              <th className="px-6 py-3 text-left">UOM</th>
              <th className="px-6 py-3 text-right">Std. Price</th>
              <th className="px-6 py-3 text-center">Active</th>
              <th className="px-6 py-3 w-28 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && items.length === 0 ? (
              Array.from({ length: 6 }).map((_, i) => <SkRow key={i} />)
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-16 text-center text-text-muted text-sm">
                  {items.length === 0
                    ? "No items yet. Click New Item to add your first one."
                    : "No items match your search."}
                </td>
              </tr>
            ) : (
              filtered.map((it) => (
                <tr key={it.code} className="hover:bg-surface-container-low">
                  <td className="px-6 py-4 font-mono font-medium text-info">{it.code}</td>
                  <td className="px-6 py-4 font-medium">{it.name}</td>
                  <td className="px-6 py-4 text-text-muted">{it.category ?? "—"}</td>
                  <td className="px-6 py-4 font-mono text-text-muted">{it.hsn_code ?? "—"}</td>
                  <td className="px-6 py-4 text-text-muted">{it.uom}</td>
                  <td className="px-6 py-4 text-right font-medium">{currency(it.price)}</td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        it.active
                          ? "bg-success-soft text-success"
                          : "bg-surface-container-high text-text-muted"
                      }`}
                    >
                      {it.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setDrawer(it)}
                        aria-label={`Edit ${it.code}`}
                        className="text-text-muted hover:text-primary p-1"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(it.code)}
                        aria-label={`Delete ${it.code}`}
                        className="text-text-muted hover:text-danger p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <EditItemDrawer
        open={!!drawer}
        item={drawer}
        onClose={() => setDrawer(null)}
      />
      <ImportItemsModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
