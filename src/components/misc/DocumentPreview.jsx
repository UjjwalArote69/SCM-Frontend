import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FileText, Download, X, ZoomIn, Image as ImageIcon, FileWarning, Loader2 } from "lucide-react";

/**
 * Inline document preview tile + click-to-zoom modal.
 *
 *   <DocumentPreview url="…" mime="application/pdf" name="invoice.pdf" />
 *
 * Behaviour by type:
 *   image/*               → <img> thumbnail
 *   application/pdf       → embedded <iframe> with chrome hidden via hash params
 *                           (works inline at small sizes in Chrome / Edge / Firefox)
 *   anything else         → file icon + name
 *
 * Click the tile → opens a full-screen modal with a larger preview + download.
 *
 * Props:
 *   url        absolute or app-relative URL to the file
 *   mime       optional; falls back to URL-extension detection
 *   name       file name shown as caption
 *   thumbHeight  small/medium/large — defaults to medium
 */
export default function DocumentPreview({ url, mime, name, thumbHeight = "medium" }) {
  const [open, setOpen] = useState(false);
  const kind = detectKind(mime, url);
  const heights = { small: "h-24", medium: "h-36", large: "h-56" };
  const h = heights[thumbHeight] ?? heights.medium;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group block w-full text-left rounded-lg border border-border overflow-hidden bg-surface-container-low/40 hover:border-primary hover:shadow-md transition-all"
      >
        <div className={`relative ${h} bg-surface-container-low overflow-hidden flex items-center justify-center`}>
          <Thumbnail kind={kind} url={url} name={name} />

          {/* Zoom hint overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center pointer-events-none">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-bg/95 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold text-text inline-flex items-center gap-1.5 shadow-lg">
              <ZoomIn className="h-3.5 w-3.5" /> Preview
            </div>
          </div>
        </div>

        {name && (
          <div className="px-3 py-2 border-t border-border">
            <div className="text-xs font-medium text-text truncate">{name}</div>
            <div className="text-[10px] text-text-muted uppercase tracking-wide">{kindLabel(kind)}</div>
          </div>
        )}
      </button>

      {open && (
        <DocumentPreviewModal
          url={url}
          name={name}
          kind={kind}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// ── Inline thumbnail ────────────────────────────────────────────────────────
function Thumbnail({ kind, url, name }) {
  if (kind === "image") {
    return <img src={url} alt={name ?? ""} className="w-full h-full object-contain" loading="lazy" />;
  }
  if (kind === "pdf") {
    // Hash params hide native PDF toolbar/navpane/scrollbar in Chrome + Edge.
    // pointer-events-none stops the iframe from stealing the parent button click.
    return (
      <iframe
        title={name ?? "PDF preview"}
        src={`${url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
        className="w-full h-full pointer-events-none"
        loading="lazy"
      />
    );
  }
  // Fallback — generic file icon
  return (
    <div className="flex flex-col items-center justify-center text-text-muted gap-2">
      <FileWarning className="h-8 w-8" />
      <div className="text-xs font-semibold">Click to preview</div>
    </div>
  );
}

// ── Lightbox ────────────────────────────────────────────────────────────────
// Exported so callers with auth-gated URLs can open it imperatively after
// fetching the file as a blob and creating an object URL.
export function DocumentPreviewModal({ url, name, kind: kindProp, onClose }) {
  // Auto-detect kind if caller didn't pass one (e.g. blob URLs).
  const kind = kindProp ?? detectKind(undefined, url ?? "");

  // Body scroll lock — mount only; restored on unmount. Keeping this in its
  // own effect with empty deps avoids the flicker bug where re-rendering with
  // a new `onClose` identity would re-run cleanup mid-lock and leave the
  // page stuck with `overflow: hidden` after close.
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; };
  }, []);

  // Esc closes — re-binds if onClose identity changes (cheap, no leak risk).
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // For auth-gated URLs (e.g. /api/grn-documents/{id}/download), the user's
  // bearer token must already be set as cookie or via axios; iframes/img tags
  // don't carry it. The PoDocumentController + GrnDocumentController + vendor
  // assets serve via Storage::download() which checks server session/token.
  // For app-relative URLs without auth (e.g. /storage/…), this just works.

  // Portal to <body> so we escape any ancestor's `backdrop-filter`/`transform`
  // (e.g. `glass-card`) which would otherwise create a containing block for
  // `position: fixed` and clip the modal to the parent's bounding box —
  // making the page feel "stuck" because most of the viewport stops responding.
  return createPortal((
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
    >
      <div
        className="relative w-full max-w-5xl max-h-[90vh] bg-bg border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center gap-3 px-5 py-3 border-b border-border bg-surface-container-low/40">
          <div className="w-8 h-8 rounded-md bg-primary-soft text-primary flex items-center justify-center shrink-0">
            {kind === "image" ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-text truncate">{name ?? "Document"}</div>
            <div className="text-xs text-text-muted">{kindLabel(kind)}</div>
          </div>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              download={name ?? undefined}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary border border-primary/30 rounded-md hover:bg-primary-soft transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> Download
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text rounded-md hover:bg-surface-container-low transition-colors relative z-10"
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Viewport — flexes to fill modal */}
        <div className="flex-1 bg-surface-container-low/60 overflow-auto relative">
          {!url ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-text-muted">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Loading preview…</p>
            </div>
          ) : kind === "image" ? (
            <div className="min-h-full flex items-center justify-center p-4">
              <img
                src={url}
                alt={name ?? ""}
                className="max-w-full max-h-[80vh] object-contain"
              />
            </div>
          ) : kind === "pdf" ? (
            <iframe
              title={name ?? "Document"}
              src={url}
              className="w-full h-[78vh] border-0"
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 p-12 text-text-muted">
              <FileWarning className="h-12 w-12" />
              <p className="text-sm">Preview not available for this file type.</p>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                download={name}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-primary-foreground bg-primary rounded-md hover:brightness-110"
              >
                <Download className="h-4 w-4" /> Download to view
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  ), document.body);
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function detectKind(mime, url = "") {
  if (mime?.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  // URL-extension fallback (when mime isn't given)
  const lower = url.split("?")[0].toLowerCase();
  if (/\.(png|jpe?g|webp|gif|svg|bmp)$/.test(lower)) return "image";
  if (/\.pdf$/.test(lower)) return "pdf";
  return "other";
}

function kindLabel(kind) {
  if (kind === "image") return "Image";
  if (kind === "pdf")   return "PDF document";
  return "File";
}
