import { useEffect, useRef, useState } from "react";
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Loader2,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Truck,
  Receipt,
  ScrollText,
} from "lucide-react";
import { usePoDocumentsStore } from "../store.js";
import { useToast } from "../../../hooks/useToast.jsx";
import { useAuthStore } from "../../auth/store.js";

/**
 * Reusable Documents card for a single PO.
 *
 * Props:
 *   poNumber  — required
 *   canUpload — whether this viewer can upload (vendor for own PO + admin)
 *   compact   — tighter spacing for embedding inside PO Detail
 *
 * Per-doc delete eligibility is computed from the auth store:
 *   - admins can delete every doc
 *   - the original uploader can delete their own
 *   This mirrors the backend's `PoDocumentController::destroy` rule so the
 *   button only appears where the action would actually succeed.
 *
 * Backend contract is fully opaque to this component — it only reads/writes
 * the shape returned by `/api/po-documents` so a Node.js backend swap won't
 * change a single line in here.
 */

const DOC_TYPES = [
  { value: "e_way_bill",    label: "E-Way Bill",     icon: Truck },
  { value: "invoice",       label: "Invoice",        icon: Receipt },
  { value: "delivery_note", label: "Delivery Note",  icon: ScrollText },
];

const ALLOWED_MIMES = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB — keep in sync with backend

// Module-level stable empty array for the Zustand selector. Returning a
// fresh `[]` literal on each call would make `useSyncExternalStore` see a
// new snapshot every render → infinite re-render loop.
const EMPTY_DOCS = Object.freeze([]);

