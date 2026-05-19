import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
import {
  Info,
  Plus,
  Trash2,
  Send,
  Save,
  Building2,
  Link2,
  AlertCircle,
  Loader2,
  Truck,
} from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import { usePOStore } from "../store.js";
import { useVendorsStore } from "../../masters/vendors/store.js";
import { usePRStore } from "../../purchase-requests/store.js";
import { useRFQStore } from "../../quotations/store.js";
import { useAuthStore } from "../../auth/store.js";
import { useToast } from "../../../hooks/useToast.jsx";
import { BUSINESS_UNITS } from "../../../data/enums.js";

// Mirrors PoController::canWritePo — only admin and purchase_officer can
// author POs. Per FLOW.md item 6, HODs (incl. Purchase HOD) have
// approve+read only and assign authoring to a subordinate officer.
function canWritePo(user) {
  if (!user) return false;
  return user.role === "admin" || user.role === "purchase_officer";
}

const UOMS = ["EA", "KG", "RL", "SET", "BOX", "LTR", "MTR", "PCS", "NOS"];
const GST_OPTIONS = [0, 5, 12, 18, 28];

const inputCls = (error) =>
  `w-full bg-surface-container-lowest border-0 border-b-2 ${
    error ? "border-danger bg-danger-soft/30" : "border-outline-variant"
  } focus:border-primary px-3 py-2 text-sm text-text outline-none transition-colors`;

function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="text-xs text-danger mt-1 font-medium flex items-center gap-1">
      <AlertCircle className="h-3 w-3" />
      {message}
    </p>
  );
}

