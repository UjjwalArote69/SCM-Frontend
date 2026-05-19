import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  Package, CheckCircle2, Link2, Loader2, AlertTriangle,
  FileText, Upload, X, Camera, User, MessageSquare, CalendarCheck, Eye,
} from "lucide-react";
import { DocumentPreviewModal } from "../../../components/misc/DocumentPreview.jsx";
import PageHeader from "../../../components/data/PageHeader.jsx";
import { useToast } from "../../../hooks/useToast.jsx";
import { useAuthStore } from "../../auth/store.js";
import { useGRNStore } from "../store.js";
import client from "../../../api/client.js";

// Tax Invoice → success/green (final, GST-bearing).
// Proforma   → warning/amber (provisional, not yet billable).
// Tones are applied by PdfSlot + downstream chips on the Detail page.
const INVOICE_TYPES = [
  { value: "tax_invoice", label: "Tax Invoice", blurb: "GST-bearing, final billing document" },
  { value: "proforma",    label: "Proforma",    blurb: "Provisional invoice — not yet billable" },
];

const inputCls = (err) =>
  `w-full bg-surface-container-lowest border-0 border-b-2 px-3 py-2 text-sm outline-none ${
    err ? "border-danger bg-danger-soft/20" : "border-outline-variant focus:border-primary"
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

  // Item 45: site_person doesn't have /pos visibility — use the slim
  // GRN-create-specific picker endpoint that returns just accepted/fulfilled POs.
  const [eligiblePOs, setEligiblePOs] = useState([]);
  const [poLoading, setPoLoading] = useState(true);

  const grns = useGRNStore((s) => s.items);
  const fetchGRNs = useGRNStore((s) => s.fetchAll);
  const create = useGRNStore((s) => s.create);

  const [poNumber, setPoNumber] = useState("");
  // Item 48: when the URL has ?replaces=GRN-…, this receipt is the
  // replacement for that original damaged GRN. The number is sent with
  // the create payload + a banner surfaces the linkage on the page.
  const replacesGrnNumber = searchParams.get("replaces") || "";
  const [challanNo, setChallanNo] = useState("");
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10));
  const [damageRemark, setDamageRemark] = useState("");
  const [damageBy, setDamageBy] = useState("");
  const [damageComment, setDamageComment] = useState("");

  // Per-item state — keyed by item key (code|name)
  const [received, setReceived] = useState({});
  const [damaged, setDamaged] = useState({});
  const [itemRemarks, setItemRemarks] = useState({});

  // Item 48 — when this is a replacement, hold the original GRN so we can
  // (a) drive the items table to show only the damaged lines, (b) override
  // the Order column with the damaged count, and (c) auto-populate Received
  // with the expected (damaged) count.
  const [originalGrn, setOriginalGrn] = useState(null);

  // Files: tax invoice + proforma (independent slots) + damage photos
  const [taxInvoiceFile, setTaxInvoiceFile] = useState(null);
  const [proformaFile, setProformaFile] = useState(null);
  const [damagePhotos, setDamagePhotos] = useState([]); // [{ file, caption, itemKey }]
  const [proposedTargetDate, setProposedTargetDate] = useState(""); // item 38

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // poLoading is initialised to true at hook-state time, so no need to
    // set it again here (would trip the no-setState-in-effect lint).
    client.get("/grns/eligible-pos")
      .then((r) => {
        if (!cancelled) {
          setEligiblePOs(Array.isArray(r.data?.data) ? r.data.data : []);
          setPoLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setPoLoading(false);
      });
    fetchGRNs();
    return () => { cancelled = true; };
  }, [fetchGRNs]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const qp = searchParams.get("po");
    if (qp && eligiblePOs.some((p) => p.number === qp)) setPoNumber(qp);
  }, [searchParams, eligiblePOs]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Fetch the original GRN when ?replaces=… is set. Used to compute the
  // per-line damaged counts that drive the replacement items table. A stale
  // originalGrn from a previous nav is harmless — `isReplacementMode` also
  // checks `replacesGrnNumber`, so the data is only ever read when both are set.
  useEffect(() => {
    if (!replacesGrnNumber) return;
    let cancelled = false;
    client.get("/grns/" + replacesGrnNumber)
      .then((r) => { if (!cancelled) setOriginalGrn(r.data?.data ?? null); })
      .catch(() => { if (!cancelled) setOriginalGrn(null); });
    return () => { cancelled = true; };
  }, [replacesGrnNumber]);

  const selectedPO = useMemo(
    () => eligiblePOs.find((p) => p.number === poNumber) ?? null,
    [eligiblePOs, poNumber],
  );

  // Item 48 — when in replacement mode, the items table shows only the
  // damaged lines from the original GRN, and each line's "Order" column is
  // overridden to the damaged count (or the vendor-adjusted replace_qty
  // when the vendor reduced it during the accept-replacement flow).
  const isReplacementMode = !!replacesGrnNumber && !!originalGrn;
  const expectedFromOriginal = useMemo(() => {
    if (!isReplacementMode) return null;
    const map = new Map();
    for (const it of originalGrn.items ?? []) {
      const key = it.code || it.name;
      if (!key) continue;
      const qty = (it.replace_qty !== undefined && it.replace_qty !== null)
        ? Number(it.replace_qty)
        : Number(it.damaged) || 0;
      if (qty > 0) map.set(key, qty);
    }
    return map;
  }, [isReplacementMode, originalGrn]);

  // The items rendered in the table. In normal mode: the PO's lines as-is.
  // In replacement mode: only the damaged lines, with `qty` overridden to
  // the expected replacement count so the "Order" column reads correctly.
  const displayItems = useMemo(() => {
    if (!selectedPO) return [];
    const all = selectedPO.items ?? [];
    if (!isReplacementMode || !expectedFromOriginal) return all;
    return all
      .filter((it) => expectedFromOriginal.has(it.code || it.name))
      .map((it) => ({
        ...it,
        qty: expectedFromOriginal.get(it.code || it.name),
      }));
  }, [selectedPO, isReplacementMode, expectedFromOriginal]);

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
    // Seed as empty strings — input shows a placeholder "0" but the user can
    // type any digit as the first character (avoids the "can't remove zero" bug).
    //
    // Item 48 replacement mode: pre-fill Received with the expected count
    // (= damaged from original) since the vendor is delivering exactly that
    // many units. Site_person just has to confirm or tweak.
    const seed = {};
    for (const it of selectedPO.items ?? []) {
      const key = it.code || it.name;
      if (!key) continue;
      const expected = expectedFromOriginal?.get?.(key);
      seed[key] = expected ? String(expected) : "";
    }
    setReceived(seed);
    setDamaged({});
    setItemRemarks({});
  }, [selectedPO, expectedFromOriginal]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Role gate (after all hooks). Driven by the role-permissions matrix
  // (toggled at /admin/roles or /admin/settings → Access Control). Admin
  // implicitly has every permission.
  const canCreate =
    user?.role === "admin" ||
    (Array.isArray(user?.permissions) && user.permissions.includes("grn.create"));
  if (user && !canCreate) {
    return <Navigate to="/app/grn" replace />;
  }

  // Store raw strings while editing so user can clear the field and type freely.
  // Conversion to numbers happens at submit + calculation time.
  const setRecv = (key, raw, max) => {
    let next = raw;
    if (raw !== "") {
      const n = Math.max(0, Math.min(Number(raw) || 0, max));
      next = String(n);
    }
    setReceived((prev) => ({ ...prev, [key]: next }));
    // Auto-clamp damaged ≤ received
    const recvN = Number(next) || 0;
    setDamaged((prev) => {
      const cur = Number(prev[key]) || 0;
      return cur > recvN ? { ...prev, [key]: String(recvN) } : prev;
    });
    setErrors((prev) => { const { items: _i, ...rest } = prev; return rest; });
  };

  const setDmg = (key, raw) => {
    const recv = Number(received[key]) || 0;
    let next = raw;
    if (raw !== "") {
      const n = Math.max(0, Math.min(Number(raw) || 0, recv));
      next = String(n);
    }
    setDamaged((prev) => ({ ...prev, [key]: next }));
  };

  const setAllRemaining = () => {
    if (!selectedPO) return;
    const next = {};
    for (const it of displayItems) {
      const key = it.code || it.name;
      if (!key) continue;
      const ordered = Number(it.qty) || 0;
      // In replacement mode prior receipts on the PO are irrelevant.
      const already = isReplacementMode ? 0 : (priorAccepted[key] ?? 0);
      const remaining = Math.max(0, ordered - already);
      next[key] = remaining > 0 ? String(remaining) : "";
    }
    setReceived(next);
  };

  const totalDamaged = Object.values(damaged).reduce((s, v) => s + (Number(v) || 0), 0);

  const validate = () => {
    const next = {};
    if (!selectedPO) next.po_number = "Pick a PO to receive against.";
    if (!receivedDate) next.received_date = "Receipt date is required.";
    if (selectedPO) {
      const total = Object.values(received).reduce((s, v) => s + (Number(v) || 0), 0);
      if (total <= 0) next.items = "Enter at least one receiving quantity.";
    }
    // Damage details: when any line has damage > 0, the reporter must say who
    // and provide a short description (FLOW item 17).
    if (totalDamaged > 0) {
      if (!damageBy.trim()) next.damage_by = "Required when goods are damaged.";
      if (!damageRemark.trim()) next.damage_remark = "Required when goods are damaged.";
    }
    return next;
  };

  const submit = async () => {
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) {
      toast.error(`${Object.keys(next).length} field${Object.keys(next).length === 1 ? "" : "s"} need attention — see highlighted in red.`);
      return;
    }
    setSubmitting(true);
    try {
      // Build items — only lines with received > 0. In replacement mode
      // `displayItems` already has `qty` overridden to the damaged count
      // from the original GRN, so items[].ordered carries that count into
      // the saved row (the original PO qty stays untouched on the PO).
      const itemsByIdx = [];   // [{ row, originalIdx }] keep position for damage photo linkage
      displayItems.forEach((it) => {
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

      // The GRN's invoice_type field is now derived from what the user attached.
      // Tax invoice takes precedence over proforma when both are present.
      const derivedInvoiceType =
        taxInvoiceFile ? "tax_invoice"
        : proformaFile ? "proforma"
        : null;

      const record = await create({
        po_number: selectedPO.number,
        vendor: selectedPO.vendor,
        challan_no: challanNo.trim() || null,
        received_date: receivedDate,
        invoice_type: derivedInvoiceType,
        damage_remark: damageRemark.trim() || null,
        damage_by: damageBy.trim() || null,
        damage_comment: damageComment.trim() || null,
        // Item 38: site can suggest a redelivery date upfront; vendor may agree
        // or counter from the GRN Detail page. Only attached when damage > 0.
        replacement_target_date: totalDamaged > 0 && proposedTargetDate
          ? proposedTargetDate
          : null,
        // Item 48: link this receipt back to the GRN it replaces (if any).
        replaces_grn_number: replacesGrnNumber || null,
        items: itemsByIdx.map((x) => x.row),
      });

      // Upload tax invoice, proforma, and damage photos. Failures here only
      // toast; the GRN row is already saved.
      let uploadOk = 0, uploadFail = 0;
      const tasks = [];

      if (taxInvoiceFile) {
        tasks.push(uploadDoc(record.number, "tax_invoice", taxInvoiceFile, null, "Tax invoice attached at receipt")
          .then(() => uploadOk++).catch(() => uploadFail++));
      }
      if (proformaFile) {
        tasks.push(uploadDoc(record.number, "proforma", proformaFile, null, "Proforma attached at receipt")
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
        title={replacesGrnNumber ? "Log Replacement Receipt" : "Create GRN"}
        subtitle={replacesGrnNumber
          ? `Logging the replacement delivery for ${replacesGrnNumber}. Goes through the same PM + Purchase HOD approval as a fresh receipt.`
          : "Log goods received against a purchase order. Will be sent to a Project Manager for inspection."}
      />

      {/* Item 48 — visual link back to the original damaged GRN. Now shows
         a plain-English breakdown of why this many units are expected. */}
      {replacesGrnNumber && (() => {
        const totalDamagedFromOrig = expectedFromOriginal
          ? [...expectedFromOriginal.values()].reduce((s, v) => s + v, 0)
          : 0;
        const totalOrigReceived = originalGrn?.items
          ? (originalGrn.items ?? []).reduce((s, it) => s + (Number(it.received) || 0), 0)
          : 0;
        const totalOrigDamaged = originalGrn?.items
          ? (originalGrn.items ?? []).reduce((s, it) => s + (Number(it.damaged) || 0), 0)
          : 0;
        return (
          <section className="bg-info-soft/30 border border-info/30 rounded-md p-3 mb-6">
            <div className="flex items-start gap-3 text-sm">
              <Package className="h-4 w-4 text-info shrink-0 mt-0.5" />
              <div className="text-text">
                <div className="font-semibold">
                  Logging replacement for{" "}
                  <span className="font-mono font-bold text-info">{replacesGrnNumber}</span>
                </div>
                {originalGrn ? (
                  <p className="text-text-muted text-xs mt-1">
                    Original receipt got <span className="font-bold text-text">{totalOrigReceived}</span> units,
                    of which <span className="font-bold text-warning">{totalOrigDamaged}</span> were damaged.
                    {totalDamagedFromOrig > 0 && (
                      <> This GRN expects <span className="font-bold text-text">{totalDamagedFromOrig}</span> replacement
                        unit{totalDamagedFromOrig === 1 ? "" : "s"} — the items table is pre-filled accordingly.</>
                    )}
                  </p>
                ) : (
                  <p className="text-text-muted text-xs mt-1">Loading original receipt details…</p>
                )}
              </div>
            </div>
          </section>
        );
      })()}

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
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Receipt Date <span className="text-danger">*</span></label>
                <input type="date" required value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} className={inputCls(errors.received_date)} />
                <FieldError message={errors.received_date} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Challan / Delivery Note #</label>
                <input value={challanNo} onChange={(e) => setChallanNo(e.target.value)} placeholder="DN-…" className={inputCls(false)} />
              </div>
            </div>
          </section>

          {/* Invoice with shipment — two independent PDF slots */}
          <section className="bg-surface-container-low p-6 rounded-lg mb-6">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-info" />
              <h2 className="text-sm font-bold text-text uppercase tracking-wider">Invoice with shipment</h2>
              <span className="text-xs text-text-subtle">optional · PDF only</span>
            </div>
            <p className="text-xs text-text-muted mb-4">
              Attach the tax invoice, the proforma, or both — each is filed separately on this GRN.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <PdfSlot
                kind="tax_invoice"
                file={taxInvoiceFile}
                onChange={setTaxInvoiceFile}
                onReject={(reason) => toast.error(reason)}
              />
              <PdfSlot
                kind="proforma"
                file={proformaFile}
                onChange={setProformaFile}
                onReject={(reason) => toast.error(reason)}
              />
            </div>
          </section>

          {/* Items table */}
          <section className={`bg-surface-container-lowest rounded-lg overflow-hidden border mb-6 ${errors.items ? "border-danger ring-2 ring-danger/20" : "border-border"}`}>
            <div className="flex justify-between items-center px-6 py-4 border-b border-border">
              <h2 className="text-sm font-bold text-text uppercase tracking-wider">Items</h2>
              <button type="button" onClick={setAllRemaining}
                className="text-xs font-bold text-info hover:underline flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Receive all remaining
              </button>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
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
                {displayItems.map((it, idx) => {
                  const key = it.code || it.name;
                  const ordered = Number(it.qty) || 0;
                  // In replacement mode the prior receipts on the PO are
                  // irrelevant — we're tracking the redelivery of damaged
                  // units, not against the original PO quantity.
                  const already = isReplacementMode ? 0 : (priorAccepted[key] ?? 0);
                  // Display the raw string so the user can clear / type freely.
                  const recvRaw = received[key] ?? "";
                  const dmgRaw = damaged[key] ?? "";
                  const recv = Number(recvRaw) || 0;
                  const dmg = Number(dmgRaw) || 0;
                  const accepted = Math.max(0, recv - dmg);
                  const balance = Math.max(0, ordered - already - accepted);
                  // Item 48 — context line for replacement rows.
                  const origLine = isReplacementMode
                    ? (originalGrn?.items ?? []).find((x) => (x.code || x.name) === key)
                    : null;
                  return (
                    <tr key={`${key}-${idx}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-text">{it.name}</div>
                        {it.code && <div className="text-xs text-info">{it.code}</div>}
                        {origLine && (
                          <div className="text-[10px] text-text-subtle mt-0.5">
                            from <span className="font-mono text-info">{originalGrn.number}</span>:
                            {" "}{Number(origLine.received) || 0} received,
                            {" "}<span className="text-warning">{Number(origLine.damaged) || 0} damaged</span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-text-muted">
                        {ordered}
                        {isReplacementMode && (
                          <div className="text-[10px] text-text-subtle font-normal">expected</div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <input type="number" inputMode="decimal" min="0" max={ordered}
                          placeholder="0" value={recvRaw === "0" ? "" : recvRaw}
                          disabled={ordered === 0}
                          onChange={(e) => setRecv(key, e.target.value, ordered)}
                          className="w-20 bg-surface-container-lowest border-b border-border focus:border-primary px-2 py-1 text-right outline-none disabled:opacity-50" />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <input type="number" inputMode="decimal" min="0" max={recv}
                          placeholder="0" value={dmgRaw === "0" ? "" : dmgRaw}
                          disabled={recv === 0}
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
            </div>
            {errors.items && (
              <p className="px-6 py-3 text-xs text-danger border-t border-border">{errors.items}</p>
            )}
          </section>

          {/* Damage Report — unified card, only shown when any line has damage > 0 */}
          {totalDamaged > 0 && (
            <section className="bg-surface-container-lowest border-2 border-warning/40 rounded-lg overflow-hidden mb-6 shadow-sm">
              {/* Header strip */}
              <div className="bg-warning-soft/60 px-6 py-4 border-b border-warning/30">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-warning/20 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold text-text">Damage Report</h2>
                    <p className="text-xs text-text-muted mt-0.5">
                      <span className="font-semibold text-warning">{totalDamaged} unit{totalDamaged === 1 ? "" : "s"}</span> flagged across {Object.values(damaged).filter((v) => Number(v) > 0).length} line{Object.values(damaged).filter((v) => Number(v) > 0).length === 1 ? "" : "s"}. The vendor will be notified after PM approval.
                    </p>
                  </div>
                </div>
              </div>

              {/* Damaged lines summary */}
              <div className="px-6 py-4 border-b border-warning/20 bg-surface-container-lowest">
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Damaged lines</h3>
                <ul className="space-y-1.5">
                  {displayItems.map((it) => {
                    const key = it.code || it.name;
                    const dmg = Number(damaged[key]) || 0;
                    if (dmg <= 0) return null;
                    return (
                      <li key={key} className="flex items-center gap-2 text-sm">
                        <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
                        <span className="font-medium text-text truncate">{it.name}</span>
                        {it.code && <span className="text-xs text-info">{it.code}</span>}
                        <span className="ml-auto text-xs font-bold text-warning">{dmg} damaged</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Form fields */}
              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`flex items-center gap-1.5 text-xs font-semibold mb-1 uppercase tracking-wider ${errors.damage_by ? "text-danger" : "text-text-muted"}`}>
                      <User className="h-3.5 w-3.5" /> Damaged by *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { v: "vendor", label: "Vendor", hint: "Supplier-side damage" },
                        { v: "self",   label: "Self",   hint: "Our side / in-transit" },
                      ].map((opt) => {
                        const active = damageBy === opt.v;
                        return (
                          <button
                            key={opt.v}
                            type="button"
                            onClick={() => {
                              setDamageBy(opt.v);
                              setErrors((p) => { const { damage_by: _x, ...rest } = p; return rest; });
                            }}
                            className={`text-left px-3 py-2.5 rounded-md border-2 transition-colors ${
                              active
                                ? "border-warning bg-warning-soft/40"
                                : errors.damage_by
                                  ? "border-danger text-danger hover:bg-danger-soft/30"
                                  : "border-border hover:border-warning/40 bg-surface-container-low"
                            }`}
                          >
                            <div className={`text-sm font-bold ${active ? "text-warning" : "text-text"}`}>{opt.label}</div>
                            <div className="text-[10px] text-text-muted mt-0.5">{opt.hint}</div>
                          </button>
                        );
                      })}
                    </div>
                    <FieldError message={errors.damage_by} />
                  </div>
                  <div>
                    <label className={`flex items-center gap-1.5 text-xs font-semibold mb-1 uppercase tracking-wider ${errors.damage_remark ? "text-danger" : "text-text-muted"}`}>
                      <FileText className="h-3.5 w-3.5" /> Short remark *
                    </label>
                    <input value={damageRemark}
                      onChange={(e) => {
                        setDamageRemark(e.target.value);
                        setErrors((p) => { const { damage_remark: _x, ...rest } = p; return rest; });
                      }}
                      placeholder="One-line summary, e.g. 'Crushed corners on boxes 3 + 5'"
                      className={inputCls(errors.damage_remark)} />
                    <FieldError message={errors.damage_remark} />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-text-muted mb-1 uppercase tracking-wider">
                    <MessageSquare className="h-3.5 w-3.5" /> Detailed comment
                  </label>
                  <textarea rows={3} value={damageComment} onChange={(e) => setDamageComment(e.target.value)}
                    placeholder="What was damaged, how, and any context the PM should know during inspection."
                    className={`${inputCls(false)} resize-none`} />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-text-muted mb-2 uppercase tracking-wider">
                    <Camera className="h-3.5 w-3.5" /> Photo evidence
                  </label>
                  <DamagePhotoUploader
                    items={displayItems.filter((it) => (Number(damaged[it.code || it.name]) || 0) > 0)}
                    photos={damagePhotos}
                    onChange={setDamagePhotos}
                  />
                </div>

                {/* Item 38: site can propose a redelivery date. Vendor may
                    counter from their portal; loop until both agree. Leaving
                    this blank just lets the vendor propose first. */}
                <div className="bg-primary-soft/20 border border-primary/20 rounded-md p-3">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-1 uppercase tracking-wider">
                    <CalendarCheck className="h-3.5 w-3.5" /> Proposed redelivery date
                    <span className="text-text-subtle font-normal lowercase">— optional</span>
                  </label>
                  <p className="text-[11px] text-text-muted mb-2">
                    Suggest when you'd like the replacement to arrive. The vendor can accept this date or propose their own — you'll be able to negotiate from the GRN page until both sides agree.
                  </p>
                  <input
                    type="date"
                    min={new Date().toISOString().slice(0, 10)}
                    value={proposedTargetDate}
                    onChange={(e) => setProposedTargetDate(e.target.value)}
                    className="w-full sm:w-56 bg-surface-container-lowest border-2 border-primary/30 focus:border-primary rounded-md px-3 py-2 text-sm outline-none"
                  />
                </div>
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

// ── PDF-only slot card — one per invoice kind (tax_invoice / proforma) ───────
function PdfSlot({ kind, file, onChange, onReject }) {
  const conf = INVOICE_TYPES.find((t) => t.value === kind) ?? INVOICE_TYPES[0];
  const isTax = kind === "tax_invoice";
  const tone = isTax
    ? {
        strip:  "bg-success",
        chip:   "bg-success-soft text-success border-success/30",
        icon:   "text-success",
        border: "border-success/40",
        ring:   "ring-success/20",
        hoverDash: "hover:border-success",
      }
    : {
        strip:  "bg-warning",
        chip:   "bg-warning-soft text-warning border-warning/30",
        icon:   "text-warning",
        border: "border-warning/40",
        ring:   "ring-warning/20",
        hoverDash: "hover:border-warning",
      };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = ""; // re-pick same file should refire onChange
    if (!f) return;
    const isPdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name);
    if (!isPdf) {
      onReject?.(`Only PDF files are accepted for ${conf.label}.`);
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      onReject?.(`${conf.label} PDF is larger than 10 MB.`);
      return;
    }
    onChange(f);
  };

  return (
    <div className={`relative rounded-md border-2 ${tone.border} ${file ? `ring-2 ${tone.ring}` : ""} bg-surface-container-lowest overflow-hidden`}>
      <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${tone.strip}`} />
      <div className="pl-4 pr-3 py-3">
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${tone.chip}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${tone.strip}`} />
            {conf.label}
          </span>
          <span className="text-[10px] text-text-subtle">{conf.blurb}</span>
        </div>
        {file ? (
          <div className="flex items-center gap-2">
            <FileText className={`h-4 w-4 ${tone.icon} shrink-0`} />
            <span className="text-xs font-medium text-text truncate flex-1" title={file.name}>{file.name}</span>
            <span className="text-[10px] text-text-subtle whitespace-nowrap">{(file.size / 1024).toFixed(0)} KB</span>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-text-muted hover:text-danger shrink-0"
              title={`Remove ${conf.label}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className={`flex items-center gap-2 text-xs text-text-muted cursor-pointer border border-dashed border-border ${tone.hoverDash} rounded-md px-3 py-2 transition-colors`}>
            <Upload className="h-3.5 w-3.5" />
            <span>Click to attach {conf.label} PDF · up to 10 MB</span>
            <input type="file" accept="application/pdf,.pdf" onChange={handleFile} className="hidden" />
          </label>
        )}
      </div>
    </div>
  );
}

// ── Damage-photo uploader: pick item, attach file, optional caption ──────────
/**
 * Damage-photo uploader with live thumbnail previews (matches PR's preview
 * pattern). The local `File` is wrapped in a blob URL via URL.createObjectURL
 * so site_person can see what they're about to submit before the GRN is
 * persisted. Click the thumbnail → opens the same DocumentPreviewModal used
 * by GRN Detail and PR.
 *
 * Blob URLs are revoked when the photo is removed or the component unmounts —
 * keeps memory tidy across multi-file selections.
 */
function DamagePhotoUploader({ items, photos, onChange }) {
  // photo: { file, caption, itemKey, previewUrl }
  // previewUrl is created here on file-add and revoked here on remove/unmount.
  const [previewing, setPreviewing] = useState(null); // { url, name, kind }

  useEffect(() => {
    return () => {
      // Component unmount → revoke every preview URL we ever created.
      photos.forEach((p) => { if (p.previewUrl) URL.revokeObjectURL(p.previewUrl); });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const add = (e) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const itemKey = items[0] ? (items[0].code || items[0].name) : "";
    const next = [
      ...photos,
      ...files.map((f) => ({
        file: f,
        caption: "",
        itemKey,
        previewUrl: f.type?.startsWith("image/") ? URL.createObjectURL(f) : null,
      })),
    ];
    onChange(next);
    e.target.value = "";
  };
  const update = (i, patch) =>
    onChange(photos.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const remove = (i) => {
    const p = photos[i];
    if (p?.previewUrl) URL.revokeObjectURL(p.previewUrl);
    onChange(photos.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-3">
      <label className="inline-flex items-center gap-2 px-3 py-2 border-2 border-dashed border-border hover:border-primary text-text-muted hover:text-primary rounded-md text-sm font-semibold cursor-pointer">
        <Camera className="h-4 w-4" /> Add photos
        <input type="file" accept="image/*" multiple onChange={add} className="hidden" />
      </label>
      {photos.length === 0 ? (
        <p className="text-xs text-text-subtle">No photos yet. Optional but strongly recommended.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map((p, i) => (
            <div key={i} className="rounded-lg border border-border bg-surface-container-lowest overflow-hidden flex flex-col">
              {/* Thumbnail with hover-reveal preview overlay */}
              <button
                type="button"
                onClick={() => p.previewUrl && setPreviewing({ url: p.previewUrl, name: p.file.name, kind: "image" })}
                disabled={!p.previewUrl}
                className="group relative aspect-square bg-surface-container-low overflow-hidden block w-full"
                title={p.previewUrl ? "Click to enlarge" : "No preview available"}
              >
                {p.previewUrl ? (
                  <img
                    src={p.previewUrl}
                    alt={p.caption || p.file.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.04]"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-text-subtle">
                    <Camera className="h-8 w-8" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
                  <div className="bg-bg/95 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold inline-flex items-center gap-1 shadow-md">
                    <Eye className="h-3 w-3" /> Click to enlarge
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); remove(i); }}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-bg/90 hover:bg-danger hover:text-primary-foreground text-text-muted flex items-center justify-center shadow-sm transition-colors"
                  title="Remove"
                  aria-label="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </button>

              {/* Meta + item-link + caption */}
              <div className="p-2 space-y-1.5 border-t border-border">
                <div className="text-[11px] font-medium text-text truncate" title={p.file.name}>
                  {p.file.name}
                </div>
                <div className="text-[10px] text-text-subtle">
                  {(p.file.size / 1024).toFixed(0)} KB
                </div>
                <select
                  value={p.itemKey}
                  onChange={(e) => update(i, { itemKey: e.target.value })}
                  className="w-full text-[11px] bg-surface-container-low border border-border rounded px-2 py-1 outline-none"
                  title="Link to damaged line"
                >
                  {items.map((it) => {
                    const k = it.code || it.name;
                    return <option key={k} value={k}>{k}</option>;
                  })}
                </select>
                <input
                  value={p.caption}
                  onChange={(e) => update(i, { caption: e.target.value })}
                  placeholder="Caption (optional)"
                  className="w-full text-[11px] bg-transparent border-b border-border focus:border-primary px-1 py-1 outline-none"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {previewing && (
        <DocumentPreviewModal
          url={previewing.url}
          name={previewing.name}
          kind={previewing.kind}
          onClose={() => setPreviewing(null)}
        />
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
