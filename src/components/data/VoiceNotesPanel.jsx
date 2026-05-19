import { Mic, Volume2 } from "lucide-react";

/**
 * Consolidated playback panel for every voice note attached to a single
 * record (PO / GRN / RFQ).
 *
 * The vendor can leave a voice note in several places — accept/reject on a
 * PO, dispatch-doc uploads, GRN replacement counter-proposals, etc. — and
 * the buyer-side viewers (HOD, CFO, CEO, admin, etc.) need a single spot
 * to hear them all without scrolling around the page. This component takes
 * a flat list of `notes` and renders them in chronological order with an
 * inline audio player.
 *
 * Props:
 *   title  — section heading (default "Voice notes")
 *   notes  — array of { audio, by, role, source, at, comment }
 *            * audio    — base64 data URL (audio/webm)
 *            * by       — speaker name (string)
 *            * role     — speaker role (string, optional)
 *            * source   — short label of where it came from
 *                         (e.g. "Vendor accepted PO", "E-Way Bill upload")
 *            * at       — ISO timestamp (optional)
 *            * comment  — companion text comment (optional)
 *   className
 *
 * Renders nothing when `notes` is empty — caller doesn't need to guard.
 */
export default function VoiceNotesPanel({
  title = "Voice notes",
  notes = [],
  className = "",
}) {
  if (!Array.isArray(notes) || notes.length === 0) return null;

  // Chronological so the conversation reads top-to-bottom.
  const sorted = [...notes].sort((a, b) => {
    const at = a?.at ?? "";
    const bt = b?.at ?? "";
    return at < bt ? -1 : at > bt ? 1 : 0;
  });

  return (
    <section className={`glass-card rounded-2xl overflow-hidden ${className}`}>
      <header className="flex items-center justify-between gap-2 px-5 py-4 border-b border-border bg-surface-container-low/40">
        <div className="flex items-center gap-2">
          <Mic className="h-4 w-4 text-primary" strokeWidth={2.25} />
          <h2 className="text-sm font-bold uppercase tracking-wider text-text">
            {title}
          </h2>
          <span className="text-[10px] uppercase tracking-widest font-bold text-text-muted">
            {sorted.length} clip{sorted.length === 1 ? "" : "s"}
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-widest font-semibold text-text-subtle inline-flex items-center gap-1">
          <Volume2 className="h-3 w-3" /> playback
        </span>
      </header>
      <ul className="divide-y divide-border">
        {sorted.map((n, i) => (
          <li key={i} className="px-5 py-4">
            <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
              <div className="min-w-0">
                <div className="text-sm font-bold text-text truncate">
                  {n.by ?? "Vendor"}
                  {n.role && (
                    <span className="ml-1.5 text-[10px] uppercase tracking-widest text-text-muted font-semibold">
                      {n.role}
                    </span>
                  )}
                </div>
                {n.source && (
                  <div className="text-[11px] text-text-muted">{n.source}</div>
                )}
              </div>
              {n.at && (
                <div className="text-[11px] text-text-subtle tabular-nums shrink-0">
                  {new Date(n.at).toLocaleString()}
                </div>
              )}
            </div>
            {n.comment && (
              <div className="mb-2 text-xs italic text-text-muted bg-surface-container-low/60 border border-border rounded-md px-3 py-1.5">
                &ldquo;{n.comment}&rdquo;
              </div>
            )}
            <audio
              src={n.audio}
              controls
              preload="metadata"
              className="w-full h-9"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
