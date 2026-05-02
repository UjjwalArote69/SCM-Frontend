import { useState } from "react";
import { X, UploadCloud, FileSpreadsheet, Download } from "lucide-react";
import { useToast } from "../../../hooks/useToast.jsx";

export default function ImportItemsModal({ open, onClose }) {
  const [file, setFile] = useState(null);
  const toast = useToast();
  if (!open) return null;
  const doImport = () => {
    toast.success(`Imported ${file?.name ?? "file"}`);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="w-full max-w-[520px] bg-surface-container-lowest rounded-lg shadow-xl border border-border overflow-hidden">
        <div className="px-6 py-5 border-b border-border flex justify-between items-center bg-surface">
          <h2 className="text-lg font-bold text-text">Import Items</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <button onClick={() => toast.success("Template downloaded")} className="w-full flex items-center justify-center gap-2 py-2.5 border border-border rounded-md text-sm font-semibold hover:bg-surface-container-low">
            <Download className="h-4 w-4" /> Download Sample Template (.xlsx)
          </button>
          <label className="block border-2 border-dashed border-outline-variant bg-surface-container-low rounded-md p-10 text-center cursor-pointer hover:border-primary">
            {file ? (
              <div className="flex flex-col items-center">
                <FileSpreadsheet className="h-10 w-10 text-success mb-2" />
                <p className="text-sm font-semibold">{file.name}</p>
                <p className="text-xs text-text-muted">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <UploadCloud className="h-10 w-10 text-text-subtle mb-2" strokeWidth={1.5} />
                <p className="text-sm font-semibold">Drop Excel file here</p>
                <p className="text-xs text-text-muted">.xlsx or .csv, max 5 MB</p>
              </div>
            )}
            <input type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => setFile(e.target.files?.[0])} />
          </label>
        </div>
        <div className="px-6 py-4 bg-surface border-t border-border flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-text border border-border rounded-md hover:bg-surface-container-low">Cancel</button>
          <button onClick={doImport} disabled={!file} className="px-6 py-2 text-sm font-bold text-primary-foreground bg-primary hover:bg-primary-hover rounded-md disabled:bg-surface-container-high disabled:text-text-muted disabled:cursor-not-allowed">
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
