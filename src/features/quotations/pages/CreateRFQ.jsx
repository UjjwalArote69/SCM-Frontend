import { useEffect, useState } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import {
  Plus,
  Trash2,
  Users,
  AlertCircle,
  Loader2,
  Search,
  Link2,
  UserPlus,
  X,
  Cpu,
  Zap,
  Sofa,
  Sparkles,
  Cog,
  FileText,
  ShieldAlert,
  Box,
  Wrench,
  Tag,
  Check,
} from "lucide-react";
import { useRFQStore } from "../store.js";
import { useVendorsStore } from "../../masters/vendors/store.js";
import { usePRStore } from "../../purchase-requests/store.js";
import { useAuthStore } from "../../auth/store.js";
import { useToast } from "../../../hooks/useToast.jsx";

// Mirrors RfqController::canWriteRfq — admin, purchase_officer, OR HOD of
// Procurement / Purchase. The HOD has both options: create directly here,
// or delegate via "Assign RFQ author" on PR Detail. Generic HODs (IT, FIN,
// etc.) still can't author.
const RFQ_WRITE_HOD_DEPT_CODES = new Set(["PROC", "PURCH"]);
function canWriteRfq(user) {
  if (!user) return false;
  if (user.role === "admin" || user.role === "purchase_officer") return true;
  if (user.role === "hod") {
    return RFQ_WRITE_HOD_DEPT_CODES.has(user.department?.code);
  }
  return false;
}

const UOMS = ["EA", "KG", "RL", "SET", "BOX", "LTR", "MTR", "PCS", "NOS"];

// Item code prefix → vendor category. Mirrors DemoCatalogSeeder + DemoVendorsSeeder.
// When a PR is linked, we use this map to derive which categories are needed
// and auto-select all vendors registered in those categories.
const CATALOG_PREFIX_CATEGORY = {
  IT: "IT Equipment",
  ELE: "Electrical",
  FUR: "Furniture",
  HSK: "Housekeeping",
  MRO: "Industrial / MRO",
  OFF: "Office Supplies",
  PPE: "PPE / Safety",
  RAW: "Raw Material",
  TOL: "Hardware / Tools",
};

/** Resolve an item's category from its code (`MK-IT-0001` → "IT Equipment"). */
function categoryOfItem(code) {
  if (!code) return null;
  const m = String(code).match(/^MK-([A-Z]+)-/);
  return m ? CATALOG_PREFIX_CATEGORY[m[1]] ?? null : null;
}

// Per-category visual identity. Icon + tone keep each section visually
// distinct. Red/danger is reserved for actual error/rejected states across
// the app — categories use semantic info/warning/success/neutral plus two
// non-semantic accents (purple, teal) so nothing here can be misread as
// a bad state.
const CATEGORY_META = {
  "IT Equipment":     { icon: Cpu,         tone: "info",    order: 1 },
  "Electrical":       { icon: Zap,         tone: "warning", order: 2 },
  "Furniture":        { icon: Sofa,        tone: "neutral", order: 3 },
  "Housekeeping":     { icon: Sparkles,    tone: "success", order: 4 },
  "Industrial / MRO": { icon: Cog,         tone: "purple",  order: 5 },
  "Office Supplies":  { icon: FileText,    tone: "info",    order: 6 },
  "PPE / Safety":     { icon: ShieldAlert, tone: "warning", order: 7 },
  "Raw Material":     { icon: Box,         tone: "neutral", order: 8 },
  "Hardware / Tools": { icon: Wrench,      tone: "teal",    order: 9 },
};