function fmtSize(bytes) {
  const n = Number(bytes ?? 0);
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

function fmtDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function docTypeMeta(type) {
  return DOC_TYPES.find((t) => t.value === type) ?? {
    value: type,
    label: type,
    icon: FileText,
  };
}

export default function PoDocumentsCard({
  poNumber,
  canUpload = false,
  compact = false,
}) {
  const docs = usePoDocumentsStore((s) => s.byPo[poNumber] ?? EMPTY_DOCS);
  const fetchForPo = usePoDocumentsStore((s) => s.fetchForPo);
  const upload = usePoDocumentsStore((s) => s.upload);
  const remove = usePoDocumentsStore((s) => s.remove);
  const download = usePoDocumentsStore((s) => s.download);
  const user = useAuthStore((s) => s.user);
  const toast = useToast();

  const isAdmin = user?.role === "admin";
  /** Per-doc delete gate — mirrors PoDocumentController::destroy(). */
  const canDeleteDoc = (doc) =>
    isAdmin ||
    (user?.id != null && doc.uploaded_by?.id === user.id);

  const [docType, setDocType] = useState("invoice");
  const [pickedFile, setPickedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (poNumber) fetchForPo(poNumber).catch(() => {});
  }, [poNumber, fetchForPo]);

  const validate = (file) => {
    if (!file) return "Pick a file first.";
    if (!ALLOWED_MIMES.includes(file.type)) {
      return "Only PDF, JPG, or PNG files are accepted.";
    }
    if (file.size > MAX_BYTES) {
      return `File is too large (max ${fmtSize(MAX_BYTES)}).`;
    }
    return null;
  };

  const handlePick = (file) => {
    setError(null);
    const v = validate(file);
    if (v) {
      setError(v);
      setPickedFile(null);
      return;
    }
    setPickedFile(file);
  };

  const handleSubmit = async () => {
    if (!pickedFile) return;
    setSubmitting(true);
    setProgress(0);
    try {
      await upload({ po_number: poNumber, doc_type: docType, file: pickedFile }, setProgress);
      toast.success(`Uploaded ${pickedFile.name}`);
      setPickedFile(null);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      const serverMsg =
        err?.response?.data?.errors?.file?.[0] ??
        err?.response?.data?.message ??
        err?.message ??
        "Upload failed";
      setError(serverMsg);
      toast.error(serverMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (doc) => {
    if (
      !window.confirm(`Delete ${doc.original_name}? This cannot be undone.`)
    ) {
      return;
    }
    try {
      await remove(poNumber, doc.id);
      toast.success("Document removed");
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Could not delete");
    }
  };

  const handleDownload = (doc) => {
    download(doc.id, doc.original_name).catch((err) => {
      toast.error(err?.response?.data?.message ?? "Could not download");
    });
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };
  const onDragLeave = () => setDragOver(false);
  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) handlePick(f);
  };

  return (
    <section className="bg-surface-container-lowest border border-border rounded-lg overflow-hidden">
      <header className={`flex items-center justify-between gap-2 ${compact ? "px-4 py-3" : "px-5 py-4"} border-b border-border bg-surface-container-low/40`}>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-text-muted" strokeWidth={2.25} />
          <h2 className="text-sm font-bold uppercase tracking-wider text-text">
            Documents
          </h2>
          <span className="text-[10px] uppercase tracking-widest font-bold text-text-muted">
            {docs.length} attached
          </span>
        </div>
      </header>

      {/* Upload area — vendor / admin only */}
      {canUpload && (
        <div className={`${compact ? "p-4" : "p-5"} border-b border-border space-y-3`}>
          {/* Doc type picker */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {DOC_TYPES.map((t) => {
              const Icon = t.icon;
              const active = docType === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setDocType(t.value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                    active
                      ? "bg-info text-white border-info"
                      : "bg-surface-container-lowest border-border text-text-muted hover:border-info/50 hover:text-info"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Drag-drop / click-to-upload zone */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => !submitting && inputRef.current?.click()}
            className={`rounded-lg border-2 border-dashed text-center cursor-pointer transition-colors px-4 py-6 sm:py-8 ${
              dragOver
                ? "border-info bg-info-soft/30"
                : pickedFile
                  ? "border-success bg-success-soft/30"
                  : "border-border bg-surface-container-low/30 hover:border-info/50"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              className="hidden"
              onChange={(e) => handlePick(e.target.files?.[0])}
              disabled={submitting}
            />
            {pickedFile ? (
              <div className="flex items-center justify-center gap-3 text-left">
                {pickedFile.type === "application/pdf" ? (
                  <FileText className="h-6 w-6 text-success shrink-0" strokeWidth={2} />
                ) : (
                  <ImageIcon className="h-6 w-6 text-success shrink-0" strokeWidth={2} />
                )}
                <div className="min-w-0">
                  <div className="font-semibold text-text text-sm truncate max-w-[260px]">
                    {pickedFile.name}
                  </div>
                  <div className="text-xs text-text-muted">
                    {fmtSize(pickedFile.size)} · ready to upload
                  </div>
                </div>
              </div>
            ) : (
              <>
                <UploadCloud
                  className="h-7 w-7 mx-auto mb-2 text-text-muted"
                  strokeWidth={1.75}
                />
                <p className="text-sm font-semibold text-text">
                  Drag a file here, or click to browse
                </p>
                <p className="text-xs text-text-muted mt-1">
                  PDF, JPG, or PNG · max {fmtSize(MAX_BYTES)}
                </p>
              </>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-danger bg-danger-soft/40 border border-danger/30 rounded-md px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Progress */}
          {submitting && (
            <div className="space-y-1.5">
              <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
                <div
                  className="h-full bg-info transition-[width] duration-200"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <div className="text-[11px] text-text-muted text-right tabular-nums">
                {Math.round(progress * 100)}%
              </div>
            </div>
          )}

          {/* Submit / Clear */}
          <div className="flex items-center justify-end gap-2">
            {pickedFile && !submitting && (
              <button
                type="button"
                onClick={() => {
                  setPickedFile(null);
                  setError(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-text rounded-md hover:bg-surface-container-low"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!pickedFile || submitting}
              className="px-4 py-2 text-sm font-bold text-primary-foreground bg-primary hover:bg-primary-hover rounded-md disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {submitting ? "Uploading…" : "Upload"}
            </button>
          </div>
        </div>
      )}

      {/* Existing docs list */}
      <div className={compact ? "" : ""}>
        {docs.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-text-muted">
            {canUpload
              ? "No documents uploaded yet. Use the form above to attach an E-Way Bill, invoice, or delivery note."
              : "No documents have been attached to this PO yet."}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {docs.map((d) => {
              const meta = docTypeMeta(d.doc_type);
              const Icon = meta.icon;
              return (
                <li
                  key={d.id}
                  className={`flex items-center gap-3 ${compact ? "px-4 py-3" : "px-5 py-3.5"} hover:bg-surface-container-low/40`}
                >
                  <div className="w-9 h-9 rounded-md bg-info-soft text-info flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-text text-sm truncate max-w-[280px]">
                        {d.original_name}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded bg-info-soft text-info border border-info/20">
                        {meta.label}
                      </span>
                    </div>
                    <div className="text-xs text-text-muted">
                      {fmtSize(d.size_bytes)} ·{" "}
                      {d.uploaded_by?.name ? (
                        <>
                          uploaded by{" "}
                          <span className="font-semibold text-text">
                            {d.uploaded_by.name}
                          </span>
                          {" · "}
                        </>
                      ) : null}
                      {fmtDateTime(d.uploaded_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDownload(d)}
                      className="p-2 rounded-md text-text-muted hover:text-text hover:bg-surface-container-low"
                      title="Download"
                      aria-label="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    {canDeleteDoc(d) && (
                      <button
                        type="button"
                        onClick={() => handleDelete(d)}
                        className="p-2 rounded-md text-text-muted hover:text-danger hover:bg-danger-soft/40"
                        title="Delete"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
