import { X } from "lucide-react";

export default function Drawer({ open, title, onClose, width = "520px", children, footer }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <aside
        role="dialog"
        aria-modal="true"
        className="h-full bg-surface-container-lowest shadow-xl border-l border-border flex flex-col"
        style={{ width }}
      >
        <header className="px-6 py-5 border-b border-border flex items-center justify-between bg-surface">
          <h2 className="text-lg font-bold text-text tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-text-muted hover:text-text transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
        {footer && (
          <footer className="px-6 py-4 bg-surface border-t border-border flex justify-end gap-3">
            {footer}
          </footer>
        )}
      </aside>
    </div>
  );
}
