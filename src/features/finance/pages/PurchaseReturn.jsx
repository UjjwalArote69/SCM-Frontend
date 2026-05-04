import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Undo2 } from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import { useToast } from "../../../hooks/useToast.jsx";

const inputCls = "w-full bg-surface-container-lowest border-0 border-b-2 border-outline-variant focus:border-primary px-3 py-2 text-sm text-text outline-none";

const GRN_ITEMS = [
  { id: 1, code: "ITM-9021", name: "Industrial Servo Motor HZ-500", received: 12 },
  { id: 2, code: "ITM-9025", name: "Reinforced Conveyor Belt (50m)", received: 4 },
];

const REASONS = ["Damaged in transit", "Quality defect", "Wrong specification", "Over-delivery", "Other"];

export default function PurchaseReturnPage() {
  const nav = useNavigate();
  const toast = useToast();
  const [returns, setReturns] = useState({});
  const [reason, setReason] = useState(REASONS[0]);
  const submit = () => {
    const count = Object.values(returns).reduce((s, v) => s + Number(v || 0), 0);
    if (count === 0) {
      toast.error("Enter at least one return quantity");
      return;
    }
    toast.success(`Return submitted — ${count} units going back`);
    nav("/app/grn");
  };

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title="Purchase Return" subtitle="Return received goods to vendor with reason" />

      <div className="space-y-6">
        <section className="bg-surface-container-low p-6 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Source GRN *</label>
              <select className={inputCls}><option>GRN-2023-076 — SteelWorks Ltd</option><option>GRN-2023-077 — GlobalTech Sys</option></select></div>
            <div><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Return Date *</label><input type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={inputCls} /></div>
            <div><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Reason *</label>
              <select value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls}>{REASONS.map((r) => <option key={r}>{r}</option>)}</select></div>
            <div><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Debit Note #</label><input className={inputCls} placeholder="DN-…" /></div>
          </div>
          <div className="mt-4">
            <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Notes to Vendor</label>
            <textarea rows={3} className={`${inputCls} resize-none`} placeholder="Describe the issue and expected resolution" />
          </div>
        </section>

        <section className="bg-surface-container-lowest rounded-lg overflow-hidden border border-border">
          <div className="p-4 bg-surface-container-low border-b border-border flex items-center gap-2">
            <Undo2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-text">Items Being Returned</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-container-low text-xs font-semibold text-text-muted uppercase">
                <th className="px-6 py-3 text-left">Item</th>
                <th className="px-6 py-3 text-right">Received</th>
                <th className="px-6 py-3 text-right">Returning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {GRN_ITEMS.map((it) => (
                <tr key={it.id}>
                  <td className="px-6 py-4"><div className="font-medium">{it.name}</div><div className="text-xs text-info">{it.code}</div></td>
                  <td className="px-6 py-4 text-right text-text-muted">{it.received}</td>
                  <td className="px-6 py-4 text-right">
                    <input type="number" min="0" max={it.received} value={returns[it.id] ?? 0} onChange={(e) => setReturns({ ...returns, [it.id]: Math.min(Number(e.target.value), it.received) })} className="w-24 bg-surface-container-lowest border-b border-border focus:border-primary px-2 py-1 text-right outline-none" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="flex justify-end gap-3">
          <button onClick={() => nav(-1)} className="px-5 py-2 text-sm font-medium text-text border border-border rounded-md hover:bg-surface-container-low">Cancel</button>
          <button onClick={submit} className="px-6 py-2 text-sm font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-md">Submit Return</button>
        </div>
      </div>
    </div>
  );
}
