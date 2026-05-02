import { Printer, Download, Mail } from "lucide-react";

/**
 * Reusable Print + PDF (+ optional Email) action buttons. The PDF action
 * is just a hint that opens the same browser print dialog — users save
 * via "Destination: Save as PDF" which produces a 1:1 print-styled PDF.
 *
 * Mirrors the visual treatment used on PR Detail so every detail page in
 * the app gets the same affordance.
 *
 * Props:
 *   onPrint    — called when Print clicked (defaults to window.print)
 *   onPdf      — called when PDF clicked (defaults to a delayed window.print)
 *   onEmail    — optional; if provided, an Email button is shown
 *   onPdfHint  — optional toast hook to remind user to choose "Save as PDF"
 */
export default function PrintActions({ onPrint, onPdf, onEmail, onPdfHint }) {
  const handlePrint = () => (onPrint ?? (() => window.print()))();
  const handlePdf = () => {
    if (onPdf) return onPdf();
    onPdfHint?.("In the print dialog, pick 'Save as PDF' as the destination.");
    setTimeout(() => window.print(), 150);
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
        title="Opens the browser print dialog — select 'Save as PDF'"
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
