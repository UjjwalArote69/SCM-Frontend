import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Package, CheckCircle2, Link2, Loader2 } from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import { useToast } from "../../../hooks/useToast.jsx";
import { useAuthStore } from "../../auth/store.js";
import { usePOStore } from "../../purchase-orders/store.js";
import { useGRNStore } from "../store.js";

// Mirrors backend WAREHOUSE_ROLES in GrnController
const WAREHOUSE_ROLES = new Set([
  "admin",
  "purchase_officer",
  "manager",
  "hod",
  "cfo",
  "ceo",
  "employee",
]);

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
  const [receivedDate, setReceivedDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [received, setReceived] = useState({}); // { [code-or-name]: number }
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPOs();
    fetchGRNs();
  }, [fetchPOs, fetchGRNs]);

  // GRN-eligible POs: accepted (in flight) or fulfilled (allow over-deliveries)
  const eligiblePOs = useMemo(
    () => pos.filter((p) => p.status === "accepted" || p.status === "fulfilled"),
    [pos],
  );

  // Deep-link: ?po=PO-2026-…
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

  // Sum prior receipts for this PO so the user sees remaining qty
  const priorReceived = useMemo(() => {
    if (!selectedPO) return {};
    const acc = {};
    for (const g of grns) {
      if (g.po_number !== selectedPO.number) continue;
      for (const it of g.items ?? []) {
        const key = it.code || it.name;
        if (!key) continue;
        acc[key] = (acc[key] ?? 0) + (Number(it.received) || 0);
      }
    }
    return acc;
  }, [grns, selectedPO]);

  // Reset receipts when PO changes
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!selectedPO) {
      setReceived({});
      return;
    }
    const seed = {};
    for (const it of selectedPO.items ?? []) {
      const key = it.code || it.name;
      if (key) seed[key] = 0;
    }
    setReceived(seed);
  }, [selectedPO]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Role gate (after all hooks)
  if (user && !WAREHOUSE_ROLES.has(user.role)) {
    return <Navigate to="/app/grn" replace />;
  }

  const setQty = (key, raw, max) => {
    const n = Math.max(0, Math.min(Number(raw) || 0, max));
    setReceived((prev) => ({ ...prev, [key]: n }));
    setErrors((prev) => {
      if (!prev.items) return prev;
      const { items: _i, ...rest } = prev;
      return rest;
    });
  };

  const setAllRemaining = () => {
    if (!selectedPO) return;
    const next = {};
    for (const it of selectedPO.items ?? []) {
      const key = it.code || it.name;
      if (!key) continue;
      const ordered = Number(it.qty) || 0;
      const already = priorReceived[key] ?? 0;
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

  const submit = async () => {
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) {
      toast.error("Please correct the highlighted fields.");
      return;
    }
    setSubmitting(true);
    try {
      const items = (selectedPO.items ?? [])
        .map((it) => {
          const key = it.code || it.name;
          return {
            name: it.name,
            code: it.code || null,
            ordered: Number(it.qty) || 0,
            received: Number(received[key]) || 0,
          };
        })
        .filter((row) => row.received > 0);

      const record = await create({
        po_number: selectedPO.number,
        vendor: selectedPO.vendor,
        challan_no: challanNo.trim() || null,
        received_date: receivedDate,
        items,
      });
      toast.success(`${record.number} logged — ${record.status} delivery`);
      nav("/app/grn");
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
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title="Create GRN"
        subtitle="Log goods received against a purchase order"
      />

      {/* PO selector */}
      <section className="bg-surface-container-low p-6 rounded-lg mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Link2 className="h-4 w-4 text-info" />
          <h2 className="text-sm font-bold text-text uppercase tracking-wider">
            Source PO
          </h2>
        </div>
        {poLoading && eligiblePOs.length === 0 ? (
          <div className="text-sm text-text-muted py-2">
            <Loader2 className="inline-block h-4 w-4 animate-spin mr-2" />
            Loading POs…
          </div>
        ) : eligiblePOs.length === 0 ? (
          <p className="text-sm text-text-muted">
            No accepted POs are available — a vendor must accept a PO before you
            can log a GRN.
          </p>
        ) : (
          <>
            <select
              className={inputCls(errors.po_number)}
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
            >
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
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">
                  Vendor
                </label>
                <div className="px-3 py-2 text-sm font-medium text-text">
                  {selectedPO.vendor}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">
                  Receipt Date *
                </label>
                <input
                  type="date"
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                  className={inputCls(errors.received_date)}
                />
                <FieldError message={errors.received_date} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">
                  Challan / Delivery Note
                </label>
                <input
                  value={challanNo}
                  onChange={(e) => setChallanNo(e.target.value)}
                  placeholder="DN-…"
                  className={inputCls(false)}
                />
              </div>
            </div>
          </section>

          {/* Items */}
          <section className="bg-surface-container-lowest rounded-lg overflow-hidden border border-border mb-6">
            <div className="flex justify-between items-center px-6 py-4 border-b border-border">
              <h2 className="text-sm font-bold text-text uppercase tracking-wider">
                Items
              </h2>
              <button
                type="button"
                onClick={setAllRemaining}
                className="text-xs font-bold text-info hover:underline flex items-center gap-1"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Receive all remaining
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-container-low text-xs font-semibold text-text-muted uppercase">
                  <th className="px-6 py-3 text-left">Item</th>
                  <th className="px-6 py-3 text-right">Ordered</th>
                  <th className="px-6 py-3 text-right">Already received</th>
                  <th className="px-6 py-3 text-right">Remaining</th>
                  <th className="px-6 py-3 text-right">Receiving now</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(selectedPO.items ?? []).map((it, idx) => {
                  const key = it.code || it.name;
                  const ordered = Number(it.qty) || 0;
                  const already = priorReceived[key] ?? 0;
                  const remaining = Math.max(0, ordered - already);
                  const recv = Number(received[key]) || 0;
                  const max = remaining + 0.0001;
                  return (
                    <tr key={`${key}-${idx}`}>
                      <td className="px-6 py-4">
                        <div className="font-medium text-text">{it.name}</div>
                        {it.code && (
                          <div className="text-xs text-info">{it.code}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-text-muted">
                        {ordered}
                      </td>
                      <td className="px-6 py-4 text-right text-text-muted">
                        {already}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={
                            remaining === 0
                              ? "text-success font-medium"
                              : "text-text-muted"
                          }
                        >
                          {remaining}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <input
                          type="number"
                          min="0"
                          max={max}
                          value={recv}
                          disabled={remaining === 0}
                          onChange={(e) => setQty(key, e.target.value, max)}
                          className="w-24 bg-surface-container-lowest border-b border-border focus:border-primary px-2 py-1 text-right outline-none disabled:opacity-50"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {errors.items && (
              <p className="px-6 py-3 text-xs text-danger border-t border-border">
                {errors.items}
              </p>
            )}
          </section>

          {/* Footer */}
          <div className="flex justify-end gap-3 mb-8">
            <button
              type="button"
              onClick={() => nav("/app/grn")}
              className="px-5 py-2 text-sm font-medium text-text border border-border rounded-md hover:bg-surface-container-low"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="px-6 py-2 text-sm font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-md flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Logging…
                </>
              ) : (
                <>
                  <Package className="h-4 w-4" /> Submit GRN
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
