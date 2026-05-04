// Create PR page — supports inline attachments via prDocumentsApi.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  ClipboardList,
  Package,
  Paperclip,
  AlertCircle,
  Plus,
  Trash2,
  PackageX,
  Loader2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Sparkles,
  CheckCircle2,
  Circle,
  Upload,
  X as XIcon,
  File as FileIcon,
  Image as ImageIcon,
  FileSpreadsheet as FileSpreadsheetIcon,
  Save,
} from "lucide-react";
import { usePRStore } from "../store.js";
import { prDocumentsApi } from "../documents/api.js";
import { useToast } from "../../../hooks/useToast.jsx";
import { useAuthStore } from "../../auth/store.js";
import { useUIStore } from "../../ui/store.js";
import {
  BUSINESS_UNITS,
  DEPARTMENTS,
  WORK_LOCATIONS,
  PRIORITIES,
} from "../../../data/enums.js";
import ItemPicker from "../../../components/forms/ItemPicker.jsx";
import Card from "../../../components/ui/Card.jsx";

const UOMS = ["EA", "KG", "RL", "SET", "BOX", "LTR", "MTR", "PCS", "NOS"];

// File upload constraints — mirror PrDocumentController's server-side rules
const ATTACH_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ATTACH_ACCEPTED  = ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv";
const ATTACH_MIME_RX   =
  /^(application\/pdf|image\/(jpe?g|png)|application\/msword|application\/vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet)|application\/vnd\.ms-excel|text\/csv)$/i;

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function iconForMime(mime, name = "") {
  if (/^image\//i.test(mime)) return ImageIcon;
  if (/spreadsheet|excel|csv/i.test(mime) || /\.(xlsx?|csv)$/i.test(name))
    return FileSpreadsheetIcon;
  return FileIcon;
}

/** Capitalised label like "standard" → "Standard". */
function titleCase(s = "") {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const PRIORITY_TONE = {
  low: "bg-surface-container-high text-text-muted",
  standard: "bg-info-soft text-info",
  urgent: "bg-warning-soft text-warning",
  critical: "bg-danger-soft text-danger",
};

/** Clean section header — just an icon and a title, with an optional action slot. */
function SectionHeader({ icon: Icon, title, action, error = false }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-5">
      <h2
        className={`text-sm font-semibold tracking-tight flex items-center gap-2 ${
          error ? "text-danger" : "text-text"
        }`}
      >
        {Icon && (
          <Icon
            className={`h-4 w-4 ${error ? "text-danger" : "text-text-muted"}`}
            strokeWidth={2}
          />
        )}
        {title}
      </h2>
      {action}
    </div>
  );
}

function FieldLabel({ children, error, required }) {
  return (
    <label
      className={`block text-xs font-semibold mb-1 uppercase tracking-wider ${
        error ? "text-danger" : "text-text-muted"
      }`}
    >
      {children}
      {required && <span className="text-danger"> *</span>}
    </label>
  );
}

function inputCls(error) {
  // On mobile we use py-3 to hit the ~44px touch-target guideline; tighter
  // on sm+ where the cursor is more precise.
  return `w-full rounded-xl px-4 py-3 sm:py-2.5 text-sm bg-surface-container-low/60 border outline-none transition-colors placeholder:text-text-subtle ${
    error
      ? "border-danger/60 text-danger focus:border-danger focus:ring-2 focus:ring-danger/20"
      : "border-border text-text focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
  }`;
}

function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="text-xs text-danger mt-1.5 font-medium flex items-start gap-1">
      <AlertCircle className="h-3.5 w-3.5 mt-0.5" />
      {message}
    </p>
  );
}

