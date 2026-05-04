import { useState } from "react";
import { X, Package } from "lucide-react";

export default function AcceptPOModal({ poNumber, onClose, onAccept, busy = false }) {
  const [terms, setTerms] = useState(false);

  const handleAccept = () => {
    if (!terms) return;
    onAccept?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="w-full max-w-[520px] bg-surface-container-lowest rounded-lg shadow-xl border border-border overflow-hidden">
        <div className="px-6 py-5 border-b border-border flex justify-between items-center bg-surface">
          <h2 className="text-lg font-bold text-text">Accept {poNumber}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex items-start gap-3 p-3 bg-info-soft text-info rounded">
            <Package className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-sm leading-relaxed">
              Confirm acceptance of this purchase order. Once accepted you
              commit to fulfilling it on the terms shown on the PO. The buyer
              is notified immediately.
            </p>
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="h-4 w-4 mt-0.5 rounded text-primary border-outline-variant"
            />
            <span className="text-sm text-text">
              I have reviewed and accept the terms &amp; conditions of this
              purchase order.
            </span>
          </label>
        </div>
        <div className="px-6 py-4 bg-surface border-t border-border flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text border border-border rounded-md hover:bg-surface-container-low"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={!terms || busy}
            className="px-6 py-2 text-sm font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-md disabled:bg-surface-container-high disabled:text-text-muted disabled:cursor-not-allowed"
          >
            {busy ? "Accepting…" : "Accept PO"}
          </button>
        </div>
      </div>
    </div>
  );
}