const TONE_STYLES = {
  info: {
    text: "text-info",
    border: "border-info/20",
    iconBg: "bg-info text-white",
  },
  warning: {
    text: "text-warning",
    border: "border-warning/20",
    iconBg: "bg-warning text-white",
  },
  success: {
    text: "text-success",
    border: "border-success/20",
    iconBg: "bg-success text-white",
  },
  // Non-semantic accents — Tailwind direct colors. Two extra slots so the
  // 9 categories can stay visually distinct without ever using red.
  purple: {
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-700/40",
    iconBg: "bg-purple-600 text-white",
  },
  teal: {
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-200 dark:border-teal-700/40",
    iconBg: "bg-teal-600 text-white",
  },
  neutral: {
    text: "text-text",
    border: "border-border",
    iconBg: "bg-text-muted text-bg",
  },
};

function metaForCategory(cat) {
  return (
    CATEGORY_META[cat] ?? {
      icon: Tag,
      tone: "neutral",
      order: 99,
    }
  );
}

const inputCls = (error) =>
  `w-full rounded-xl px-4 py-3 sm:py-2.5 text-sm bg-surface-container-low/60 border outline-none transition-colors placeholder:text-text-subtle ${
    error
      ? "border-danger/60 text-danger focus:border-danger focus:ring-2 focus:ring-danger/20"
      : "border-border text-text focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
  }`;

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
  };
}

