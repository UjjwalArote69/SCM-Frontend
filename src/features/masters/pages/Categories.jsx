import { useState } from "react";
import { Plus, Edit3 } from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import StatusPill from "../../../components/data/StatusPill.jsx";
import GenericMasterDrawer from "../components/GenericMasterDrawer.jsx";

const CATS = [
  { id: 1, name: "Raw Materials", parent: "—", items: 124, active: true },
  { id: 2, name: "Electronics", parent: "—", items: 89, active: true },
  { id: 3, name: "Industrial Motors", parent: "Raw Materials", items: 12, active: true },
  { id: 4, name: "Sensors", parent: "Electronics", items: 34, active: true },
  { id: 5, name: "Packaging", parent: "—", items: 42, active: true },
  { id: 6, name: "Office Supplies", parent: "—", items: 17, active: false },
];

const FIELDS = [
  { name: "name", label: "Category Name", required: true },
  { name: "parent", label: "Parent Category", type: "select", options: ["—", "Raw Materials", "Electronics", "Packaging"] },
  { name: "description", label: "Description", type: "textarea" },
];

export default function CategoriesPage() {
  const [drawer, setDrawer] = useState(null);
  return (
    <div className="max-w-[1200px] mx-auto">
      <PageHeader
        title="Categories"
        subtitle="Organize items into a catalog hierarchy"
        actions={
          <button onClick={() => setDrawer({})} className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-bold">
            <Plus className="h-4 w-4" /> New Category
          </button>
        }
      />
      <div className="bg-surface-container-lowest rounded-lg overflow-hidden border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-container-low text-xs font-semibold text-text-muted uppercase">
              <th className="px-6 py-3 text-left">Name</th>
              <th className="px-6 py-3 text-left">Parent</th>
              <th className="px-6 py-3 text-right">Items</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 w-16 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {CATS.map((c) => (
              <tr key={c.id} className="hover:bg-surface-container-low">
                <td className="px-6 py-4 font-medium">{c.name}</td>
                <td className="px-6 py-4 text-text-muted">{c.parent}</td>
                <td className="px-6 py-4 text-right font-medium">{c.items}</td>
                <td className="px-6 py-4"><StatusPill tone={c.active ? "success" : "neutral"}>{c.active ? "Active" : "Inactive"}</StatusPill></td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => setDrawer(c)} className="text-text-muted hover:text-primary"><Edit3 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {drawer && (
        <GenericMasterDrawer
          open
          onClose={() => setDrawer(null)}
          entity="Category"
          fields={FIELDS}
          values={drawer}
          isNew={!drawer?.id}
        />
      )}
    </div>
  );
}
