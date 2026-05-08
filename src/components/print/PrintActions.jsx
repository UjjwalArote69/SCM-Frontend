import { Printer, Download, Mail } from "lucide-react";

/**
 * Reusable Print + PDF (+ optional Email) action buttons.
 *
 * When `pdfFetcher` is supplied — a function returning a Blob (typically the
 * `downloadPdf(number)` method on the feature's api.js) — Print and PDF both
 * use the real DomPDF endpoint:
 *   • PDF clicks   → fetch blob, trigger a normal browser download.
 *   • Print clicks → fetch blob, mount it in a hidden iframe, fire the
 *                    browser print dialog. No popup, no extra tab.
 *
 * If `pdfFetcher` isn't supplied, both fall back to `window.print()` so
 * legacy detail pages (which don't yet have a server-side PDF) still work.
 *
 * Props:
 *   pdfFetcher  — async () => Blob. Enables real-PDF mode.
 *   pdfFilename — string used as the saved filename (e.g. "PR-2026-0042.pdf")
 *   onPrint     — override: called when Print clicked
 *   onPdf       — override: called when PDF clicked
 *   onEmail     — optional; if provided, an Email button is shown
 *   onPdfHint   — optional toast hook used in fallback (window.print) mode
 *   onError     — optional toast hook for blob-fetch failures
 */
export default function PrintActions({
  pdfFetcher,
  pdfFilename,
  onPrint,
  onPdf,
  onEmail,
  onPdfHint,
  onError,
}) {
  const handlePdf = async () => {
    if (onPdf) return onPdf();
    if (pdfFetcher) {
      try {
        const blob = await pdfFetcher();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = pdfFilename || "document.pdf";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (err) {
        onError?.(err?.response?.data?.message ?? "Could not download PDF");
      }
      return;
    }
    // No server-side PDF wired — fall back to the browser print-to-PDF flow.
    onPdfHint?.("In the print dialog, pick 'Save as PDF' as the destination.");
    setTimeout(() => window.print(), 150);
  };

  const handlePrint = async () => {
    if (onPrint) return onPrint();
    if (pdfFetcher) {
      try {
        const blob = await pdfFetcher();
        const url = URL.createObjectURL(blob);
        const iframe = document.createElement("iframe");
        iframe.style.cssText =
          "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
        iframe.src = url;
        iframe.onload = () => {
          try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          } catch {
            onPdfHint?.("Press Ctrl+P to print the PDF preview.");
          }
        };
        document.body.appendChild(iframe);
        setTimeout(() => {
          URL.revokeObjectURL(url);
          iframe.remove();
        }, 60_000);
      } catch (err) {
        onError?.(err?.response?.data?.message ?? "Could not open print preview");
      }
      return;
    }
    window.print();
  };

  return (
    <div className="flex items-center gap-2 flex-wrap print:hidden">
      <button
        type="button"
        onClick={handlePrint}
        className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-text-muted border border-border rounded-md hover:bg-surface-container hover:text-text flex items-center gap-1.5"
        aria-label="Print"
      >
        <Printer className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Print</span>
      </button>
      <button
        type="button"
        onClick={handlePdf}
        title={pdfFetcher ? "Download as PDF" : "Opens the browser print dialog — select 'Save as PDF'"}
        className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-text-muted border border-border rounded-md hover:bg-surface-container hover:text-text flex items-center gap-1.5"
        aria-label="Save as PDF"
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">PDF</span>
      </button>
      {onEmail && (
        <button
          type="button"
          onClick={onEmail}
          className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-text-muted border border-border rounded-md hover:bg-surface-container hover:text-text flex items-center gap-1.5"
          aria-label="Email"
        >
          <Mail className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Email</span>
        </button>
      )}
    </div>
  );
}
