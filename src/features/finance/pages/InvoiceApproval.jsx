import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChevronRight, CheckCircle2, XCircle, Download, FileText } from "lucide-react";
import Toast from "../../../components/feedback/Toast.jsx";

const INV = {
  id: "INV-2023-331",
  po: "PO-2023-8895",
  vendor: "GlobalTech Sys",
  amount: 45200,
  date: "Oct 26, 2023",
  items: [
    { id: 1, desc: "Industrial Servo Motor HZ-500", qty: 12, rate: 1250, amount: 15000 },
    { id: 2, desc: "Reinforced Conveyor Belt (50m)", qty: 4, rate: 850, amount: 3400 },
  ],
  subtotal: 18400,
  tax: 1472,
  total: 19872,
};

export default function InvoiceApprovalPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [comment, setComment] = useState("");
  const [toast, setToast] = useState({ open: false, message: "", tone: "success" });

  const handle = (action) => {
    setToast({ open: true, message: `Invoice ${action === "approve" ? "approved" : "rejected"}.`, tone: action === "approve" ? "success" : "error" });
    setTimeout(() => nav("/app/invoices"), 1200);
  };

  return (
    <div className="max-w-[1100px] mx-auto">
      <nav className="text-sm font-medium text-text-muted mb-2 flex items-center gap-2">
        <Link to="/app/invoices" className="hover:text-primary">Invoices</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-text">{id ?? INV.id}</span>
      </nav>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-text tracking-tight">CFO Invoice Approval</h1>
        <button className="px-4 py-2 text-sm font-semibold text-text border border-border rounded-md hover:bg-surface-container-low flex items-center gap-2">
          <Download className="h-4 w-4" /> Download PDF
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <section className="bg-surface-container-lowest rounded-md p-6 border border-border">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="text-sm text-text-muted">From</div>
                <div className="text-lg font-bold text-text">{INV.vendor}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-text-muted">Invoice #{INV.id}</div>
                <div className="text-sm text-text-muted">{INV.date}</div>
                <div className="text-sm text-info mt-1">PO: {INV.po}</div>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-semibold text-text-muted uppercase border-b border-border">
                  <th className="py-2 text-left">Description</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Rate</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {INV.items.map((it) => (
                  <tr key={it.id}>
                    <td className="py-3">{it.desc}</td>
                    <td className="py-3 text-right text-text-muted">{it.qty}</td>
                    <td className="py-3 text-right text-text-muted">${it.rate.toLocaleString()}</td>
                    <td className="py-3 text-right font-medium">${it.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-6 ml-auto w-72 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-text-muted">Subtotal</span><span>${INV.subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Tax (8%)</span><span>${INV.tax.toLocaleString()}</span></div>
              <div className="flex justify-between pt-2 border-t border-border font-bold text-lg text-primary"><span>Total</span><span>${INV.total.toLocaleString()}</span></div>
            </div>
          </section>

          <section className="bg-surface-container-lowest rounded-md p-6 border border-border">
            <div className="flex items-center gap-3 text-text-muted text-sm">
              <FileText className="h-5 w-5" />
              <span>invoice_scan.pdf · 1.2 MB</span>
              <button onClick={() => toast.info("Opening invoice preview")} className="ml-auto text-info hover:underline text-sm font-bold">View</button>
            </div>
          </section>
        </div>

        <div>
          <div className="sticky top-6 space-y-4">
            <div className="bg-surface-container-lowest rounded-md p-6 border border-border">
              <h2 className="text-lg font-bold text-text mb-4">Approval</h2>
              <label className="block text-xs font-semibold text-text-muted mb-2 uppercase">Comments</label>
              <textarea rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional note for vendor/finance team" className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant focus:border-primary px-3 py-2 text-sm outline-none resize-none mb-4" />
              <div className="space-y-2">
                <button onClick={() => handle("approve")} className="w-full bg-success text-white px-4 py-2.5 rounded-md font-bold text-sm flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Approve &amp; Send for Payment
                </button>
                <button onClick={() => handle("reject")} className="w-full bg-transparent border border-danger text-danger px-4 py-2.5 rounded-md font-bold text-sm flex items-center justify-center gap-2 hover:bg-danger-soft">
                  <XCircle className="h-4 w-4" /> Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Toast open={toast.open} tone={toast.tone} message={toast.message} onClose={() => setToast({ open: false, message: "" })} />
    </div>
  );
}
