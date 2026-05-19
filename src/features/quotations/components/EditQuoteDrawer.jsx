import { useState } from "react";
import Drawer from "../../../components/feedback/Drawer.jsx";

export default function EditQuoteDrawer({ open, quote, onClose, onSave }) {
  const [notes, setNotes] = useState(quote?.notes ?? "");
  const [eta, setEta] = useState(quote?.eta ?? "");

  return (
    <Drawer
      open={open}
      title={`Edit Quote — ${quote?.id ?? ""}`}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-text border border-border rounded-md hover:bg-surface-container-low">Cancel</button>
          <button
            onClick={() => {
              if (!eta) return;
              onSave?.({ notes, eta });
              onClose?.();
            }}
            disabled={!eta}
            className="px-6 py-2 text-sm font-bold text-primary-foreground bg-primary hover:bg-primary-hover rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Changes
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Delivery ETA <span className="text-danger">*</span></label>
          <input type="date" required value={eta} onChange={(e) => setEta(e.target.value)} className="w-full bg-surface-container-lowest border-0 border-b-2 border-outline-variant focus:border-primary px-3 py-2 text-sm outline-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Notes to Buyer</label>
          <textarea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, warranty details, clarifications…" className="w-full bg-surface-container-lowest border-0 border-b-2 border-outline-variant focus:border-primary px-3 py-2 text-sm outline-none resize-none" />
        </div>
      </div>
    </Drawer>
  );
}
