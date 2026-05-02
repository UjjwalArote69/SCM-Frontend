import { Link } from "react-router-dom";
import { Upload, Download, FileText, Truck, Undo2 } from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import StatusPill from "../../../components/data/StatusPill.jsx";
import { useToast } from "../../../hooks/useToast.jsx";

const ROWS = [
  { id: "INV-2023-331", po: "PO-2023-8895", vendor: "GlobalTech Sys", amount: 45200, date: "Oct 26, 2023", status: "awaiting-approval", tone: "warning" },
  { id: "INV-2023-330", po: "PO-2023-8880", vendor: "SteelWorks Ltd", amount: 210000, date: "Oct 24, 2023", status: "approved", tone: "success" },
  { id: "INV-2023-325", po: "PO-2023-8870", vendor: "Acme Industries", amount: 18500, date: "Oct 20, 2023", status: "paid", tone: "success" },
];

export default function InvoicesListPage() {
  const toast = useToast();
  return (
    <div className="max-w-[1200px] mx-auto">
      <PageHeader
        title="Invoices & Payments"
        subtitle="Approve invoices and process payments to vendors"
        actions={
          <>
            <button onClick={() => toast.success(`Exported ${ROWS.length} invoices to CSV`)} className="flex items-center gap-2 px-4 py-2 rounded-md border border-border text-text text-sm font-semibold hover:bg-surface-container-low">
              <Download className="h-4 w-4" /> Export
            </button>
            <Link to="/app/invoices/proforma" className="flex items-center gap-2 px-4 py-2 rounded-md border border-border text-text text-sm font-semibold hover:bg-surface-container-low">
              <FileText className="h-4 w-4" /> New Proforma
            </Link>
            <Link to="/vendor/invoices/upload" className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-bold">
              <Upload className="h-4 w-4" /> Upload Invoice
            </Link>
          </>
        }
      />
      <div className="bg-surface-container-lowest rounded-lg overflow-hidden border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-container-low text-xs font-semibold text-text-muted uppercase">
              <th className="px-6 py-3 text-left">Invoice #</th>
              <th className="px-6 py-3 text-left">PO</th>
              <th className="px-6 py-3 text-left">Vendor</th>
              <th className="px-6 py-3 text-right">Amount</th>
              <th className="px-6 py-3 text-left">Date</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ROWS.map((r) => (
              <tr key={r.id} className="hover:bg-surface-container-low">
                <td className="px-6 py-4 font-semibold text-primary">{r.id}</td>
                <td className="px-6 py-4 text-info">{r.po}</td>
                <td className="px-6 py-4">{r.vendor}</td>
                <td className="px-6 py-4 text-right font-medium">${r.amount.toLocaleString()}</td>
                <td className="px-6 py-4 text-text-muted">{r.date}</td>
                <td className="px-6 py-4"><StatusPill tone={r.tone}>{r.status}</StatusPill></td>
                <td className="px-6 py-4 text-right">
                  {r.status === "awaiting-approval" && <Link to={`/app/invoices/${r.id}/approve`} className="text-sm font-bold text-primary hover:underline">Approve</Link>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
