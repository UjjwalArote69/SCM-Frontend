import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Download, Warehouse } from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import StatusPill from "../../../components/data/StatusPill.jsx";
import { useToast } from "../../../hooks/useToast.jsx";

const ROWS = [
  { code: "ITM-9021", name: "Industrial Servo Motor HZ-500", category: "Motors", stock: 48, min: 20, unit: "EA", location: "Warehouse 4 · Rack B-2" },
  { code: "ITM-9025", name: "Reinforced Conveyor Belt (50m)", category: "Belts", stock: 12, min: 10, unit: "RL", location: "Warehouse 4 · Rack C-1" },
  { code: "ITM-1044", name: "Precision Sensor Array", category: "Sensors", stock: 4, min: 10, unit: "SET", location: "Warehouse 2 · Rack A-5" },
];

export default function InventoryListPage() {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const filtered = query
    ? ROWS.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()) || r.code.toLowerCase().includes(query.toLowerCase()))
    : ROWS;
  return (
    <div className="max-w-[1200px] mx-auto">
      <PageHeader
        title="Inventory"
        subtitle="Current stock levels across all warehouses"
        actions={
          <>
            <button onClick={() => toast.success(`Exported ${filtered.length} items`)} className="flex items-center gap-2 px-4 py-2 rounded-md border border-border text-text text-sm font-semibold hover:bg-surface-container-low">
              <Download className="h-4 w-4" /> Export
            </button>
            <Link to="/app/inventory/receive" className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-bold">
              <Warehouse className="h-4 w-4" /> Receive Stock
            </Link>
          </>
        }
      />
      <div className="bg-surface-container-lowest p-4 rounded-lg mb-6 flex gap-3 items-center border border-border">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search items…" className="w-full bg-surface-container-low border-0 border-b-2 border-transparent focus:border-primary pl-10 pr-4 py-2 text-sm text-text outline-none rounded" />
        </div>
      </div>
      <div className="bg-surface-container-lowest rounded-lg overflow-hidden border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-container-low text-xs font-semibold text-text-muted uppercase">
              <th className="px-6 py-3 text-left">Code</th>
              <th className="px-6 py-3 text-left">Item</th>
              <th className="px-6 py-3 text-left">Category</th>
              <th className="px-6 py-3 text-right">On Hand</th>
              <th className="px-6 py-3 text-right">Min</th>
              <th className="px-6 py-3 text-left">Location</th>
              <th className="px-6 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((r) => {
              const low = r.stock < r.min;
              return (
                <tr key={r.code} className="hover:bg-surface-container-low">
                  <td className="px-6 py-4 font-medium text-info">{r.code}</td>
                  <td className="px-6 py-4 font-medium">{r.name}</td>
                  <td className="px-6 py-4 text-text-muted">{r.category}</td>
                  <td className={`px-6 py-4 text-right font-semibold ${low ? "text-danger" : ""}`}>{r.stock} {r.unit}</td>
                  <td className="px-6 py-4 text-right text-text-muted">{r.min}</td>
                  <td className="px-6 py-4 text-text-muted">{r.location}</td>
                  <td className="px-6 py-4"><StatusPill tone={low ? "danger" : "success"}>{low ? "Low" : "In Stock"}</StatusPill></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
