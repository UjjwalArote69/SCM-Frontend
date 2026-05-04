import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, Send } from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import { useToast } from "../../../hooks/useToast.jsx";

const inputCls = "w-full bg-surface-container-lowest border-0 border-b-2 border-outline-variant focus:border-primary px-3 py-2 text-sm text-text outline-none";

const PO_ITEMS = [
  { id: 1, code: "ITM-9021", name: "Industrial Servo Motor HZ-500", ordered: 12 },
  { id: 2, code: "ITM-9025", name: "Reinforced Conveyor Belt (50m)", ordered: 4 },
];

export default function DeliveryChallanPage() {
  const nav = useNavigate();
  const toast = useToast();
  const [qty, setQty] = useState(Object.fromEntries(PO_ITEMS.map((i) => [i.id, i.ordered])));
  const generate = () => {
    toast.success("Delivery challan generated");
    nav("/app/invoices");
  };

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title="Create Delivery Challan" subtitle="Document accompanying goods in transit" />

      <div className="space-y-6">
        <section className="bg-surface-container-low p-6 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">PO Reference *</label>
              <select className={inputCls}><option>PO-2023-8895 — GlobalTech Sys</option></select></div>
            <div><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Challan Date *</label><input type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={inputCls} /></div>
            <div><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Vehicle Number</label><input className={inputCls} placeholder="e.g. UP16-AB1234" /></div>
            <div><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Driver Name</label><input className={inputCls} /></div>
            <div><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Driver Phone</label><input type="tel" className={inputCls} /></div>
            <div><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Transport Mode</label>
              <select className={inputCls}><option>Road</option><option>Rail</option><option>Air</option><option>Sea</option></select></div>
          </div>
        </section>

        <section className="bg-surface-container-lowest rounded-lg overflow-hidden border border-border">
          <div className="p-4 bg-surface-container-low border-b border-border flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-text">Items Being Dispatched</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-container-low text-xs font-semibold text-text-muted uppercase">
                <th className="px-6 py-3 text-left">Item</th>
                <th className="px-6 py-3 text-right">Ordered</th>
                <th className="px-6 py-3 text-right">Dispatching</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {PO_ITEMS.map((it) => (
                <tr key={it.id}>
                  <td className="px-6 py-4"><div className="font-medium">{it.name}</div><div className="text-xs text-info">{it.code}</div></td>
                  <td className="px-6 py-4 text-right text-text-muted">{it.ordered}</td>
                  <td className="px-6 py-4 text-right">
                    <input type="number" min="0" max={it.ordered} value={qty[it.id]} onChange={(e) => setQty({ ...qty, [it.id]: Math.min(Number(e.target.value), it.ordered) })} className="w-24 bg-surface-container-lowest border-b border-border focus:border-primary px-2 py-1 text-right outline-none" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="flex justify-end gap-3">
          <button onClick={() => nav(-1)} className="px-5 py-2 text-sm font-medium text-text border border-border rounded-md hover:bg-surface-container-low">Cancel</button>
          <button onClick={generate} className="px-6 py-2 text-sm font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-md flex items-center gap-2">
            <Send className="h-4 w-4" /> Generate Challan
          </button>
        </div>
      </div>
    </div>
  );
}
