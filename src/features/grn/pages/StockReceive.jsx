import { useNavigate } from "react-router-dom";
import { Warehouse, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import PageHeader from "../../../components/data/PageHeader.jsx";

const inputCls = "w-full bg-surface-container-lowest border-0 border-b-2 border-outline-variant focus:border-primary px-3 py-2 text-sm text-text outline-none";

export default function StockReceivePage() {
  const nav = useNavigate();
  const [items, setItems] = useState([{ id: 1, code: "", qty: 1, warehouse: "Warehouse 4", bin: "" }]);

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title="Receive Stock" subtitle="Log ad-hoc stock receipt not tied to a PO" />

      <div className="space-y-6">
        <section className="bg-surface-container-low p-6 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Source</label>
              <select className={inputCls}><option>Transfer from warehouse</option><option>Return from project</option><option>Opening balance</option><option>Other</option></select></div>
            <div><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Date *</label><input type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={inputCls} /></div>
            <div><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Reference / Note</label><input className={inputCls} placeholder="Note" /></div>
          </div>
        </section>

        <section className="bg-surface-container-lowest rounded-lg overflow-hidden border border-border">
          <div className="p-4 bg-surface-container-low border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-text">Items to Receive</h2>
            </div>
            <button onClick={() => setItems([...items, { id: Date.now(), code: "", qty: 1, warehouse: "Warehouse 4", bin: "" }])} className="flex items-center gap-1 text-sm font-bold text-info hover:underline">
              <Plus className="h-4 w-4" /> Add Row
            </button>
          </div>
          <div className="p-4 space-y-3">
            {items.map((it) => (
              <div key={it.id} className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-4"><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Item Code / Name</label>
                  <input className={inputCls} value={it.code} onChange={(e) => setItems(items.map((x) => x.id === it.id ? { ...x, code: e.target.value } : x))} placeholder="ITM-…" /></div>
                <div className="col-span-2"><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Qty</label>
                  <input type="number" min="1" className={inputCls} value={it.qty} onChange={(e) => setItems(items.map((x) => x.id === it.id ? { ...x, qty: e.target.value } : x))} /></div>
                <div className="col-span-3"><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Warehouse</label>
                  <select className={inputCls} value={it.warehouse} onChange={(e) => setItems(items.map((x) => x.id === it.id ? { ...x, warehouse: e.target.value } : x))}>
                    <option>Warehouse 4</option><option>Warehouse 2</option><option>Warehouse 7</option>
                  </select></div>
                <div className="col-span-2"><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Bin</label>
                  <input className={inputCls} value={it.bin} onChange={(e) => setItems(items.map((x) => x.id === it.id ? { ...x, bin: e.target.value } : x))} placeholder="A-12" /></div>
                <div className="col-span-1 flex justify-end">
                  <button onClick={() => setItems(items.filter((x) => x.id !== it.id))} className="text-text-muted hover:text-danger p-2"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <button onClick={() => nav(-1)} className="px-5 py-2 text-sm font-medium text-text border border-border rounded-md hover:bg-surface-container-low">Cancel</button>
          <button onClick={() => nav("/app/inventory")} className="px-6 py-2 text-sm font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-md">Receive Stock</button>
        </div>
      </div>
    </div>
  );
}
