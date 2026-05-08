import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  Package, CheckCircle2, Link2, Loader2, AlertTriangle,
  FileText, Upload, X, Camera,
} from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import { useToast } from "../../../hooks/useToast.jsx";
import { useAuthStore } from "../../auth/store.js";
import { usePOStore } from "../../purchase-orders/store.js";
import { useGRNStore } from "../store.js";
import client from "../../../api/client.js";

// FLOW.md item 16 — only site staff (or admin) can create a GRN.
const WAREHOUSE_ROLES = new Set(["admin", "site_person"]);

const INVOICE_TYPES = [
  { value: "tax_invoice", label: "Tax Invoice" },
  { value: "proforma",    label: "Proforma" },
  { value: "invoice",     label: "Invoice" },
  { value: "none",        label: "No invoice yet" },
];

const inputCls = (err) =>
  `w-full bg-surface-container-lowest border-0 border-b-2 px-3 py-2 text-sm outline-none ${
    err ? "border-danger" : "border-outline-variant focus:border-primary"
  }`;

function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-xs text-danger mt-1">{message}</p>;
}

export default function GRNCreatePage() {
  const nav = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);

  const pos = usePOStore((s) => s.items);
  const poLoading = usePOStore((s) => s.loading);
  const fetchPOs = usePOStore((s) => s.fetchAll);

  const grns = useGRNStore((s) => s.items);
  const fetchGRNs = useGRNStore((s) => s.fetchAll);
  const create = useGRNStore((s) => s.create);

  const [poNumber, setPoNumber] = useState("");
  const [challanNo, setChallanNo] = useState("");
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10));
  const [invoiceType, setInvoiceType] = useState("tax_invoice");
  const [damageRemark, setDamageRemark] = useState("");
  const [damageBy, setDamageBy] = useState("");
  const [damageComment, setDamageComment] = useState("");

  // Per-item state — keyed by item key (code|name)
  const [received, setReceived] = useState({});
  const [damaged, setDamaged] = useState({});
  const [itemRemarks, setItemRemarks] = useState({});

  // Files: invoice doc + damage photos
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [damagePhotos, setDamagePhotos] = useState([]); // [{ file, caption, itemKey }]

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchPOs(); fetchGRNs(); }, [fetchPOs, fetchGRNs]);

  const eligiblePOs = useMemo(
    () => pos.filter((p) => p.status === "accepted" || p.status === "fulfilled"),
    [pos],
  );

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const qp = searchParams.get("po");
    if (qp && eligiblePOs.some((p) => p.number === qp)) setPoNumber(qp);
  }, [searchParams, eligiblePOs]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const selectedPO = useMemo(
    () => eligiblePOs.find((p) => p.number === poNumber) ?? null,
    [eligiblePOs, poNumber],
  );

  // Sum prior accepted qty (received - damaged) for each item
  const priorAccepted = useMemo(() => {
    if (!selectedPO) return {};
    const acc = {};
    for (const g of grns) {
      if (g.po_number !== selectedPO.number) continue;
      // Only count GRNs that haven't been rejected
      if (g.status === "rejected") continue;
      for (const it of g.items ?? []) {
        const key = it.code || it.name;
        if (!key) continue;
        const accepted = (Number(it.received) || 0) - (Number(it.damaged) || 0);
        acc[key] = (acc[key] ?? 0) + Math.max(0, accepted);
      }
    }
    return acc;
  }, [grns, selectedPO]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!selectedPO) {
      setReceived({}); setDamaged({}); setItemRemarks({});
      return;
    }
    const seed = {};
    for (const it of selectedPO.items ?? []) {
      const key = it.code || it.name;
      if (key) seed[key] = 0;
    }
    setReceived(seed);
    setDamaged({});
    setItemRemarks({});
  }, [selectedPO]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Role gate (after all hooks)
  if (user && !WAREHOUSE_ROLES.has(user.role)) {
    return <Navigate to="/app/grn" replace />;
  }

  const setRecv = (key, raw, max) => {
    const n = Math.max(0, Math.min(Number(raw) || 0, max));
    setReceived((prev) => ({ ...prev, [key]: n }));
    // Auto-clamp damaged ≤ received
    setDamaged((prev) => {
      const cur = prev[key] ?? 0;
      return cur > n ? { ...prev, [key]: n } : prev;
    });
    setErrors((prev) => { const { items: _i, ...rest } = prev; return rest; });
  };

  const setDmg = (key, raw) => {
    const recv = Number(received[key]) || 0;
    const n = Math.max(0, Math.min(Number(raw) || 0, recv));
    setDamaged((prev) => ({ ...prev, [key]: n }));
  };

  const setAllRemaining = () => {
    if (!selectedPO) return;
    const next = {};
    for (const it of selectedPO.items ?? []) {
      const key = it.code || it.name;
      if (!key) continue;
      const ordered = Number(it.qty) || 0;
      const already = priorAccepted[key] ?? 0;
      next[key] = Math.max(0, ordered - already);
    }
    setReceived(next);
  };

  const validate = () => {
    const next = {};
    if (!selectedPO) next.po_number = "Pick a PO to receive against.";
    if (!receivedDate) next.received_date = "Receipt date is required.";
    if (selectedPO) {
      const total = Object.values(received).reduce((s, v) => s + (Number(v) || 0), 0);
      if (total <= 0) next.items = "Enter at least one receiving quantity.";
    }
    return next;
  };

  const totalDamaged = Object.values(damaged).reduce((s, v) => s + (Number(v) || 0), 0);

  const submit = async () => {
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) {
      toast.error("Please correct the highlighted fields.");
      return;
    }
    setSubmitting(true);
    try {
      // Build items — only lines with received > 0
      const itemsByIdx = [];   // [{ row, originalIdx }] keep position for damage photo linkage
      (selectedPO.items ?? []).forEach((it, idx) => {
        const key = it.code || it.name;
        const recv = Number(received[key]) || 0;
        if (recv <= 0) return;
        const dmg = Number(damaged[key]) || 0;
        itemsByIdx.push({
          originalIdx: itemsByIdx.length, // index in submitted items[]
          itemKey: key,
          row: {
            name: it.name,
            code: it.code || null,
            ordered: Number(it.qty) || 0,
            received: recv,
            damaged: dmg,
            remark: itemRemarks[key]?.trim() || null,
          },
        });
      });

      const record = await create({
        po_number: selectedPO.number,
        vendor: selectedPO.vendor,
        challan_no: challanNo.trim() || null,
        received_date: receivedDate,
        invoice_type: invoiceType,
        damage_remark: damageRemark.trim() || null,
        damage_by: damageBy.trim() || null,
        damage_comment: damageComment.trim() || null,
        items: itemsByIdx.map((x) => x.row),
      });

      // Upload invoice + damage photos. Failures here only toast; the GRN is saved.
      let uploadOk = 0, uploadFail = 0;
      const tasks = [];

      if (invoiceFile) {
        tasks.push(uploadDoc(record.number, invoiceType, invoiceFile, null, "Invoice doc")
          .then(() => uploadOk++).catch(() => uploadFail++));
      }
      damagePhotos.forEach((p) => {
        const idx = itemsByIdx.find((x) => x.itemKey === p.itemKey)?.originalIdx ?? null;
        tasks.push(uploadDoc(record.number, "damage_photo", p.file, idx, p.caption)
          .then(() => uploadOk++).catch(() => uploadFail++));
      });
      await Promise.all(tasks);

      const tail = uploadFail > 0
        ? ` — ${uploadOk} of ${tasks.length} attachments uploaded`
        : tasks.length > 0
          ? ` with ${uploadOk} attachment${uploadOk === 1 ? "" : "s"}`
          : "";
      toast.success(`${record.number} logged${tail} — awaiting PM approval`);
      nav(`/app/grn/${record.number}`);
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
      toast.error(err?.response?.data?.message ?? "Could not log GRN");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-8">
      <PageHeader
        title="Create GRN"
        subtitle="Log goods received against a purchase order. Will be sent to a Project Manager for inspection."
      />

      {/* PO selector */}
      <section className="bg-surface-container-low p-6 rounded-lg mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Link2 className="h-4 w-4 text-info" />
          <h2 className="text-sm font-bold text-text uppercase tracking-wider">Source PO</h2>
        </div>
        {poLoading && eligiblePOs.length === 0 ? (
          <div className="text-sm text-text-muted py-2">
            <Loader2 className="inline-block h-4 w-4 animate-spin mr-2" /> Loading POs…
          </div>
        ) : eligiblePOs.length === 0 ? (
          <p className="text-sm text-text-muted">
            No accepted POs available — a vendor must accept a PO before you can log a GRN.
          </p>
        ) : (
          <>
            <select className={inputCls(errors.po_number)} value={poNumber} onChange={(e) => setPoNumber(e.target.value)}>
              <option value="">— pick a PO —</option>
              {eligiblePOs.map((p) => (
                <option key={p.number} value={p.number}>
                  {p.number} · {p.vendor} · {p.status}
                </option>
              ))}
            </select>
            <FieldError message={errors.po_number} />
          </>
        )}
      </section>

      {selectedPO && (
        <>
          {/* Receipt meta */}
          <section className="bg-surface-container-low p-6 rounded-lg mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Vendor</label>
                <div className="px-3 py-2 text-sm font-medium text-text">{selectedPO.vendor}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Receipt Date *</label>
                <input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} className={inputCls(errors.received_date)} />
                <FieldError message={errors.received_date} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Challan / Delivery Note #</label>
                <input value={challanNo} onChange={(e) => setChallanNo(e.target.value)} placeholder="DN-…" className={inputCls(false)} />
              </div>
            </div>
          </section>

          {/* Invoice */}
          <section className="bg-surface-container-low p-6 rounded-lg mb-6">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-info" />
              <h2 className="text-sm font-bold text-text uppercase tracking-wider">Invoice with shipment</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Invoice Type</label>
                <div className="flex gap-2 flex-wrap">
                  {INVOICE_TYPES.map((t) => (
                    <button key={t.value} type="button"
                      onClick={() => setInvoiceType(t.value)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md border ${
                        invoiceType === t.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-text-muted hover:border-primary/50"
                      }`}
                    >{t.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Attach invoice file (optional)</label>
                <FilePicker
                  file={invoiceFile}
                  onChange={setInvoiceFile}
                  accept="application/pdf,image/*"
                  hint="PDF or image, up to 10 MB"
                />
              </div>
            </div>
          </section>

          {/* Items table */}
          <section className="bg-surface-container-lowest rounded-lg overflow-hidden border border-border mb-6">
            <div className="flex justify-between items-center px-6 py-4 border-b border-border">
              <h2 className="text-sm font-bold text-text uppercase tracking-wider">Items</h2>
              <button type="button" onClick={setAllRemaining}
                className="text-xs font-bold text-info hover:underline flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Receive all remaining
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-container-low text-xs font-semibold text-text-muted uppercase">
                  <th className="px-4 py-3 text-left">Item</th>
                  <th className="px-3 py-3 text-right">Order</th>
                  <th className="px-3 py-3 text-right">Received</th>
                  <th className="px-3 py-3 text-right">Damaged</th>
                  <th className="px-3 py-3 text-right">Accepted</th>
                  <th className="px-3 py-3 text-right">Balance</th>
                  <th className="px-3 py-3 text-left">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(selectedPO.items ?? []).map((it, idx) => {
                  const key = it.code || it.name;
                  const ordered = Number(it.qty) || 0;
                  const already = priorAccepted[key] ?? 0;
                  const remaining = Math.max(0, ordered - already);
                  const recv = Number(received[key]) || 0;
                  const dmg = Number(damaged[key]) || 0;
                  const accepted = Math.max(0, recv - dmg);
                  const balance = Math.max(0, ordered - already - accepted);
                  const max = remaining + 0.0001;
                  return (
                    <tr key={`${key}-${idx}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-text">{it.name}</div>
                        {it.code && <div className="text-xs text-info">{it.code}</div>}
                      </td>
                      <td className="px-3 py-3 text-right text-text-muted">{ordered}</td>
                      <td className="px-3 py-3 text-right">
                        <input type="number" min="0" max={max} value={recv} disabled={remaining === 0}
                          onChange={(e) => setRecv(key, e.target.value, max)}
                          className="w-20 bg-surface-container-lowest border-b border-border focus:border-primary px-2 py-1 text-right outline-none disabled:opacity-50" />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <input type="number" min="0" max={recv} value={dmg} disabled={recv === 0}
                          onChange={(e) => setDmg(key, e.target.value)}
                          className={`w-20 bg-surface-container-lowest border-b ${dmg > 0 ? "border-warning text-warning" : "border-border"} focus:border-primary px-2 py-1 text-right outline-none disabled:opacity-50`} />
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-success">{accepted}</td>
                      <td className={`px-3 py-3 text-right font-medium ${balance === 0 ? "text-success" : "text-warning"}`}>{balance}</td>
                      <td className="px-3 py-3">
                        <input value={itemRemarks[key] ?? ""} onChange={(e) => setItemRemarks((p) => ({ ...p, [key]: e.target.value }))}
                          placeholder="—"
                          className="w-full bg-transparent border-b border-border focus:border-primary px-2 py-1 text-xs outline-none" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {errors.items && (
              <p className="px-6 py-3 text-xs text-danger border-t border-border">{errors.items}</p>
            )}
          </section>

          {/* Damage details — only relevant if any damage reported */}
          {totalDamaged > 0 && (
            <section className="bg-warning-soft/30 border border-warning/30 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <h2 className="text-sm font-bold text-text uppercase tracking-wider">Damage report</h2>
                <span className="text-xs text-warning font-semibold">{totalDamaged} unit{totalDamaged === 1 ? "" : "s"} flagged</span>
              </div>
              <p className="text-xs text-text-muted mb-4">
                The vendor will be asked to acknowledge and replace the damaged stock before the PO is fulfilled.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">By whom (carrier / vendor / other)</label>
                  <input value={damageBy} onChange={(e) => setDamageBy(e.target.value)} placeholder="Courier, vendor, in-transit…" className={inputCls(false)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Short remark</label>
                  <input value={damageRemark} onChange={(e) => setDamageRemark(e.target.value)} placeholder="Boxes 3 + 5 had crushed corners" className={inputCls(false)} />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Detailed comment</label>
                <textarea rows={2} value={damageComment} onChange={(e) => setDamageComment(e.target.value)}
                  placeholder="What was damaged and how. Helps the PM during inspection."
                  className={`${inputCls(false)} resize-none`} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-2 uppercase">Photos of damaged items</label>
                <DamagePhotoUploader
                  items={(selectedPO.items ?? []).filter((it) => (Number(damaged[it.code || it.name]) || 0) > 0)}
                  photos={damagePhotos}
                  onChange={setDamagePhotos}
                />
              </div>
            </section>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-3 mb-8">
            <button type="button" onClick={() => nav("/app/grn")}
              className="px-5 py-2 text-sm font-medium text-text border border-border rounded-md hover:bg-surface-container-low">Cancel</button>
            <button type="button" onClick={submit} disabled={submitting}
              className="px-6 py-2 text-sm font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-md flex items-center gap-2 disabled:opacity-60">
              {submitting
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Logging…</>
                : <><Package className="h-4 w-4" /> Submit for PM approval</>}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── File picker (single file) ────────────────────────────────────────────────
function FilePicker({ file, onChange, accept, hint }) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="file"
        accept={accept}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className="text-xs text-text-muted file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:text-xs file:font-bold file:cursor-pointer hover:file:brightness-110"
      />
      {file && (
        <button type="button" onClick={() => onChange(null)} className="text-text-muted hover:text-danger">
          <X className="h-4 w-4" />
        </button>
      )}
      {!file && hint && <span className="text-xs text-text-subtle">{hint}</span>}
      {file && <span className="text-xs text-text truncate max-w-[160px]">{file.name}</span>}
    </div>
  );
}

// ── Damage-photo uploader: pick item, attach file, optional caption ──────────
function DamagePhotoUploader({ items, photos, onChange }) {
  const add = (e) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const itemKey = items[0] ? (items[0].code || items[0].name) : "";
    const next = [...photos, ...files.map((f) => ({ file: f, caption: "", itemKey }))];
    onChange(next);
    e.target.value = "";
  };
  const update = (i, patch) => onChange(photos.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const remove = (i) => onChange(photos.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <label className="inline-flex items-center gap-2 px-3 py-2 border-2 border-dashed border-border hover:border-primary text-text-muted hover:text-primary rounded-md text-sm font-semibold cursor-pointer">
        <Camera className="h-4 w-4" /> Add photos
        <input type="file" accept="image/*" multiple onChange={add} className="hidden" />
      </label>
      {photos.length === 0 ? (
        <p className="text-xs text-text-subtle">No photos yet. Optional but strongly recommended.</p>
      ) : (
        <ul className="space-y-2">
          {photos.map((p, i) => (
            <li key={i} className="flex items-center gap-3 bg-surface-container-lowest border border-border rounded-md p-2">
              <Upload className="h-4 w-4 text-text-muted shrink-0" />
              <span className="text-xs text-text truncate max-w-[200px]">{p.file.name}</span>
              <select value={p.itemKey}
                onChange={(e) => update(i, { itemKey: e.target.value })}
                className="text-xs bg-surface-container-low border border-border rounded px-2 py-1 outline-none">
                {items.map((it) => {
                  const k = it.code || it.name;
                  return <option key={k} value={k}>{k}</option>;
                })}
              </select>
              <input
                value={p.caption}
                onChange={(e) => update(i, { caption: e.target.value })}
                placeholder="Caption (optional)"
                className="flex-1 text-xs bg-transparent border-b border-border focus:border-primary px-2 py-1 outline-none"
              />
              <button type="button" onClick={() => remove(i)} className="text-text-muted hover:text-danger">
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Document upload helper ──────────────────────────────────────────────────
async function uploadDoc(grnNumber, docType, file, itemIndex, caption) {
  const fd = new FormData();
  fd.append("grn_number", grnNumber);
  fd.append("doc_type", docType);
  if (itemIndex !== null && itemIndex !== undefined) fd.append("item_index", String(itemIndex));
  if (caption) fd.append("caption", caption);
  fd.append("file", file);
  return client.post("/grn-documents", fd, { headers: { "Content-Type": "multipart/form-data" } });
}
