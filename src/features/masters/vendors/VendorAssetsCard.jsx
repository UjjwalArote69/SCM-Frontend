import { useEffect, useRef, useState } from "react";
import {
  Image as ImageIcon, FileText, ShieldCheck, BookOpen,
  Upload, Trash2, Loader2, CheckCircle2,
} from "lucide-react";
import { useToast } from "../../../hooks/useToast.jsx";
import client from "../../../api/client.js";
import DocumentPreview from "../../../components/misc/DocumentPreview.jsx";

/**
 * VendorAssetsCard — uploads + previews for the four vendor profile files.
 *
 * Slots: logo, gst (cert), pan (doc), brochure.
 *   - logo:     image/png|jpg|webp|svg, ≤ 5 MB
 *   - gst/pan:  pdf|jpg|png,            ≤ 5 MB
 *   - brochure: pdf,                    ≤ 5 MB
 *
 * Reads/writes to /api/vendors/{code}/assets — admin or the vendor (matched
 * by user_id) can manage. Uses the public `local` disk via Storage facade,
 * served through the /storage symlink.
 */

const SLOTS = [
  { key: "logo",     col: "vendor_logo",  label: "Company Logo",   Icon: ImageIcon,  hint: "PNG, JPG, WebP or SVG · ≤ 5 MB", accept: "image/*" },
  { key: "gst",      col: "document",     label: "GST Certificate", Icon: ShieldCheck, hint: "PDF, JPG or PNG · ≤ 5 MB",       accept: "application/pdf,image/jpeg,image/png" },
  { key: "pan",      col: "pan_document", label: "PAN Document",    Icon: FileText,   hint: "PDF, JPG or PNG · ≤ 5 MB",       accept: "application/pdf,image/jpeg,image/png" },
  { key: "brochure", col: "brochure_pdf", label: "Company Brochure", Icon: BookOpen,  hint: "PDF only · ≤ 5 MB",              accept: "application/pdf" },
];

export default function VendorAssetsCard({ vendorCode, userEmail, onChange }) {
  const toast = useToast();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    if (!vendorCode && !userEmail) return;
    setLoading(true);
    try {
      let v = null;
      if (vendorCode) {
        v = (await client.get(`/vendors/${vendorCode}`)).data?.data ?? null;
      } else if (userEmail) {
        const list = (await client.get("/vendors", { params: { q: userEmail } })).data?.data ?? [];
        v = list.find((x) => x.email_address_1 === userEmail) ?? null;
      }
      setVendor(v);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Couldn't load vendor.");
    } finally { setLoading(false); }
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [vendorCode, userEmail]);

  if (loading && !vendor) {
    return (
      <section className="bg-surface-container-lowest border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-center py-6 text-text-muted">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading assets…
        </div>
      </section>
    );
  }
  if (!vendor) return null;

  const updated = (newVendor) => {
    setVendor(newVendor);
    onChange?.(newVendor);
  };

  return (
    <section className="bg-surface-container-lowest border border-border rounded-2xl p-5 sm:p-6 shadow-sm">
      <header className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-md bg-primary-soft text-primary flex items-center justify-center shrink-0">
          <FileText className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-text">Documents &amp; Assets</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Upload your company logo, GST certificate, PAN, and brochure. Visible to procurement during evaluation.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SLOTS.map((slot) => (
          <AssetSlot
            key={slot.key}
            slot={slot}
            vendor={vendor}
            onChange={updated}
          />
        ))}
      </div>
    </section>
  );
}

function AssetSlot({ slot, vendor, onChange }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const path = vendor[slot.col];
  const has = !!path;
  // Build the public URL (the storage:link symlink serves /storage/* publicly).
  // Cache-bust by vendor.updated_at so a replace shows the new file immediately.
  const url = has ? `/storage/${path}?v=${encodeURIComponent(vendor.updated_at ?? "")}` : null;
  const fileName = has ? (path.split("/").pop() ?? slot.label) : null;

  const upload = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File must be ≤ 5 MB"); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("asset_type", slot.key);
      fd.append("file", file);
      const r = await client.post(`/vendors/${vendor.code}/assets`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onChange(r.data?.data);
      toast.success(`${slot.label} uploaded.`);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Upload failed.");
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!window.confirm(`Remove ${slot.label.toLowerCase()}?`)) return;
    setBusy(true);
    try {
      const r = await client.delete(`/vendors/${vendor.code}/assets`, {
        data: { asset_type: slot.key },
      });
      onChange(r.data?.data);
      toast.success(`${slot.label} removed.`);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Delete failed.");
    } finally { setBusy(false); }
  };

  const Icon = slot.Icon;
  return (
    <div
      className={`relative rounded-xl border p-3 transition-colors ${
        has ? "bg-success-soft/30 border-success/30" : "bg-surface-container-low/40 border-border hover:border-primary/50"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={slot.accept}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; upload(f); }}
      />

      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${
          has ? "bg-success-soft text-success" : "bg-primary-soft text-primary"
        }`}>
          {has ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-text text-sm">{slot.label}</h3>
            {has && <span className="text-[10px] font-bold uppercase tracking-wider text-success">Uploaded</span>}
          </div>
          <p className="text-xs text-text-muted">{slot.hint}</p>

          {/* Preview tile — image / PDF / fallback */}
          {has && (
            <div className="mt-3">
              <DocumentPreview url={url} name={fileName} thumbHeight="small" />
            </div>
          )}

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-border rounded-md hover:bg-surface-container-low disabled:opacity-50"
            >
              {busy
                ? <><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</>
                : <><Upload className="h-3 w-3" /> {has ? "Replace" : "Upload"}</>}
            </button>
            {has && (
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-danger/30 text-danger rounded-md hover:bg-danger-soft/40 disabled:opacity-50"
              >
                <Trash2 className="h-3 w-3" /> Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
