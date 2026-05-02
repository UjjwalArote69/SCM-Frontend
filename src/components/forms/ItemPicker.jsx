import { useEffect, useRef, useState } from "react";
import { Search, Loader2, Plus } from "lucide-react";
import client from "../../api/client.js";

/**
 * Search-as-you-type item picker.
 *
 * Wraps a name input that hits GET /api/items?q=…. Picking a result calls
 * `onPick(item)` with the full item record so the caller can fan out
 * code / hsn_code / uom / spec_hints into its line-item state.
 *
 * Free-text fallback: typing a name that doesn't match any catalog entry
 * stays as a custom item — the consumer just keeps `name` and lets
 * code / hsn_code stay empty.
 *
 * Props
 *   value           — current text in the input (controlled)
 *   onChange(text)  — text changes (typing)
 *   onPick(item)    — user clicked a catalog match
 *   placeholder
 *   error           — boolean, applies error styling
 *   inputClassName  — override input styles to match host form
 */
export default function ItemPicker({
  value,
  onChange,
  onPick,
  placeholder = "Search items… (e.g. laptop, bearing, cable)",
  error = false,
  inputClassName,
}) {
  const [matches, setMatches] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const wrapRef = useRef(null);
  const debounceRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Debounced search on value change
  useEffect(() => {
    clearTimeout(debounceRef.current);
    const q = (value ?? "").trim();
    if (q.length < 2) {
      setMatches([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await client.get("/items", { params: { q, active: true } });
        const list = (res?.data?.data ?? []).slice(0, 12);
        setMatches(list);
        setHighlight(list.length > 0 ? 0 : -1);
      } catch {
        setMatches([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [value]);

  const pick = (item) => {
    onPick?.(item);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!open || matches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter") {
      if (highlight >= 0 && highlight < matches.length) {
        e.preventDefault();
        pick(matches[highlight]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const cls =
    inputClassName ??
    `w-full bg-surface-container-lowest border-0 border-b-2 ${
      error ? "border-danger" : "border-outline-variant"
    } focus:border-primary px-3 py-2 text-sm text-text outline-none`;

  const showDropdown = open && (loading || matches.length > 0 || (value ?? "").trim().length >= 2);

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <input
          type="text"
          className={`${cls} pl-9`}
          value={value ?? ""}
          onChange={(e) => {
            onChange?.(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
        />
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
        {loading && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted animate-spin" />
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-surface border border-border rounded-md shadow-lg max-h-72 overflow-y-auto">
          {loading && matches.length === 0 ? (
            <div className="px-3 py-2 text-xs text-text-muted">Searching catalog…</div>
          ) : matches.length === 0 ? (
            <div className="px-3 py-3">
              <div className="text-xs text-text-muted mb-1">
                No catalog match — typed text will be saved as a custom item.
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs font-bold text-primary inline-flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Use “{value}” as custom item
              </button>
            </div>
          ) : (
            <ul role="listbox">
              {matches.map((item, idx) => (
                <li
                  key={item.code}
                  role="option"
                  aria-selected={idx === highlight}
                  onMouseEnter={() => setHighlight(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault(); // don't blur the input before click handler
                    pick(item);
                  }}
                  className={`px-3 py-2 cursor-pointer ${
                    idx === highlight ? "bg-primary-soft" : "hover:bg-surface-container-low"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-text truncate">
                        {item.name}
                      </div>
                      <div className="text-xs text-text-muted truncate">
                        {item.category && <span>{item.category}</span>}
                        {item.category && item.hsn_code && <span className="mx-1">·</span>}
                        {item.hsn_code && <span>HSN {item.hsn_code}</span>}
                        {item.uom && (
                          <>
                            <span className="mx-1">·</span>
                            <span>{item.uom}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-text-subtle shrink-0">
                      {item.code}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