export default function CreateRFQPage() {
  const nav = useNavigate();
  const toast = useToast();
  const create = useRFQStore((s) => s.create);
  const user = useAuthStore((s) => s.user);

  // Real vendors
  const vendors = useVendorsStore((s) => s.items);
  const vendorsLoading = useVendorsStore((s) => s.loading);
  const fetchVendors = useVendorsStore((s) => s.fetchAll);

  // Approved PRs (for the link-to-PR selector)
  const prs = usePRStore((s) => s.items);
  const prLoading = usePRStore((s) => s.loading);
  const fetchPRs = usePRStore((s) => s.fetchAll);

  const [title, setTitle] = useState("");
  const [prNumber, setPrNumber] = useState(""); // linked PR
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState([emptyItem()]);
  const [selected, setSelected] = useState([]);
  const [vendorQuery, setVendorQuery] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  // Track which categories drove the last auto-select so we can render a
  // small explainer banner above the vendor picker.
  const [autoSelectedCats, setAutoSelectedCats] = useState([]);

  useEffect(() => {
    fetchVendors();
    fetchPRs();
  }, [fetchVendors, fetchPRs]);

  // Role gate — non-back-office roles get redirected to the list.
  // Must run after all hooks above to satisfy rules-of-hooks.
  if (user && !canWriteRfq(user)) {
    return <Navigate to="/app/quotations" replace />;
  }

  const clearError = (key) =>
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const approvedPRs = prs.filter((p) => p.status === "approved");

  // When a PR is chosen, auto-prefill title + items from that PR AND
  // auto-select every approved vendor registered in the matching item
  // category — saves the officer from manually checking dozens of boxes.
  const handlePRSelect = (number) => {
    setPrNumber(number);
    if (!number) {
      setAutoSelectedCats([]);
      return;
    }
    const pr = prs.find((p) => p.number === number);
    if (!pr) return;

    if (!title.trim()) setTitle(pr.title ? `Quote for ${pr.title}` : `Quote for ${pr.number}`);

    if (Array.isArray(pr.items) && pr.items.length > 0) {
      setItems(
        pr.items.map((it, idx) => ({
          id: `i-${Date.now()}-${idx}`,
          name: it.name ?? "",
          code: it.code ?? "",
          hsn_code: it.hsn_code ?? "",
          uom: it.uom ?? "",
          qty: Number(it.qty) || 1,
        })),
      );
      toast.success(
        `Prefilled ${pr.items.length} item${pr.items.length === 1 ? "" : "s"} from ${number}`,
      );
      clearError("items");

      // Derive categories from item codes (MK-XXX-NNNN → category name).
      const cats = Array.from(
        new Set(
          pr.items
            .map((it) => categoryOfItem(it.code))
            .filter(Boolean),
        ),
      );
      setAutoSelectedCats(cats);

      if (cats.length > 0 && Array.isArray(vendors) && vendors.length > 0) {
        const matched = vendors
          .filter(
            (v) =>
              v.approval_status === "approved" &&
              v.category &&
              cats.includes(v.category),
          )
          .map((v) => v.vendor_name);

        if (matched.length > 0) {
          // Merge with whatever the user already had selected — never erase
          // their explicit picks.
          setSelected((prev) => Array.from(new Set([...prev, ...matched])));
          clearError("vendors");
          toast.success(
            `Auto-selected ${matched.length} vendor${matched.length === 1 ? "" : "s"} matching ${cats.join(" + ")}`,
          );
        }
      }
    }
  };

  const approvedVendors = vendors
    .filter((v) => v.approval_status === "approved")
    .filter((v) =>
      vendorQuery.trim()
        ? v.vendor_name
            .toLowerCase()
            .includes(vendorQuery.trim().toLowerCase())
        : true,
    );

  const toggleVendor = (name) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
    clearError("vendors");
  };

  /** Bulk select / deselect every approved vendor in one category. */
  const toggleCategory = (categoryName, shouldSelect) => {
    const namesInCat = vendors
      .filter(
        (v) => v.approval_status === "approved" && v.category === categoryName,
      )
      .map((v) => v.vendor_name);
    if (namesInCat.length === 0) return;
    setSelected((prev) => {
      if (shouldSelect) {
        return Array.from(new Set([...prev, ...namesInCat]));
      }
      const remove = new Set(namesInCat);
      return prev.filter((n) => !remove.has(n));
    });
    clearError("vendors");
  };

  // Group the search-filtered vendors by category. "Other" bucket catches
  // legacy vendors that were seeded without a category (Acme, Global SCM,
  // Meka Group). Categories are sorted by their CATEGORY_META.order so the
  // procurement-priority order is consistent.
  const vendorsByCategory = (() => {
    const groups = {};
    for (const v of approvedVendors) {
      const cat = v.category || "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(v);
    }
    return Object.entries(groups).sort(
      ([a], [b]) => metaForCategory(a).order - metaForCategory(b).order,
    );
  })();

  const patchItem = (id, patch) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    clearError("items");
  };
  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (id) =>
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((it) => it.id !== id)));

  const validate = () => {
    const next = {};
    if (!title.trim()) next.title = "Title is required.";
    if (selected.length === 0) next.vendors = "Invite at least one vendor.";
    const badItem = items.some((it) => {
      const qtyNum = Number(it.qty);
      return !it.name.trim() || !Number.isFinite(qtyNum) || qtyNum <= 0;
    });
    if (badItem)
      next.items = "Every item needs a name and a quantity greater than zero.";
    if (dueDate) {
      const picked = new Date(dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (picked < today) next.due_date = "Due date must be today or later.";
    }
    return next;
  };

  const send = async () => {
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) {
      toast.error("Please correct the highlighted fields.");
      return;
    }
    setSubmitting(true);
    try {
      const record = await create({
        title: title.trim(),
        pr_number: prNumber.trim() || null,
        due_date: dueDate || null,
        vendors: selected,
        items: items.map((it) => ({
          name: it.name.trim(),
          code: it.code.trim() || null,
          hsn_code: it.hsn_code.trim() || null,
          uom: it.uom || null,
          qty: Number(it.qty) || 1,
        })),
      });
      toast.success(
        `${record.number} sent to ${selected.length} vendor${selected.length === 1 ? "" : "s"}`,
      );
      nav("/app/quotations");
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
      toast.error(err?.response?.data?.message ?? "Could not send RFQ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-8">
      <div className="mb-6">
        <div className="flex items-center gap-1.5 text-text-muted">
          <Link2 className="h-3 w-3" strokeWidth={2} />
          <span className="text-[10px] font-semibold tracking-[0.22em] uppercase">
            New RFQ
          </span>
        </div>
        <h1 className="text-[24px] sm:text-[28px] font-bold text-text leading-tight tracking-tight mt-1">
          Request for Quotation
        </h1>
        <p className="text-text-muted text-sm mt-1.5">
          Ask vendors to bid. Link an approved PR to auto-fill items.
        </p>
      </div>

      <div className="space-y-6">
        {/* Request Details */}
        <section className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-bold text-text mb-4">Request Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">
                Title *
              </label>
              <input
                className={inputCls(errors.title)}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  clearError("title");
                }}
                placeholder="e.g. Q4 Raw Materials"
              />
              <FieldError message={errors.title} />
            </div>

            {/* Link to PR — auto-prefills items */}
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1 uppercase flex items-center gap-1">
                <Link2 className="h-3 w-3" /> From Purchase Request (optional)
              </label>
              <select
                className={inputCls(false)}
                value={prNumber}
                onChange={(e) => handlePRSelect(e.target.value)}
                disabled={prLoading && approvedPRs.length === 0}
              >
                <option value="">— none —</option>
                {approvedPRs.map((p) => (
                  <option key={p.number} value={p.number}>
                    {p.number} · {p.title ?? "(untitled)"}
                  </option>
                ))}
              </select>
              {prLoading && approvedPRs.length === 0 && (
                <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> loading PRs…
                </p>
              )}
              {!prLoading && approvedPRs.length === 0 && (
                <p className="text-xs text-text-subtle mt-1">
                  No approved PRs yet — items can be entered manually below.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">
                Due Date
              </label>
              <input
                type="date"
                className={inputCls(errors.due_date)}
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  clearError("due_date");
                }}
              />
              <FieldError message={errors.due_date} />
            </div>
          </div>
        </section>

        {/* Items */}
        <section
          className={`glass-card rounded-2xl p-6 ${
            errors.items ? "border-danger/40" : ""
          }`}
        >
          <div className="flex justify-between items-center mb-4">
            <h2
              className={`text-lg font-bold ${
                errors.items ? "text-danger" : "text-text"
              }`}
            >
              Items *
            </h2>
            <button
              type="button"
              onClick={addItem}
              className="text-sm font-bold text-info flex items-center gap-1 hover:underline"
            >
              <Plus className="h-4 w-4" /> Add Item
            </button>
          </div>

          <div className="bg-surface-container-low/60 border border-border rounded-xl overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3 px-3 text-xs font-bold text-text-muted uppercase tracking-wider">Item Name *</th>
                  <th className="py-3 px-3 text-xs font-bold text-text-muted uppercase tracking-wider w-32">Code</th>
                  <th className="py-3 px-3 text-xs font-bold text-text-muted uppercase tracking-wider w-28">HSN</th>
                  <th className="py-3 px-3 text-xs font-bold text-text-muted uppercase tracking-wider w-24">UOM</th>
                  <th className="py-3 px-3 text-xs font-bold text-text-muted uppercase tracking-wider w-24">Qty *</th>
                  <th className="py-3 px-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-b border-border">
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={it.name}
                        onChange={(e) => patchItem(it.id, { name: e.target.value })}
                        placeholder="Enter item name"
                        className="w-full bg-transparent border-b border-transparent focus:border-primary outline-none text-sm py-1"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={it.code}
                        onChange={(e) => patchItem(it.id, { code: e.target.value })}
                        placeholder="ITM-…"
                        className="w-full bg-transparent border-b border-transparent focus:border-primary outline-none text-sm py-1"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={it.hsn_code}
                        onChange={(e) => patchItem(it.id, { hsn_code: e.target.value })}
                        placeholder="HSN"
                        className="w-full bg-transparent border-b border-transparent focus:border-primary outline-none text-sm py-1 font-mono"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <select
                        value={it.uom}
                        onChange={(e) => patchItem(it.id, { uom: e.target.value })}
                        className="w-full bg-transparent border-b border-transparent focus:border-primary outline-none text-sm py-1"
                      >
                        <option value="">—</option>
                        {UOMS.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={it.qty}
                        onChange={(e) => patchItem(it.id, { qty: e.target.value })}
                        className="w-full bg-transparent border-b border-transparent focus:border-primary outline-none text-sm py-1"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <button
                        type="button"
                        onClick={() => removeItem(it.id)}
                        disabled={items.length === 1}
                        className="text-text-muted hover:text-danger disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Remove item"
                        title={items.length === 1 ? "At least one item is required" : "Remove"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <FieldError message={errors.items} />
        </section>

        {/* Invite Vendors */}
        <section
          className={`glass-card rounded-2xl p-6 ${
            errors.vendors ? "border-danger/40" : ""
          }`}
        >
          <div className="flex items-center justify-between mb-4 gap-2">
            <div className="flex items-center gap-2">
              <Users className={`h-5 w-5 ${errors.vendors ? "text-danger" : "text-primary"}`} />
              <h2 className={`text-lg font-bold ${errors.vendors ? "text-danger" : "text-text"}`}>
                Invite Vendors *
              </h2>
              <span className="text-xs text-text-muted">({selected.length} selected)</span>
            </div>
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                type="text"
                value={vendorQuery}
                onChange={(e) => setVendorQuery(e.target.value)}
                placeholder="Search vendors…"
                className="w-full bg-surface-container-low/60 border border-border rounded-full focus:border-primary/60 focus:ring-2 focus:ring-primary/15 pl-9 pr-3 py-2 text-sm text-text placeholder:text-text-subtle outline-none transition-colors"
              />
            </div>
          </div>

          {/* Auto-select banner — shows when PR-driven category match populated the picker */}
          {autoSelectedCats.length > 0 && (
            <div className="mb-4 px-4 py-3 rounded-md bg-info-soft border border-info/30 text-xs text-info flex items-start gap-2">
              <Users className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold">Auto-selected by category</span>
                {" — every approved vendor in "}
                {autoSelectedCats.map((c, i) => (
                  <span key={c}>
                    <span className="font-semibold">{c}</span>
                    {i < autoSelectedCats.length - 1 && " + "}
                  </span>
                ))}
                {" was added based on the linked PR's items. Uncheck any you don't want to invite."}
              </div>
            </div>
          )}

          {vendorsLoading && vendors.length === 0 ? (
            <div className="py-8 text-center text-sm text-text-muted">
              <Loader2 className="inline-block h-4 w-4 animate-spin mr-1" />
              Loading vendors…
            </div>
          ) : approvedVendors.length === 0 ? (
            <div className="py-8 px-4 text-center border border-dashed border-border rounded-xl bg-surface-container-low/40">
              {vendors.length === 0 ? (
                <>
                  <UserPlus className="h-10 w-10 mx-auto mb-3 text-text-subtle" strokeWidth={1.5} />
                  <p className="text-sm font-semibold text-text mb-1">
                    No vendors in the system yet
                  </p>
                  <p className="text-xs text-text-muted mb-4">
                    Add a vendor and approve them to start inviting to RFQs.
                  </p>
                  <Link
                    to="/admin/vendors"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:brightness-110 text-primary-foreground text-xs font-bold rounded-full transition-all shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add a vendor
                  </Link>
                </>
              ) : vendorQuery ? (
                <p className="text-sm text-text-muted">
                  No approved vendors match <strong>"{vendorQuery}"</strong>.
                </p>
              ) : (
                <>
                  <p className="text-sm font-semibold text-text mb-1">
                    You have {vendors.length} vendor{vendors.length === 1 ? "" : "s"}, but none are approved yet
                  </p>
                  <p className="text-xs text-text-muted mb-4">
                    Only <strong>approved</strong> vendors can be invited to RFQs. Approve pending ones in the vendors master.
                  </p>
                  <Link
                    to="/admin/vendors"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:brightness-110 text-primary-foreground text-xs font-bold rounded-full transition-all shadow-sm"
                  >
                    Go to Vendors Master
                  </Link>
                </>
              )}
            </div>
          ) : (
            <>
              {/* ─── Selected summary strip ──────────────────────────── */}
              {selected.length > 0 && (
                <div className="mb-4 px-4 py-3 rounded-md bg-success-soft/30 border border-success/30">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-success">
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                      {selected.length} vendor{selected.length === 1 ? "" : "s"} selected
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelected([])}
                      className="text-xs font-semibold text-text-muted hover:text-text flex items-center gap-1"
                    >
                      <X className="h-3.5 w-3.5" /> Clear all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-success text-white text-xs font-semibold"
                      >
                        {name}
                        <button
                          type="button"
                          onClick={() => toggleVendor(name)}
                          className="hover:bg-white/20 rounded p-0.5"
                          aria-label={`Remove ${name}`}
                        >
                          <X className="h-3 w-3" strokeWidth={2.5} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── Per-category sections ────────────────────────────── */}
              <div className="space-y-3">
                {vendorsByCategory.map(([cat, list]) => {
                  const meta = metaForCategory(cat);
                  const Icon = meta.icon;
                  const tone = TONE_STYLES[meta.tone] ?? TONE_STYLES.neutral;
                  const selectedCount = list.filter((v) =>
                    selected.includes(v.vendor_name),
                  ).length;
                  const allSelected = selectedCount === list.length;
                  const someSelected = selectedCount > 0 && !allSelected;
                  const isAutoCat = autoSelectedCats.includes(cat);
                  return (
                    <section
                      key={cat}
                      className={`rounded-xl border ${tone.border} bg-surface-container-low/40 overflow-hidden`}
                    >
                      <header className="px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 border-b border-border">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${tone.iconBg}`}
                          >
                            <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
                          </div>
                          <h3 className={`text-sm font-bold ${tone.text} truncate`}>
                            {cat}
                          </h3>
                          <span
                            className={`text-[10px] uppercase tracking-widest font-bold tabular-nums px-1.5 py-0.5 rounded ${
                              selectedCount > 0
                                ? "bg-success text-white"
                                : "bg-surface-container-high text-text-muted"
                            }`}
                          >
                            {selectedCount}/{list.length}
                          </span>
                          {isAutoCat && (
                            <span className="text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded bg-info-soft text-info border border-info/30">
                              auto
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleCategory(cat, !allSelected)}
                          className="text-xs font-bold text-info hover:bg-info-soft px-2 py-1 rounded transition-colors whitespace-nowrap"
                        >
                          {allSelected
                            ? "Deselect all"
                            : someSelected
                              ? "Select rest"
                              : "Select all"}
                        </button>
                      </header>
                      <div className="p-3 flex flex-wrap gap-1.5">
                        {list.map((v) => {
                          const checked = selected.includes(v.vendor_name);
                          return (
                            <label
                              key={v.code}
                              className={`inline-flex items-center gap-2 pl-2 pr-3 py-1.5 border rounded-full cursor-pointer transition-all ${
                                checked
                                  ? "bg-success text-white border-success shadow-sm"
                                  : "bg-surface-container-low/60 border-border text-text hover:border-success/60 hover:bg-surface-container"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleVendor(v.vendor_name)}
                                className="h-3.5 w-3.5 rounded"
                              />
                              <span className="text-sm font-medium truncate max-w-[180px]">
                                {v.vendor_name}
                              </span>
                              {checked && (
                                <Check
                                  className="h-3.5 w-3.5 -ml-1"
                                  strokeWidth={2.75}
                                />
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </>
          )}
          <FieldError message={errors.vendors} />
        </section>

        {/* Footer actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => nav("/app/quotations")}
            disabled={submitting}
            className="px-5 py-2 text-[12px] font-semibold text-text-muted border border-border bg-surface-container-low/60 rounded-full hover:text-text hover:border-white/20 transition-colors disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={send}
            disabled={submitting}
            className="px-6 py-2 text-[12px] font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-full transition-all shadow-sm disabled:opacity-60 flex items-center gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Sending…" : "Send RFQ"}
          </button>
        </div>
      </div>
    </div>
  );
}