function emptyItem() {
  return {
    id: `i-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: "",
    code: "",
    hsn_code: "",
    uom: "",
    qty: 1,
    rate: 0,
    gst: 18,
  };
}

export default function PurchaseOrderCreatePage() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const create = usePOStore((s) => s.create);
  const user = useAuthStore((s) => s.user);

  // Data stores
  const vendors = useVendorsStore((s) => s.items);
  const fetchVendors = useVendorsStore((s) => s.fetchAll);
  const prs = usePRStore((s) => s.items);
  const fetchPRs = usePRStore((s) => s.fetchAll);
  const rfqs = useRFQStore((s) => s.items);
  const fetchRFQs = useRFQStore((s) => s.fetchAll);

  const [vendor, setVendor] = useState("");
  const [prNumber, setPrNumber] = useState("");
  const [rfqNumber, setRfqNumber] = useState("");
  const [bu, setBu] = useState("");
  const [poDate, setPoDate] = useState(new Date().toISOString().slice(0, 10));
  const [expected, setExpected] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([emptyItem()]);
  const [transportArrangedBy, setTransportArrangedBy] = useState("vendor");
  const [transportVendorId, setTransportVendorId] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [lockedByRfq, setLockedByRfq] = useState(false);

  useEffect(() => {
    fetchVendors();
    fetchPRs();
    fetchRFQs();
  }, [fetchVendors, fetchPRs, fetchRFQs]);

  const approvedVendors = vendors.filter((v) => v.approval_status === "approved");
  const transportVendors = approvedVendors.filter(
    (v) => v.vendor_type === "transport" || v.vendor_type === "both",
  );
  const approvedPRs = prs.filter((p) => p.status === "approved");
  const awardedRFQs = rfqs.filter((r) => r.status === "awarded" && r.awarded_vendor);

  // One-time deep-link hydration: if the URL has ?rfq= and the RFQ store has
  // loaded, prefill the form from the awarded RFQ. Runs once per mount.
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    const qr = searchParams.get("rfq");
    if (!qr || awardedRFQs.length === 0) return;
    const rfq = awardedRFQs.find((r) => r.number === qr);
    if (!rfq) return;
    const response = (rfq.responses ?? []).find(
      (r) => r.vendor === rfq.awarded_vendor,
    );
    setRfqNumber(qr);
    setVendor(rfq.awarded_vendor ?? "");
    if (rfq.pr_number) setPrNumber(rfq.pr_number);
    if (Array.isArray(rfq.items) && rfq.items.length > 0) {
      setItems(
        rfq.items.map((it, idx) => ({
          id: `i-${Date.now()}-${idx}`,
          name: it.name ?? "",
          code: it.code ?? "",
          hsn_code: it.hsn_code ?? "",
          uom: it.uom ?? "",
          qty: Number(it.qty) || 1,
          rate: Number(response?.prices?.[idx]) || 0,
          gst: Number(response?.gst?.[idx]) || 18,
        })),
      );
    }
    setLockedByRfq(true);
  }, [awardedRFQs.length]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  // Role gate — purchase officer / Purchase or Procurement HOD / admin.
  // Runs after all hooks to respect rules-of-hooks.
  if (user && !canWritePo(user)) {
    return <Navigate to="/app/purchase-orders" replace />;
  }

  const clearError = (key) =>
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const handlePRSelect = (num) => {
    setPrNumber(num);
    if (!num) return;
    const pr = prs.find((p) => p.number === num);
    if (!pr || !Array.isArray(pr.items) || pr.items.length === 0) return;
    if (lockedByRfq) return;
    setItems(
      pr.items.map((it, idx) => ({
        id: `i-${Date.now()}-${idx}`,
        name: it.name ?? "",
        code: it.code ?? "",
        hsn_code: it.hsn_code ?? "",
        uom: it.uom ?? "",
        qty: Number(it.qty) || 1,
        rate: 0,
        gst: 18,
      })),
    );
    toast.success(`Prefilled ${pr.items.length} items from ${num}`);
  };

  const handleRFQSelect = (num) => {
    setRfqNumber(num);
    if (!num) {
      setLockedByRfq(false);
      return;
    }
    const rfq = rfqs.find((r) => r.number === num);
    if (!rfq) return;
    const response = (rfq.responses ?? []).find(
      (r) => r.vendor === rfq.awarded_vendor,
    );
    setVendor(rfq.awarded_vendor ?? "");
    if (rfq.pr_number) setPrNumber(rfq.pr_number);
    if (Array.isArray(rfq.items) && rfq.items.length > 0) {
      setItems(
        rfq.items.map((it, idx) => ({
          id: `i-${Date.now()}-${idx}`,
          name: it.name ?? "",
          code: it.code ?? "",
          hsn_code: it.hsn_code ?? "",
          uom: it.uom ?? "",
          qty: Number(it.qty) || 1,
          rate: Number(response?.prices?.[idx]) || 0,
          gst: Number(response?.gst?.[idx]) || 18,
        })),
      );
      toast.success(`Prefilled from awarded RFQ ${num}`);
    }
    setLockedByRfq(true);
  };

  const patchItem = (id, patch) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    clearError("items");
  };
  const addItem = () => {
    if (lockedByRfq) return;
    setItems((prev) => [...prev, emptyItem()]);
  };
  const removeItem = (id) => {
    if (lockedByRfq) return;
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((it) => it.id !== id)));
  };

  const unlock = () => {
    setLockedByRfq(false);
    setRfqNumber("");
    toast.info("Unlocked — you can now edit items & vendor");
  };

  // Compute totals
  const lines = items.map((it) => {
    const qty = Number(it.qty) || 0;
    const rate = Number(it.rate) || 0;
    const gstPct = Number(it.gst) || 0;
    const taxable = qty * rate;
    const gstAmt = (taxable * gstPct) / 100;
    return { qty, rate, gstPct, taxable, gstAmt, total: taxable + gstAmt };
  });
  const subtotal = lines.reduce((s, l) => s + l.taxable, 0);
  const totalGst = lines.reduce((s, l) => s + l.gstAmt, 0);
  const grand = subtotal + totalGst;

  const validate = () => {
    const next = {};
    if (!vendor.trim()) next.vendor = "Vendor is required.";
    if (!poDate) next.po_date = "PO date is required.";
    if (!expected) {
      next.expected_delivery = "Expected delivery date is required.";
    } else {
      const picked = new Date(expected);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (picked < today) next.expected_delivery = "Expected delivery must be today or later.";
    }
    const bad = items.some((it) => {
      const q = Number(it.qty);
      const r = Number(it.rate);
      return (
        !it.name.trim() ||
        !Number.isFinite(q) ||
        q <= 0 ||
        !Number.isFinite(r) ||
        r < 0
      );
    });
    if (bad) next.items = "Every item needs a name, qty > 0, and a valid rate.";
    if (transportArrangedBy === "buyer" && !transportVendorId) {
      next.transport_vendor_id = "Pick a transport vendor when buyer arranges transport.";
    }
    return next;
  };

  const submit = async () => {
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) {
      toast.error("Please correct the highlighted fields.");
      return;
    }
    setSubmitting(true);
    try {
      const record = await create({
        vendor: vendor.trim(),
        pr_number: prNumber || null,
        rfq_number: rfqNumber || null,
        business_unit: bu || null,
        po_date: poDate,
        expected_delivery: expected || null,
        transport_arranged_by: transportArrangedBy,
        transport_vendor_id: transportArrangedBy === "buyer" && transportVendorId
          ? Number(transportVendorId)
          : null,
        notes: notes.trim() || null,
        items: items.map((it) => ({
          name: it.name.trim(),
          code: it.code.trim() || null,
          hsn_code: it.hsn_code.trim() || null,
          uom: it.uom || null,
          qty: Number(it.qty) || 0,
          rate: Number(it.rate) || 0,
          gst: Number(it.gst) || 0,
        })),
      });
      toast.success(`${record.number} created`);
      nav("/app/purchase-orders");
    } catch (err) {
      const serverErrors = err?.response?.data?.errors;
      if (serverErrors) {
        const flat = Object.fromEntries(
          Object.entries(serverErrors).map(([k, v]) => {
            const key = k.startsWith("items") ? "items" : k;
            return [key, Array.isArray(v) ? v[0] : v];
          }),
        );
        setErrors(flat);
      }
      toast.error(err?.response?.data?.message ?? "Could not create PO");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title="Create Purchase Order"
        subtitle="Issue a new PO to a vendor"
      />

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0 space-y-6">
          {/* Source linkage banner */}
          <div className="p-4 bg-info-soft/60 text-info rounded-lg border border-info/30">
            <div className="flex items-start gap-3">
              <Link2 className="h-5 w-5 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold mb-2">Start from a source document (recommended)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold mb-1">
                      From Awarded RFQ
                    </label>
                    <select
                      className={inputCls(false)}
                      value={rfqNumber}
                      onChange={(e) => handleRFQSelect(e.target.value)}
                    >
                      <option value="">— none —</option>
                      {awardedRFQs.map((r) => (
                        <option key={r.number} value={r.number}>
                          {r.number} · {r.awarded_vendor} · {r.title}
                        </option>
                      ))}
                    </select>
                    {awardedRFQs.length === 0 && (
                      <p className="text-[11px] text-info/80 mt-1">
                        No awarded RFQs yet.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold mb-1">
                      Or directly from PR
                    </label>
                    <select
                      className={inputCls(false)}
                      value={prNumber}
                      onChange={(e) => handlePRSelect(e.target.value)}
                      disabled={lockedByRfq}
                    >
                      <option value="">— none —</option>
                      {approvedPRs.map((p) => (
                        <option key={p.number} value={p.number}>
                          {p.number} · {p.title ?? "(untitled)"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {lockedByRfq && (
                  <div className="mt-3 flex items-center justify-between gap-3 text-[11px] bg-info-soft border border-info/30 rounded px-3 py-2">
                    <span>
                      Vendor + items + rates locked from awarded RFQ{" "}
                      <strong>{rfqNumber}</strong>.
                    </span>
                    <button
                      type="button"
                      onClick={unlock}
                      className="text-info font-bold hover:underline"
                    >
                      Unlock to edit
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Vendor & references */}
          <section className="bg-surface-container-lowest rounded-lg p-6 relative border border-border">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-lg" />
            <h2 className="text-lg font-bold text-text mb-5 border-b border-border pb-3 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" /> Vendor &amp; References
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">
                  Vendor *
                </label>
                <select
                  className={inputCls(errors.vendor)}
                  value={vendor}
                  onChange={(e) => {
                    setVendor(e.target.value);
                    clearError("vendor");
                  }}
                  disabled={lockedByRfq}
                >
                  <option value="">Select vendor…</option>
                  {approvedVendors.map((v) => (
                    <option key={v.code} value={v.vendor_name}>
                      {v.vendor_name}
                    </option>
                  ))}
                </select>
                <FieldError message={errors.vendor} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">
                  Business Unit
                </label>
                <select
                  className={inputCls(false)}
                  value={bu}
                  onChange={(e) => setBu(e.target.value)}
                >
                  <option value="">—</option>
                  {BUSINESS_UNITS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">
                  PO Date <span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  required
                  className={inputCls(errors.po_date)}
                  value={poDate}
                  onChange={(e) => {
                    setPoDate(e.target.value);
                    clearError("po_date");
                  }}
                />
                <FieldError message={errors.po_date} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">
                  Expected Delivery <span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  required
                  className={inputCls(errors.expected_delivery)}
                  value={expected}
                  onChange={(e) => {
                    setExpected(e.target.value);
                    clearError("expected_delivery");
                  }}
                />
                <FieldError message={errors.expected_delivery} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">
                  PR Reference
                </label>
                <input
                  className={inputCls(false)}
                  value={prNumber}
                  onChange={(e) => setPrNumber(e.target.value)}
                  placeholder="PR-2026-…"
                  readOnly={lockedByRfq}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">
                  RFQ Reference
                </label>
                <input
                  className={inputCls(false)}
                  value={rfqNumber}
                  onChange={(e) => setRfqNumber(e.target.value)}
                  placeholder="QT-2026-…"
                  readOnly={lockedByRfq}
                />
              </div>
            </div>
          </section>

          {/* Transport accountability (FLOW item 27) */}
          <section className="bg-surface-container-lowest rounded-lg p-6 relative border border-border">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-info rounded-l-lg" />
            <h2 className="text-lg font-bold text-text mb-2 border-b border-border pb-3 flex items-center gap-2">
              <Truck className="h-5 w-5 text-info" /> Transport
            </h2>
            <p className="text-xs text-text-muted mb-4">
              Whoever arranges transport is accountable for damage in transit.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {[
                { v: "vendor", label: "Vendor arranges (FOR / Free on Delivery)", hint: "Supplier vendor is accountable for damage in transit." },
                { v: "buyer",  label: "We arrange (via transport vendor)",        hint: "Transport vendor is accountable for damage in transit." },
              ].map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => {
                    setTransportArrangedBy(opt.v);
                    if (opt.v !== "buyer") {
                      setTransportVendorId("");
                      clearError("transport_vendor_id");
                    }
                  }}
                  className={`text-left p-3 rounded-md border-2 transition-colors ${
                    transportArrangedBy === opt.v
                      ? "border-primary bg-primary-soft/40"
                      : "border-border hover:border-primary/50 bg-surface-container-low"
                  }`}
                >
                  <div className="text-sm font-bold text-text">{opt.label}</div>
                  <div className="text-xs text-text-muted mt-0.5">{opt.hint}</div>
                </button>
              ))}
            </div>
            {transportArrangedBy === "buyer" && (
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">
                  Transport Vendor *
                </label>
                <select
                  className={inputCls(errors.transport_vendor_id)}
                  value={transportVendorId}
                  onChange={(e) => {
                    setTransportVendorId(e.target.value);
                    clearError("transport_vendor_id");
                  }}
                >
                  <option value="">Select transport vendor…</option>
                  {transportVendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.vendor_name}</option>
                  ))}
                </select>
                {transportVendors.length === 0 && (
                  <p className="text-xs text-warning mt-1">
                    No transport-typed vendors in master. Add one via Admin → Vendors (set type to "transport" or "both").
                  </p>
                )}
                <FieldError message={errors.transport_vendor_id} />
              </div>
            )}
          </section>

          {/* Items — one card per line, responsive grid (no horizontal scroll) */}
          <section
            className={`bg-surface-container-lowest rounded-lg p-6 border ${
              errors.items ? "border-danger" : "border-border"
            }`}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-text flex items-center gap-2">
                Line Items
                {lockedByRfq && (
                  <span className="text-[10px] uppercase tracking-widest text-info bg-info-soft border border-info/30 px-2 py-0.5 rounded">
                    Locked from RFQ
                  </span>
                )}
              </h2>
              <button
                type="button"
                onClick={addItem}
                disabled={lockedByRfq}
                className="flex items-center gap-1 text-sm font-bold text-info hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" /> Add Item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((it, idx) => {
                const L = lines[idx];
                const fieldCls =
                  "w-full bg-surface-container-lowest border border-border rounded px-2.5 py-1.5 text-sm text-text outline-none focus:border-primary read-only:opacity-70 read-only:cursor-not-allowed disabled:opacity-70 disabled:cursor-not-allowed";
                const labelCls =
                  "block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1";
                return (
                  <article
                    key={it.id}
                    className="bg-surface-container-low/40 border border-border rounded-md p-4"
                  >
                    {/* Header row: index pill + name + remove */}
                    <div className="flex items-start gap-3 mb-3">
                      <span className="shrink-0 mt-1.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-surface-container-high text-text-muted text-[11px] font-bold">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <label className={labelCls}>Item Name *</label>
                        <input
                          className={fieldCls}
                          value={it.name}
                          onChange={(e) => patchItem(it.id, { name: e.target.value })}
                          placeholder="e.g. Industrial Servo Motor HZ-500"
                          readOnly={lockedByRfq}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(it.id)}
                        disabled={lockedByRfq || items.length === 1}
                        className="shrink-0 mt-6 p-1.5 rounded text-text-muted hover:text-danger hover:bg-danger-soft disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        aria-label="Remove item"
                        title="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Field grid — wraps fluidly */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pl-9">
                      <div>
                        <label className={labelCls}>Code</label>
                        <input
                          className={`${fieldCls} font-mono text-xs`}
                          value={it.code}
                          onChange={(e) => patchItem(it.id, { code: e.target.value })}
                          placeholder="ITM-…"
                          readOnly={lockedByRfq}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>HSN</label>
                        <input
                          className={`${fieldCls} font-mono text-xs`}
                          value={it.hsn_code}
                          onChange={(e) => patchItem(it.id, { hsn_code: e.target.value })}
                          placeholder="HSN"
                          readOnly={lockedByRfq}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>UOM</label>
                        <select
                          className={fieldCls}
                          value={it.uom}
                          onChange={(e) => patchItem(it.id, { uom: e.target.value })}
                          disabled={lockedByRfq}
                        >
                          <option value="">—</option>
                          {UOMS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Qty *</label>
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          className={`${fieldCls} text-right`}
                          value={it.qty}
                          onChange={(e) => patchItem(it.id, { qty: e.target.value })}
                          readOnly={lockedByRfq}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Rate *</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className={`${fieldCls} text-right`}
                          value={it.rate}
                          onChange={(e) => patchItem(it.id, { rate: e.target.value })}
                          readOnly={lockedByRfq}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>GST %</label>
                        <select
                          className={`${fieldCls} text-right`}
                          value={it.gst}
                          onChange={(e) => patchItem(it.id, { gst: e.target.value })}
                          disabled={lockedByRfq}
                        >
                          {GST_OPTIONS.map((g) => (
                            <option key={g} value={g}>
                              {g}%
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Per-line totals strip */}
                    <div className="mt-3 pl-9 flex flex-wrap items-baseline justify-end gap-x-5 gap-y-1 text-xs text-text-muted">
                      <span>
                        Taxable{" "}
                        <span className="font-mono font-semibold text-text">
                          ₹{L.taxable.toFixed(2)}
                        </span>
                      </span>
                      <span>
                        GST{" "}
                        <span className="font-mono font-semibold text-text">
                          ₹{L.gstAmt.toFixed(2)}
                        </span>
                      </span>
                      <span className="text-sm font-bold text-text">
                        Line total{" "}
                        <span className="font-mono text-primary">
                          ₹{L.total.toFixed(2)}
                        </span>
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
            <FieldError message={errors.items} />
          </section>

          {/* Notes */}
          <section className="bg-surface-container-lowest rounded-lg p-6 border border-border">
            <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">
              Notes / Terms
            </label>
            <textarea
              rows={3}
              className={`${inputCls(false)} resize-none`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment terms, delivery specifics…"
            />
          </section>
        </div>

        {/* Summary sidebar */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="sticky top-6 space-y-6">
            <div className="bg-surface-container-lowest rounded-lg p-6 shadow-sm border border-border">
              <h3 className="text-sm font-bold text-text uppercase tracking-wider mb-6">
                Summary
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">Taxable Subtotal</span>
                  <span className="font-mono font-medium">
                    ₹{subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">GST Total</span>
                  <span className="font-mono font-medium">
                    ₹{totalGst.toFixed(2)}
                  </span>
                </div>
                <div className="pt-3 mt-2 border-t border-border flex justify-between items-center">
                  <span className="font-bold text-text">Grand Total</span>
                  <span className="text-xl font-black text-primary font-mono">
                    ₹{grand.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="w-full bg-primary hover:brightness-110 text-primary-foreground py-3 rounded-md font-bold shadow-sm flex items-center justify-center gap-2 text-sm disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {submitting ? "Creating…" : "Create PO"}
              </button>
              <button
                type="button"
                onClick={() => nav("/app/purchase-orders")}
                disabled={submitting}
                className="w-full bg-transparent border border-border text-text py-3 rounded-md font-medium hover:bg-surface-container-low flex items-center justify-center gap-2 text-sm disabled:opacity-60"
              >
                <Save className="h-4 w-4" /> Cancel
              </button>
            </div>

            <div className="text-xs text-text-muted flex items-start gap-2 px-2">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                Once issued, the assigned vendor can accept or reject from their
                portal. Only admin or purchase officer can edit after creation.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
