import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronRight, Package, Loader2 } from "lucide-react";
import StatusPill from "../../../components/data/StatusPill.jsx";
import { useGRNStore } from "../store.js";
import { useToast } from "../../../hooks/useToast.jsx";
import grnApi from "../api.js";
import PrintLetterhead from "../../../components/print/PrintLetterhead.jsx";
import PrintFooter from "../../../components/print/PrintFooter.jsx";
import PrintActions from "../../../components/print/PrintActions.jsx";

function Meta({ label, value }) {
  return (
    <div>
      <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">{label}</div>
      <div className="text-base font-medium text-text">{value ?? "—"}</div>
    </div>
  );
}

export default function GRNDetailPage() {
  const { id: number } = useParams();
  const inStore = useGRNStore((s) => s.items.find((g) => g.number === number));
  const [grn, setGrn] = useState(inStore ?? null);
  const [loading, setLoading] = useState(!inStore);
  const toast = useToast();

  useEffect(() => {
    if (inStore) {
      setGrn(inStore);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    grnApi
      .get(number)
      .then((data) => {
        if (!cancelled) {
          setGrn(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [number, inStore]);

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto flex items-center justify-center py-24 text-text-muted">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
      </div>
    );
  }
  if (!grn) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <h2 className="text-2xl font-bold text-text mb-2">GRN not found</h2>
        <Link to="/app/grn" className="text-primary font-bold hover:underline">Back to list</Link>
      </div>
    );
  }

  const items = Array.isArray(grn.items) ? grn.items : [];

  return (
    <div className="max-w-[1400px] mx-auto">
      <PrintLetterhead
        docType="Goods Receipt Note"
        docNumber={grn.number}
        subtitle={grn.po_number ? `PO: ${grn.po_number}` : null}
      />

      <nav className="text-sm font-medium text-text-muted mb-2 flex items-center gap-2 print:hidden">
        <Link to="/app/grn" className="hover:text-primary">GRN</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-text">{grn.number}</span>
      </nav>

      <div className="flex items-center justify-between mb-8 print:hidden">
        <h1 className="text-3xl font-bold text-text tracking-tight flex items-center gap-3">
          {grn.number}
          <StatusPill tone={grn.status === "full" ? "success" : "warning"}>
            {grn.status === "full" ? "Full Receipt" : "Partial"}
          </StatusPill>
        </h1>
        <PrintActions onPdfHint={(msg) => toast.info(msg)} />
      </div>

      <section className="bg-surface-container-lowest rounded-md p-6 border border-border mb-6">
        <h2 className="text-lg font-bold text-text mb-6 flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" /> Receipt Info
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Meta label="PO" value={<Link to={`/app/purchase-orders/${grn.po_number}`} className="text-info hover:underline">{grn.po_number}</Link>} />
          <Meta label="Vendor" value={grn.vendor} />
          <Meta label="Date" value={grn.received_date} />
          <Meta label="Challan" value={grn.challan_no} />
        </div>
      </section>

      <section className="bg-surface-container-lowest rounded-md overflow-hidden border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-container-low text-xs font-semibold text-text-muted uppercase">
              <th className="px-6 py-3 text-left">Item</th>
              <th className="px-6 py-3 text-right">Ordered</th>
              <th className="px-6 py-3 text-right">Received</th>
              <th className="px-6 py-3 text-right">Pending</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((it, i) => (
              <tr key={i}>
                <td className="px-6 py-4">
                  <div className="font-medium">{it.name}</div>
                  <div className="text-xs text-info">{it.code}</div>
                </td>
                <td className="px-6 py-4 text-right text-text-muted">{it.ordered}</td>
                <td className="px-6 py-4 text-right font-semibold text-text">{it.received}</td>
                <td className="px-6 py-4 text-right text-text-muted">{(it.ordered ?? 0) - (it.received ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <PrintFooter
        docNumber={grn.number}
        signatures={[
          { label: "Received By (Warehouse)" },
          { label: "Vendor / Driver", name: grn.vendor },
          { label: "Quality Check" },
        ]}
      />
    </div>
  );
}
