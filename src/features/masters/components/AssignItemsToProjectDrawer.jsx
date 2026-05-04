import { useState } from "react";
import { Search, Check } from "lucide-react";
import Drawer from "../../../components/feedback/Drawer.jsx";
import { useToast } from "../../../hooks/useToast.jsx";

const ITEMS = [
  { code: "ITM-9021", name: "Industrial Servo Motor HZ-500" },
  { code: "ITM-9025", name: "Reinforced Conveyor Belt (50m)" },
  { code: "ITM-1044", name: "Precision Sensor Array" },
  { code: "ITM-2200", name: "Steel Plate 2mm (1m²)" },
];

export default function AssignItemsToProjectDrawer({ open, project, onClose }) {
  const [selected, setSelected] = useState(new Set());
  const [query, setQuery] = useState("");
  const toast = useToast();
  const save = () => {
    toast.success(`${selected.size} items assigned to ${project?.name ?? "project"}`);
    onClose?.();
  };
  const filtered = query ? ITEMS.filter((i) => i.name.toLowerCase().includes(query.toLowerCase()) || i.code.toLowerCase().includes(query.toLowerCase())) : ITEMS;
  const toggle = (code) => {
    const next = new Set(selected);
    next.has(code) ? next.delete(code) : next.add(code);
    setSelected(next);
  };

  return (
    <Drawer
      open={open}
      title={`Assign Items to ${project?.name ?? "Project"}`}
      onClose={onClose}
      footer={
        <>
          <span className="text-sm text-text-muted mr-auto">{selected.size} selected</span>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-text border border-border rounded-md hover:bg-surface-container-low">Cancel</button>
          <button onClick={save} disabled={selected.size === 0} className="px-6 py-2 text-sm font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-md disabled:bg-surface-container-high disabled:text-text-muted disabled:cursor-not-allowed">Assign {selected.size > 0 && `(${selected.size})`}</button>
        </>
      }
    >
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search items…" className="w-full bg-surface-container-low border-0 border-b-2 border-transparent focus:border-primary pl-10 pr-4 py-2 text-sm outline-none rounded" />
      </div>
      <div className="space-y-2">
        {filtered.map((it) => {
          const on = selected.has(it.code);
          return (
            <button key={it.code} onClick={() => toggle(it.code)} className={`w-full text-left flex items-center gap-3 p-3 rounded-md border transition-colors ${on ? "bg-primary-soft border-primary" : "bg-surface-container-low border-border hover:bg-surface-container"}`}>
              <div className={`w-5 h-5 rounded flex items-center justify-center ${on ? "bg-primary text-primary-foreground" : "border-2 border-border"}`}>
                {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </div>
              <div className="flex-1">
                <div className="font-medium text-text">{it.name}</div>
                <div className="text-xs text-info">{it.code}</div>
              </div>
            </button>
          );
        })}
      </div>
    </Drawer>
  );
}
