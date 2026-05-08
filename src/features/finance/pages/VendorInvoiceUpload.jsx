import { useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  Loader2, ChevronLeft, Truck, ExternalLink, Receipt,
  CheckCircle2, AlertCircle, FileText,
} from "lucide-react";
import { usePOStore } from "../../purchase-orders/store.js";
import PoDocumentsCard from "../../po-documents/components/PoDocumentsCard.jsx";
import { useToast } from "../../../hooks/useToast.jsx";
import invoiceApi from "../api.js";
import { useInvoiceStore } from "../store.js";
import StatusPill from "../../../components/data/StatusPill.jsx";

/**
 * Vendor uploads a real invoice against an accepted PO.
 *
 *   1. Pick a PO (only accepted/fulfilled show up).
 *   2. If an invoice already exists → show its status + link, allow only
 *      dispatch-document uploads (the actual invoice is locked).
 *   3. Otherwise → fill totals (prefilled from PO), submit creates an
 *      AppInvoice with status=pending. CFO sees it on /admin/invoices.
 *   4. Dispatch docs (E-Way Bill / delivery note / invoice scan) attach to
 *      the PO via PoDocumentsCard whenever there's a selected PO.
 */
export default function VendorInvoiceUploadPage() {
  const nav = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const initialPo = params.get("po") ?? "";

  const pos = usePOStore((s) => s.items);
  const poLoading = usePOStore((s) => s.loading);
  const fetchPOs = usePOStore((s) => s.fetchAll);

  const invoices = useInvoiceStore((s) => s.items);
  const invLoading = useInvoiceStore((s) => s.loading);
  const fetchInvoices = useInvoiceStore((s) => s.fetchAll);
  const createInvoice = useInvoiceStore((s) => s.create);

  const [selectedPo, setSelectedPo] = useState(initialPo);
  const setRef = useRef(false);

  useEffect(() => {
    fetchPOs();
    fetchInvoices();
  }, [fetchPOs, fetchInvoices]);

  const eligible = useMemo(
    () => pos.filter((p) => p.status === "accepted" || p.status === "fulfilled"),
    [pos],
  );

  // Auto-pick the only eligible PO if none was preselected.
  useEffect(() => {
    if (setRef.current) return;
    if (selectedPo) {
      setRef.current = true;
      return;
    }
    if (eligible.length === 1) {
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

  // Existing invoice for this PO — vendor can only have one in flight per PO.
  const existingInvoice = useMemo(
    () => (po ? invoices.find((i) => i.po_number === po.number) : null),
    [invoices, po],
  );

  // Form state — prefilled when a PO is picked
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().slice(0, 10);
  });
  const [subtotal, setSubtotal] = useState("");
  const [tax, setTax] = useState("");
  const [total, setTotal] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Prefill totals when the selected PO changes (and no invoice exists yet).
  useEffect(() => {
    if (!po || existingInvoice) return;
    const t = Number(po.total ?? 0);
    const sub = Number(po.subtotal ?? 0);
    const tx = Number(po.tax ?? 0);
    setTotal(t ? t.toFixed(2) : "");
    setSubtotal(sub ? sub.toFixed(2) : t ? (t / 1.18).toFixed(2) : "");
    setTax(tx ? tx.toFixed(2) : t ? (t - t / 1.18).toFixed(2) : "");
  }, [po, existingInvoice]);

  const submit = async (e) => {
    e.preventDefault();
    if (!po) return;
    if (!total || Number(total) <= 0) {
      toast.error("Total must be greater than 0");
      return;
    }
    setSubmitting(true);
    try {
      const created = await createInvoice({
        po_number: po.number,
        vendor: po.vendor, // server overrides for vendor users — safe
        vendor_invoice_no: vendorInvoiceNo || null,
        invoice_date: invoiceDate || null,
        due_date: dueDate || null,
        subtotal: Number(subtotal) || 0,
        tax: Number(tax) || 0,
        total: Number(total),
        currency: "INR",
        items: Array.isArray(po.items) ? po.items : [],
        notes: notes || null,
      });
      toast.success(`Invoice ${created.number} submitted for approval.`);
      // Stay on page so vendor can immediately attach dispatch docs.
    } catch (err) {
      const msg =
        err?.response?.data?.message ??
        Object.values(err?.response?.data?.errors ?? {}).flat().join(", ") ??
        "Failed to submit invoice";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-12">
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
            <Receipt className="h-7 w-7 text-primary" strokeWidth={2.25} />
            Submit Invoice
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Raise an invoice against your accepted PO. Attach the E-Way Bill,
            delivery note, and invoice scan as dispatch documents.
          </p>
        </div>
      </div>

      {(poLoading || invLoading) && pos.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-text-muted">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading your POs…
        </div>
      ) : eligible.length === 0 ? (
        <div className="bg-surface-container-low rounded-2xl p-12 sm:p-16 flex flex-col items-center text-center border border-dashed border-border">
          <Truck className="h-9 w-9 text-text-subtle mb-4" strokeWidth={1.5} />
          <h2 className="text-xl font-bold text-text mb-1 tracking-tight">
            No POs ready for invoicing
          </h2>
          <p className="text-text-muted text-sm max-w-md mb-6 leading-relaxed">
            Invoices can be submitted once you've accepted a PO. Open one from
            your Purchase Orders list and accept it first.
          </p>
          <Link
            to="/vendor/purchase-orders"
            className="bg-primary hover:brightness-110 text-primary-foreground px-5 py-2 rounded-md font-bold text-sm flex items-center gap-2"
          >
            Go to Purchase Orders
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* PO picker */}
          <div className="glass-card rounded-2xl p-4 sm:p-5">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">
              Choose a Purchase Order
            </label>
            <select
              value={selectedPo}
              onChange={(e) => handlePoChange(e.target.value)}
              className="w-full rounded-lg px-3.5 py-3 sm:py-2.5 text-sm bg-surface-container-lowest border border-border text-text focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
            >
              <option value="">— select a PO —</option>
              {eligible.map((p) => {
                const hasInv = invoices.some((i) => i.po_number === p.number);
                return (
                  <option key={p.number} value={p.number}>
                    {p.number} · {p.status} · ₹{Number(p.total ?? 0).toLocaleString()}
                    {hasInv ? " · invoice raised" : ""}
                  </option>
                );
              })}
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

          {/* Existing invoice → show status, lock the form */}
          {po && existingInvoice && (
            <div className="rounded-2xl border border-success/30 bg-success-soft/30 p-4 sm:p-5 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-text">
                    {existingInvoice.number}
                  </span>
                  <StatusPill
                    tone={
                      existingInvoice.status === "rejected"
                        ? "danger"
                        : existingInvoice.status === "pending"
                        ? "warning"
                        : "success"
                    }
                  >
                    {existingInvoice.status}
                  </StatusPill>
                </div>
                <p className="text-sm text-text-muted mt-1">
                  An invoice has already been submitted for this PO. You can
                  still upload dispatch documents below.
                </p>
              </div>
            </div>
          )}

          {/* Invoice form — only when PO picked and no existing invoice */}
          {po && !existingInvoice && (
            <form
              onSubmit={submit}
              className="glass-card rounded-2xl p-4 sm:p-5 space-y-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-text uppercase tracking-wider">
                  Invoice Details
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">
                    Vendor Invoice Reference
                  </label>
                  <input
                    type="text"
                    value={vendorInvoiceNo}
                    onChange={(e) => setVendorInvoiceNo(e.target.value)}
                    placeholder="e.g. INV-VEND-2026-001"
                    className="w-full rounded-lg px-3 py-2 text-sm bg-surface-container-lowest border border-border text-text focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm bg-surface-container-lowest border border-border text-text focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm bg-surface-container-lowest border border-border text-text focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">
                    Subtotal (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={subtotal}
                    onChange={(e) => setSubtotal(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm bg-surface-container-lowest border border-border text-text focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">
                    Tax / GST (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={tax}
                    onChange={(e) => setTax(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm bg-surface-container-lowest border border-border text-text focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">
                    Total (₹) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={total}
                    onChange={(e) => setTotal(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm bg-surface-container-lowest border border-primary/40 text-text font-bold focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-mono tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">
                  Notes <span className="text-text-subtle font-normal normal-case tracking-normal">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anything finance should know about this invoice"
                  className="w-full rounded-lg px-3 py-2 text-sm bg-surface-container-lowest border border-border text-text focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                />
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-info-soft/40 border border-info/20 text-xs text-info">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Submitting will route your invoice to <strong>finance for approval</strong>.
                  You can attach E-Way Bill, delivery note, and the invoice scan
                  as dispatch documents below — they remain attached to the PO.
                </span>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary hover:brightness-110 text-primary-foreground px-5 py-2.5 rounded-md font-bold text-sm flex items-center gap-2 shadow-sm disabled:opacity-60"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Receipt className="h-4 w-4" />
                  )}
                  Submit Invoice
                </button>
              </div>
            </form>
          )}

          {/* Dispatch docs — always available when a PO is picked */}
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
