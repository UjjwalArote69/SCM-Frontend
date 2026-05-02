import { useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  Loader2,
  ChevronLeft,
  Truck,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { usePOStore } from "../../purchase-orders/store.js";
import PoDocumentsCard from "../../po-documents/components/PoDocumentsCard.jsx";

/**
 * FLOW.md item 12 — Vendor uploads dispatch documents (E-Way Bill / invoice
 * / delivery note) for an accepted PO. Replaces the mock upload page that
 * previously sat at /vendor/invoices/upload.
 *
 * Vendor's eligible POs come from /api/pos which the backend already scopes
 * to vendors-of-record. We only show ones in `accepted` or `fulfilled`
 * status so dispatch docs only attach to live POs.
 */
export default function VendorInvoiceUploadPage() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const initialPo = params.get("po") ?? "";

  const pos = usePOStore((s) => s.items);
  const loading = usePOStore((s) => s.loading);
  const fetchAll = usePOStore((s) => s.fetchAll);

  const [selectedPo, setSelectedPo] = useState(initialPo);
  const setRef = useRef(false);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Eligible POs — vendor must dispatch docs after accepting (or fulfilling).
  const eligible = useMemo(
    () =>
      pos.filter(
        (p) => p.status === "accepted" || p.status === "fulfilled",
      ),
    [pos],
  );

  // If no PO is preselected and there's only one eligible, auto-pick it.
  useEffect(() => {
    if (setRef.current) return;
    if (selectedPo) {
      setRef.current = true;
      return;
    }
    if (eligible.length === 1) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedPo(eligible[0].number);
      setRef.current = true;
    }
  }, [eligible, selectedPo]);

  const handlePoChange = (number) => {
    setSelectedPo(number);
    if (number) setParams({ po: number });
    else setParams({});
  };

  const po = useMemo(
    () => pos.find((p) => p.number === selectedPo) ?? null,
    [pos, selectedPo],
  );

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <button
        type="button"
        onClick={() => nav("/vendor/invoices")}
        className="inline-flex items-center gap-1 text-xs font-medium text-text-muted hover:text-text mb-3"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Invoices
      </button>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text tracking-tight flex items-center gap-2">
            <Truck className="h-7 w-7 text-primary" strokeWidth={2.25} />
            Dispatch Documents
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Upload your E-Way Bill, invoice, and delivery note for an accepted PO.
            Each document is attached to that specific PO.
          </p>
        </div>
      </div>

      {loading && pos.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-text-muted">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading your POs…
        </div>
      ) : eligible.length === 0 ? (
        <div className="bg-surface-container-low rounded-2xl p-12 sm:p-16 flex flex-col items-center text-center border border-dashed border-border">
          <Truck className="h-9 w-9 text-text-subtle mb-4" strokeWidth={1.5} />
          <h2 className="text-xl font-bold text-text mb-1 tracking-tight">
            No POs ready for dispatch
          </h2>
          <p className="text-text-muted text-sm max-w-md mb-6 leading-relaxed">
            Documents can be uploaded once you've accepted a PO. Open one from
            your Purchase Orders list and accept it first.
          </p>
          <Link
            to="/vendor/purchase-orders"
            className="bg-primary hover:bg-primary-hover text-primary-foreground px-5 py-2 rounded-md font-bold text-sm flex items-center gap-2"
          >
            Go to Purchase Orders
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* PO picker */}
          <div className="bg-surface-container-lowest border border-border rounded-lg p-4 sm:p-5">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">
              Choose a Purchase Order
            </label>
            <select
              value={selectedPo}
              onChange={(e) => handlePoChange(e.target.value)}
              className="w-full rounded-lg px-3.5 py-3 sm:py-2.5 text-sm bg-surface-container-lowest border border-border text-text focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
            >
              <option value="">— select a PO —</option>
              {eligible.map((p) => (
                <option key={p.number} value={p.number}>
                  {p.number} · {p.status} · ₹
                  {Number(p.total ?? 0).toLocaleString()}
                </option>
              ))}
            </select>
            {po && (
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
                <span>
                  PO date:{" "}
                  <span className="font-semibold text-text">{po.po_date ?? "—"}</span>
                </span>
                {po.expected_delivery && (
                  <span>
                    Expected delivery:{" "}
                    <span className="font-semibold text-text">
                      {po.expected_delivery}
                    </span>
                  </span>
                )}
                <Link
                  to={`/vendor/purchase-orders/${po.number}`}
                  className="text-info hover:underline inline-flex items-center gap-1 font-semibold"
                >
                  View PO <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>

          {/* Upload + existing docs */}
          {po ? (
            <PoDocumentsCard poNumber={po.number} canUpload />
          ) : (
            <div className="bg-surface-container-low rounded-lg p-8 text-center text-sm text-text-muted">
              Pick a PO above to see attached documents and upload new ones.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
