import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Send } from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import { useToast } from "../../../hooks/useToast.jsx";

const inputCls = "w-full bg-surface-container-lowest border-0 border-b-2 border-outline-variant focus:border-primary px-3 py-2 text-sm text-text outline-none";

export default function ProformaInvoicePage() {
  const nav = useNavigate();
  const toast = useToast();
  const [items, setItems] = useState([{ id: 1, desc: "", qty: 1, price: 0 }]);

  const send = () => {
    toast.success("Proforma sent to buyer");
    nav("/app/invoices");
  };
  const draft = () => {
    toast.success("Draft saved");
  };
  const subtotal = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader title="Create Proforma Invoice" subtitle="Provisional invoice issued before shipment" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-surface-container-low p-6 rounded-lg">
            <h2 className="text-lg font-bold text-text mb-4">Parties</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Buyer / Customer *</label>
                <select className={inputCls}><option>Acme Industries</option><option>SteelWorks Ltd</option></select></div>
              <div><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">PO Reference</label><input className={inputCls} placeholder="PO-2023-…" /></div>
              <div><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Proforma Date</label><input type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={inputCls} /></div>
              <div><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Valid Until</label><input type="date" className={inputCls} /></div>
            </div>
          </section>

          <section className="bg-surface-container-low p-6 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-text">Line Items</h2>
              <button onClick={() => setItems([...items, { id: Date.now(), desc: "", qty: 1, price: 0 }])} className="flex items-center gap-1 text-sm font-bold text-info hover:underline">
                <Plus className="h-4 w-4" /> Add Item
              </button>
            </div>
            <div className="space-y-3">
              {items.map((it) => (
                <div key={it.id} className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-6"><input className={inputCls} placeholder="Description" value={it.desc} onChange={(e) => setItems(items.map((x) => x.id === it.id ? { ...x, desc: e.target.value } : x))} /></div>
                  <div className="col-span-2"><input type="number" min="1" className={inputCls} placeholder="Qty" value={it.qty} onChange={(e) => setItems(items.map((x) => x.id === it.id ? { ...x, qty: e.target.value } : x))} /></div>
                  <div className="col-span-3"><input type="number" min="0" step="0.01" className={inputCls} placeholder="Unit Price" value={it.price} onChange={(e) => setItems(items.map((x) => x.id === it.id ? { ...x, price: e.target.value } : x))} /></div>
                  <div className="col-span-1">
                    <button onClick={() => setItems(items.filter((x) => x.id !== it.id))} className="text-text-muted hover:text-danger p-2"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-surface-container-low p-6 rounded-lg">
            <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Notes / Payment Terms</label>
            <textarea rows={3} className={`${inputCls} resize-none`} placeholder="Net 30, shipping CIF, etc." />
          </section>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-6 glass-card rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-text">Summary</h3>
            <div className="flex justify-between text-sm"><span className="text-text-muted">Subtotal</span><span className="font-medium">${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-text-muted">Tax (8%)</span><span className="font-medium">${tax.toFixed(2)}</span></div>
            <div className="flex justify-between pt-3 border-t border-border font-bold"><span>Total</span><span className="text-lg text-primary">${total.toFixed(2)}</span></div>
            <button onClick={send} className="w-full bg-primary hover:brightness-110 text-primary-foreground py-2.5 rounded-md font-bold flex items-center justify-center gap-2">
              <Send className="h-4 w-4" /> Send Proforma
            </button>
            <button onClick={draft} className="w-full border border-border text-text py-2.5 rounded-md font-medium hover:bg-surface-container-low">
              Save as Draft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