function fmtTimeAgo(ts, nowMs) {
  if (!ts) return "";
  const diff = Math.max(0, nowMs - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

function emptyItem() {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: "",
    code: "",
    hsn_code: "",
    description: "",
    uom: "",
    qty: 1,
    // Specs filled by user. spec_hints comes from the catalog item the user
    // picked (if any); rendered as placeholders. specs_text is a free-text
    // fallback that always works.
    specs: {},
    specs_text: "",
    spec_hints: null,
    specsExpanded: false,
  };
}

function initialForm(user) {
  return {
    requester_name: user?.name ?? "",
    region: "",
    business_unit: "",
    customer: "",
    department: "",
    project: "",
    delivery_location: "",
    site_name: "",
    priority: "standard",
    expected_date: "",
    justification: "",
    items: [emptyItem()],
  };
}

export default function PurchaseRequestCreatePage() {
  const navigate = useNavigate();
  const create = usePRStore((s) => s.create);
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);

  // Draft persistence — form state is auto-saved to localStorage so the user
  // can navigate away and come back. The PR is NOT created in the DB until
  // they click "Submit for Approval". Drafts are scoped per-user so multiple
  // accounts on the same machine don't collide.
  const DRAFT_KEY = `scm-pr-draft-${user?.id ?? "guest"}`;

  const [form, setForm] = useState(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.form) return parsed.form;
      }
    } catch {
      /* fall through to clean form */
    }
    return initialForm(user);
  });
  const [draftLoadedAt] = useState(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw)?.savedAt ?? null : null;
    } catch {
      return null;
    }
  });
  const [draftRestored, setDraftRestored] = useState(Boolean(draftLoadedAt));
  const [savedAt, setSavedAt] = useState(draftLoadedAt);

  const [errors, setErrors]         = useState({});
  const [submitting, setSubmitting] = useState(false);
  // Captured once on mount so derivations stay pure across re-renders.
  const [nowMs] = useState(() => Date.now());

  // Attachments are kept as File objects until the PR is created (we need
  // its number to upload against). On submit, the PR is POSTed first, then
  // each file is uploaded to /pr-documents with the new pr_number.
  // Note: File objects can't be serialized into the draft, so the draft only
  // restores the form fields — user re-attaches files when they resume.
  const [attachments, setAttachments] = useState([]); // File[]
  const [dragOver, setDragOver]       = useState(false);
  const fileInputRef = useRef(null);

  // Auto-save draft on form changes (debounced).
  useEffect(() => {
    if (submitting) return;
    const t = setTimeout(() => {
      try {
        const payload = { form, savedAt: Date.now() };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
        setSavedAt(payload.savedAt);
      } catch {
        /* localStorage full — ignore */
      }
    }, 600);
    return () => clearTimeout(t);
  }, [form, DRAFT_KEY, submitting]);

  const saveDraftNow = () => {
    try {
      const payload = { form, savedAt: Date.now() };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
      setSavedAt(payload.savedAt);
      setDraftRestored(false);
      toast.success("Draft saved");
    } catch {
      toast.error("Could not save draft (storage full?)");
    }
  };

  const discardDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setForm(initialForm(user));
    setAttachments([]);
    setErrors({});
    setSavedAt(null);
    setDraftRestored(false);
    toast.info("Draft discarded");
  };

  const addFiles = (files) => {
    const list = Array.from(files ?? []);
    if (list.length === 0) return;
    const accepted = [];
    for (const f of list) {
      if (f.size > ATTACH_MAX_BYTES) {
        toast.error(`${f.name} is larger than 10 MB`);
        continue;
      }
      if (f.type && !ATTACH_MIME_RX.test(f.type)) {
        toast.error(`${f.name} — file type not allowed`);
        continue;
      }
      accepted.push(f);
    }
    if (accepted.length === 0) return;
    // De-dupe by name+size so re-picking the same file doesn't double-add it.
    setAttachments((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}|${f.size}`));
      return [...prev, ...accepted.filter((f) => !seen.has(`${f.name}|${f.size}`))];
    });
  };

  const removeAttachment = (idx) =>
    setAttachments((prev) => prev.filter((_, i) => i !== idx));

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer?.files);
  };

  const clearError = (key) =>
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const update = (k) => (e) => {
    const v = e?.target ? e.target.value : e;
    setForm((f) => ({ ...f, [k]: v }));
    clearError(k);
  };

  const addItem = () =>
    setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }));
  const removeItem = (id) =>
    setForm((f) => ({
      ...f,
      items: f.items.length === 1 ? f.items : f.items.filter((i) => i.id !== id),
    }));
  const patchItem = (id, patch) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));
    clearError("items");
  };

  const validate = () => {
    const next = {};
    if (!form.requester_name.trim())
      next.requester_name = "Requestor name is required.";
    if (!form.business_unit) next.business_unit = "Company is required.";
    if (!form.department) next.department = "Department is required.";

    const badItems = form.items.some((it) => {
      const qtyNum = Number(it.qty);
      const qtyBad = !Number.isFinite(qtyNum) || qtyNum <= 0;
      return !it.name.trim() || qtyBad;
    });
    if (form.items.length === 0) {
      next.items = "Please add at least one item.";
    } else if (badItems) {
      next.items =
        "Every item needs a name and a numeric quantity greater than zero.";
    }
    return next;
  };

  const handleSubmit = async () => {
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) {
      const count = Object.keys(next).length;
      toast.error(
        `Fix ${count} error${count === 1 ? "" : "s"} before submitting`,
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: form.items[0]?.name || "Purchase Request",
        requester_name: form.requester_name.trim(),
        department: form.department || null,
        business_unit: form.business_unit || null,
        customer: form.customer || null,
        project: form.project || null,
        region: form.region || null,
        delivery_location: form.delivery_location || null,
        site_name: form.site_name || null,
        priority: form.priority || "standard",
        expected_date: form.expected_date || null,
        justification: form.justification || null,
        items: form.items.map((it) => {
          // Drop empty spec keys before sending (user may have left fields blank)
          const cleanSpecs = Object.fromEntries(
            Object.entries(it.specs ?? {}).filter(
              ([, v]) => v != null && String(v).trim() !== "",
            ),
          );
          return {
            name: it.name.trim(),
            code: it.code.trim() || null,
            hsn_code: it.hsn_code.trim() || null,
            description: it.description.trim() || null,
            uom: it.uom || null,
            qty: Number(it.qty) || 0,
            specs: Object.keys(cleanSpecs).length ? cleanSpecs : null,
            specs_text: it.specs_text.trim() || null,
          };
        }),
      };

      const record = await create(payload);

      // PR successfully created — clear the saved draft.
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }

      // Upload attachments — best-effort, sequential (keeps things simple
      // and avoids hammering the dev server with parallel multipart writes).
      let uploaded = 0;
      const failed = [];
      for (const file of attachments) {
        try {
          await prDocumentsApi.upload({ pr_number: record.number, file });
          uploaded += 1;
        } catch {
          failed.push(file.name);
        }
      }

      if (attachments.length === 0) {
        toast.success(`${record.number} submitted for approval`);
      } else if (failed.length === 0) {
        toast.success(
          `${record.number} submitted with ${uploaded} attachment${uploaded === 1 ? "" : "s"}`,
        );
      } else if (uploaded === 0) {
        toast.error(`${record.number} submitted, but all attachments failed to upload`);
      } else {
        toast.success(
          `${record.number} submitted · ${uploaded} attachment${uploaded === 1 ? "" : "s"} uploaded, ${failed.length} failed`,
        );
      }

      navigate("/app/purchase-requests");
    } catch (err) {
      const serverErrors = err?.response?.data?.errors;
      if (serverErrors && typeof serverErrors === "object") {
        const flat = {};
        for (const [k, v] of Object.entries(serverErrors)) {
          // dotted keys like items.0.name → items
          const key = k.startsWith("items") ? "items" : k;
          flat[key] = Array.isArray(v) ? v[0] : v;
        }
        setErrors(flat);
      }
      toast.error(
        err?.response?.data?.message ??
          err?.message ??
          "Could not submit request",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ----- Live summary derived from form state — drives the sidebar -----
  const totalQty = form.items.reduce(
    (sum, it) => sum + (Number(it.qty) || 0),
    0,
  );
  const itemsWithSpecs = form.items.filter((it) => {
    const filledSpecs = Object.values(it.specs ?? {}).filter(
      (v) => v && String(v).trim(),
    ).length;
    return filledSpecs > 0 || it.specs_text?.trim();
  }).length;
  const fromCatalogCount = form.items.filter(
    (it) => it.code && it.code.startsWith("MK-"),
  ).length;

  const requiredChecks = useMemo(
    () => [
      {
        key: "requester_name",
        label: "Requestor name",
        ok: !!form.requester_name.trim(),
      },
      { key: "business_unit", label: "Company", ok: !!form.business_unit },
      { key: "department", label: "Department", ok: !!form.department },
      {
        key: "items",
        label: `Items (${form.items.length})`,
        ok:
          form.items.length > 0 &&
          form.items.every((it) => it.name.trim() && Number(it.qty) > 0),
      },
    ],
    [form],
  );
  const requiredOkCount = requiredChecks.filter((c) => c.ok).length;
  const allRequiredOk = requiredOkCount === requiredChecks.length;

  return (
    <div className="max-w-[1400px] mx-auto pb-24">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate("/app/purchase-requests")}
          className="inline-flex items-center gap-1 text-[12px] font-medium text-text-muted hover:text-primary mb-3 transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Purchase Requests
        </button>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-1.5 text-text-muted">
              <FileText className="h-3 w-3" strokeWidth={2} />
              <span className="text-[10px] font-semibold tracking-[0.22em] uppercase">
                New Request
              </span>
            </div>
            <h1 className="text-[24px] sm:text-[28px] font-bold text-text leading-tight tracking-tight mt-1">
              Create Purchase Request
            </h1>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted bg-surface-container-low/60 border border-border rounded-full px-3 py-1.5 inline-flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${savedAt ? "bg-success" : "bg-text-subtle"}`}
            />
            {savedAt ? "Draft saved" : "Draft"}
          </span>
        </div>

        {/* Restore banner — shown when a draft from a previous session was loaded */}
        {draftRestored && savedAt && (
          <div className="mt-4 glass-card rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-[13px]">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              <div>
                <span className="font-semibold text-text">Draft restored</span>
                <span className="text-text-muted ml-1.5">
                  · last saved {fmtTimeAgo(savedAt, nowMs)}
                </span>
                <span className="text-text-subtle text-[11px] block sm:inline sm:ml-1.5">
                  Attachments need to be re-added.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDraftRestored(false)}
                className="text-[11px] font-semibold text-text-muted hover:text-text px-3 py-1.5 rounded-full border border-border bg-surface-container-low/60 transition-colors"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={discardDraft}
                className="text-[11px] font-bold text-danger hover:bg-danger-soft px-3 py-1.5 rounded-full border border-danger/30 bg-danger-soft/40 transition-colors"
              >
                Discard draft
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MAIN COLUMN ---------------------------------------------------- */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <SectionHeader icon={FileText} title="Request Details" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
              <div>
                <FieldLabel error={errors.requester_name} required>Requestor Name</FieldLabel>
                <input
                  type="text"
                  value={form.requester_name}
                  onChange={update("requester_name")}
                  placeholder="Enter requestor name"
                  className={inputCls(errors.requester_name)}
                />
                <FieldError message={errors.requester_name} />
              </div>
              <div>
                <FieldLabel error={errors.business_unit} required>Company</FieldLabel>
                <select
                  value={form.business_unit}
                  onChange={update("business_unit")}
                  className={inputCls(errors.business_unit)}
                >
                  <option value="">Select Company</option>
                  {BUSINESS_UNITS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
                <FieldError message={errors.business_unit} />
              </div>
              <div>
                <FieldLabel error={errors.department} required>Department</FieldLabel>
                <select
                  value={form.department}
                  onChange={update("department")}
                  className={inputCls(errors.department)}
                >
                  <option value="">Select Department</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <FieldError message={errors.department} />
              </div>
              <div>
                <FieldLabel>Customer</FieldLabel>
                <input
                  type="text"
                  value={form.customer}
                  onChange={update("customer")}
                  placeholder="Customer name (optional)"
                  className={inputCls(false)}
                />
              </div>
              <div className="md:col-span-2">
                <FieldLabel>Project</FieldLabel>
                <input
                  type="text"
                  value={form.project}
                  onChange={update("project")}
                  placeholder="e.g. PRJ-2026-Falcon"
                  className={inputCls(false)}
                />
              </div>
              <div>
                <FieldLabel>Region</FieldLabel>
                <input
                  type="text"
                  value={form.region}
                  onChange={update("region")}
                  placeholder="North / South / East / West"
                  className={inputCls(false)}
                />
              </div>
              <div>
                <FieldLabel>Delivery Location</FieldLabel>
                <select
                  value={form.delivery_location}
                  onChange={update("delivery_location")}
                  className={inputCls(false)}
                >
                  <option value="">Select location</option>
                  {WORK_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <FieldLabel>Site Name</FieldLabel>
                <input
                  type="text"
                  value={form.site_name}
                  onChange={update("site_name")}
                  placeholder="Site name"
                  className={inputCls(false)}
                />
              </div>
              <div>
                <FieldLabel>Priority</FieldLabel>
                <select
                  value={form.priority}
                  onChange={update("priority")}
                  className={inputCls(false)}
                >
                  {PRIORITIES.map((p) => <option key={p} value={p}>{titleCase(p)}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>Expected Delivery Date</FieldLabel>
                <input
                  type="date"
                  value={form.expected_date}
                  onChange={update("expected_date")}
                  className={inputCls(false)}
                />
              </div>
            </div>
          </Card>

          {/* Items */}
          <Card>
            <SectionHeader
              icon={Package}
              error={Boolean(errors.items)}
              title="Items"
              action={
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-muted">
                    {form.items.length} {form.items.length === 1 ? "line" : "lines"}
                    {form.items.length > 0 && ` · ${totalQty} qty`}
                  </span>
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-1 text-xs font-bold text-primary hover:bg-primary-soft px-2.5 py-1.5 rounded-md transition"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Item
                  </button>
                </div>
              }
            />

            {form.items.length === 0 ? (
              <div className="rounded-md bg-surface-container/40 py-12 text-center">
                <PackageX
                  className={`h-10 w-10 mx-auto mb-2 opacity-50 ${
                    errors.items ? "text-danger" : "text-text-subtle"
                  }`}
                />
                <p
                  className={`font-medium text-sm ${
                    errors.items ? "text-danger" : "text-text-muted"
                  }`}
                >
                  No items added.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {form.items.map((it, idx) => {
                  const hintEntries = it.spec_hints ? Object.entries(it.spec_hints) : [];
                  const filledCount =
                    Object.values(it.specs ?? {}).filter(
                      (v) => v && String(v).trim(),
                    ).length + (it.specs_text?.trim() ? 1 : 0);
                  const fromCatalog = !!it.code && it.code.startsWith("MK-");
                  return (
                    <div
                      key={it.id}
                      className="bg-surface-container-low/60 border border-border rounded-xl p-4 hover:border-white/15 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold">
                            {idx + 1}
                          </span>
                          {fromCatalog ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-success bg-success-soft px-2 py-0.5 rounded">
                              <Sparkles className="h-3 w-3" /> from catalog
                            </span>
                          ) : it.name.trim() ? (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-subtle">
                              custom item
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              patchItem(it.id, { specsExpanded: !it.specsExpanded })
                            }
                            className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded transition ${
                              filledCount > 0
                                ? "text-info bg-info-soft"
                                : "text-text-muted hover:text-text hover:bg-surface-container-low"
                            }`}
                            title={
                              filledCount > 0
                                ? `${filledCount} spec field${filledCount === 1 ? "" : "s"} filled`
                                : "Add specifications"
                            }
                          >
                            <Sparkles className="h-3 w-3" />
                            Specs
                            {filledCount > 0 && (
                              <span className="bg-info text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-bold">
                                {filledCount}
                              </span>
                            )}
                            {it.specsExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem(it.id)}
                            disabled={form.items.length === 1}
                            className="text-text-muted hover:text-danger p-1.5 rounded hover:bg-danger-soft disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            aria-label="Remove item"
                            title={
                              form.items.length === 1
                                ? "At least one item is required"
                                : "Remove item"
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                        <div className="lg:col-span-3 relative">
                          <FieldLabel required>Item Name</FieldLabel>
                          <ItemPicker
                            value={it.name}
                            onChange={(v) => patchItem(it.id, { name: v })}
                            onPick={(picked) =>
                              patchItem(it.id, {
                                name: picked.name,
                                code: picked.code ?? "",
                                hsn_code: picked.hsn_code ?? "",
                                uom: picked.uom ?? "",
                                description: picked.description ?? "",
                                spec_hints: picked.spec_hints ?? null,
                                specs: {},
                                specsExpanded: !!picked.spec_hints,
                              })
                            }
                          />
                        </div>
                        <div>
                          <FieldLabel>Item Code</FieldLabel>
                          <input
                            type="text"
                            value={it.code}
                            onChange={(e) => patchItem(it.id, { code: e.target.value })}
                            placeholder="ITM-…"
                            className={`${inputCls(false)} font-mono`}
                          />
                        </div>
                        <div>
                          <FieldLabel>HSN Code</FieldLabel>
                          <input
                            type="text"
                            value={it.hsn_code}
                            onChange={(e) => patchItem(it.id, { hsn_code: e.target.value })}
                            placeholder="HSN"
                            className={`${inputCls(false)} font-mono`}
                          />
                        </div>
                        <div>
                          <FieldLabel>Qty *</FieldLabel>
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={it.qty}
                            onChange={(e) => patchItem(it.id, { qty: e.target.value })}
                            className={inputCls(false)}
                          />
                        </div>
                        <div className="lg:col-span-4">
                          <FieldLabel>Description</FieldLabel>
                          <input
                            type="text"
                            value={it.description}
                            onChange={(e) => patchItem(it.id, { description: e.target.value })}
                            placeholder="Short description"
                            className={inputCls(false)}
                          />
                        </div>
                        <div className="lg:col-span-2">
                          <FieldLabel>UOM</FieldLabel>
                          <select
                            value={it.uom}
                            onChange={(e) => patchItem(it.id, { uom: e.target.value })}
                            className={inputCls(false)}
                          >
                            <option value="">—</option>
                            {UOMS.map((u) => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                      </div>

                      {it.specsExpanded && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <div className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Sparkles className="h-3 w-3" />
                            Specifications
                          </div>
                          {hintEntries.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                              {hintEntries.map(([key, hint]) => (
                                <div key={key}>
                                  <label className="block text-[11px] font-semibold text-text-muted mb-1">
                                    {key}
                                  </label>
                                  <input
                                    type="text"
                                    value={it.specs?.[key] ?? ""}
                                    onChange={(e) =>
                                      patchItem(it.id, {
                                        specs: {
                                          ...(it.specs ?? {}),
                                          [key]: e.target.value,
                                        },
                                      })
                                    }
                                    placeholder={hint}
                                    className="w-full bg-surface-container border border-border rounded-md focus:border-primary px-3 py-1.5 text-sm text-text outline-none"
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-text-subtle mb-3">
                              No spec template for this item — use the free-text field below.
                            </p>
                          )}
                          <label className="block text-[11px] font-semibold text-text-muted mb-1">
                            Additional notes
                          </label>
                          <textarea
                            rows={2}
                            value={it.specs_text ?? ""}
                            onChange={(e) => patchItem(it.id, { specs_text: e.target.value })}
                            placeholder="Anything else the supplier should know — colour, finish, certifications, brand preference, etc."
                            className="w-full bg-surface-container border border-border rounded-md focus:border-primary px-3 py-2 text-sm text-text outline-none resize-none"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <FieldError message={errors.items} />
          </Card>

          {/* Justification */}
          <Card>
            <SectionHeader icon={ClipboardList} title="Business Justification" />
            <textarea
              rows={3}
              value={form.justification}
              onChange={update("justification")}
              placeholder="Why is this purchase needed? (optional)"
              className={`${inputCls(false)} resize-none`}
            />
          </Card>

          {/* Attachments */}
          <Card>
            <SectionHeader
              icon={Paperclip}
              title="Attachments"
              action={
                <span className="text-xs text-text-muted">
                  {attachments.length === 0
                    ? "Optional — PDF, image, Word, Excel, CSV (10 MB max)"
                    : `${attachments.length} file${attachments.length === 1 ? "" : "s"} attached`}
                </span>
              }
            />

            {/* Dropzone — also clickable to open the native picker */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`w-full border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors ${
                dragOver
                  ? "border-primary bg-primary-soft/30"
                  : "border-border hover:border-primary/50 hover:bg-surface-container-low"
              }`}
            >
              <Upload
                className={`h-7 w-7 mx-auto mb-2 ${
                  dragOver ? "text-primary" : "text-text-subtle"
                }`}
                strokeWidth={1.75}
              />
              <p className="text-sm font-semibold text-text">
                Drop files here, or{" "}
                <span className="text-primary underline">browse</span>
              </p>
              <p className="text-xs text-text-muted mt-1">
                PDF · JPG · PNG · DOC · XLS · CSV — up to 10 MB each
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ATTACH_ACCEPTED}
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = ""; // allow re-picking the same file
                }}
                className="hidden"
              />
            </button>

            {attachments.length > 0 && (
              <ul className="mt-3 divide-y divide-border border border-border rounded-xl bg-surface-container-low/60">
                {attachments.map((f, idx) => {
                  const Icon = iconForMime(f.type, f.name);
                  return (
                    <li
                      key={`${f.name}-${f.size}-${idx}`}
                      className="flex items-center gap-3 px-3 py-2.5"
                    >
                      <div className="w-8 h-8 rounded-md bg-primary-soft text-primary flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-text truncate">
                          {f.name}
                        </div>
                        <div className="text-[11px] text-text-muted">
                          {fmtBytes(f.size)}
                          {f.type ? ` · ${f.type.split("/")[1] ?? f.type}` : ""}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        disabled={submitting}
                        className="text-text-muted hover:text-danger p-1.5 rounded hover:bg-danger-soft disabled:opacity-30 shrink-0"
                        aria-label={`Remove ${f.name}`}
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        {/* SIDEBAR -------------------------------------------------------- */}
        {/* Hidden on mobile/tablet — the sticky submit bar already surfaces
            "X required missing" / "Ready to submit". Shown on lg+ where the
            extra column has room without crowding the form. */}
        <aside className="hidden lg:block lg:col-span-1">
          <div className="lg:sticky lg:top-20 space-y-4">
            <Card padding="md">
              <h3 className="text-xs font-semibold text-text mb-4">Summary</h3>
              <dl className="grid grid-cols-2 gap-y-3 text-sm">
                <dt className="text-text-muted">Items</dt>
                <dd className="text-text text-right font-semibold tabular-nums">
                  {form.items.length}
                </dd>

                <dt className="text-text-muted">Total qty</dt>
                <dd className="text-text text-right font-semibold tabular-nums">
                  {totalQty.toLocaleString()}
                </dd>

                {fromCatalogCount > 0 && (
                  <>
                    <dt className="text-text-muted">From catalog</dt>
                    <dd className="text-text text-right font-semibold tabular-nums">
                      {fromCatalogCount}/{form.items.length}
                    </dd>
                  </>
                )}

                {itemsWithSpecs > 0 && (
                  <>
                    <dt className="text-text-muted">With specs</dt>
                    <dd className="text-text text-right font-semibold tabular-nums">
                      {itemsWithSpecs}/{form.items.length}
                    </dd>
                  </>
                )}

                {attachments.length > 0 && (
                  <>
                    <dt className="text-text-muted">Attachments</dt>
                    <dd className="text-text text-right font-semibold tabular-nums">
                      {attachments.length}
                    </dd>
                  </>
                )}
              </dl>

              <div className="mt-4 pt-4 border-t border-border space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Priority</span>
                  <span
                    className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded ${
                      PRIORITY_TONE[form.priority] ?? PRIORITY_TONE.standard
                    }`}
                  >
                    {titleCase(form.priority)}
                  </span>
                </div>
                {form.expected_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Needed by</span>
                    <span className="text-text text-xs font-medium">
                      {new Date(form.expected_date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </div>
            </Card>

            <Card padding="md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-text">Required</h3>
                <span
                  className={`text-xs tabular-nums ${
                    allRequiredOk ? "text-success" : "text-text-muted"
                  }`}
                >
                  {requiredOkCount} / {requiredChecks.length}
                </span>
              </div>
              <ul className="space-y-2.5">
                {requiredChecks.map((c) => (
                  <li key={c.key} className="flex items-center gap-2.5 text-sm">
                    {c.ok ? (
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-text-subtle shrink-0" />
                    )}
                    <span className={c.ok ? "text-text-muted" : "text-text"}>
                      {c.label}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </aside>
      </div>

      {/* Sticky submit bar — left edge tracks the app sidebar (collapsed/expanded)
          so it never overlaps the nav and resizes when the user toggles it.
          On mobile the sidebar is an off-canvas drawer so left-0 is correct. */}
      <div
        className={`fixed bottom-0 right-0 left-0 z-30 bg-bg/70 backdrop-blur-xl border-t border-border transition-[left] duration-200 ${
          sidebarCollapsed ? "md:left-16" : "md:left-64"
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 text-[12px] text-text-muted min-w-0">
            {allRequiredOk ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <span className="truncate font-semibold">Ready to submit</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-warning shrink-0" />
                <span className="truncate">
                  <span className="hidden sm:inline">
                    {requiredChecks.length - requiredOkCount} required field
                    {requiredChecks.length - requiredOkCount === 1 ? "" : "s"} missing
                  </span>
                  <span className="sm:hidden">
                    {requiredChecks.length - requiredOkCount} missing
                  </span>
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigate("/app/purchase-requests")}
              disabled={submitting}
              className="px-4 py-2 text-[12px] font-semibold text-text-muted border border-border bg-surface-container-low/60 rounded-full hover:text-text hover:border-white/20 transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveDraftNow}
              disabled={submitting}
              className="px-4 py-2 text-[12px] font-semibold text-text border border-border bg-surface-container-low/60 rounded-full hover:bg-surface-container hover:border-white/20 transition-colors disabled:opacity-60 flex items-center gap-1.5 whitespace-nowrap"
              title="Save as draft — keeps your progress without submitting for approval"
            >
              <Save className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Save as Draft</span>
              <span className="sm:hidden">Draft</span>
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 sm:px-6 py-2 text-[12px] font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-full transition-all shadow-sm disabled:opacity-60 flex items-center gap-2 whitespace-nowrap"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span className="hidden sm:inline">
                {submitting ? "Submitting…" : "Submit for Approval"}
              </span>
              <span className="sm:hidden">
                {submitting ? "…" : "Submit"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
