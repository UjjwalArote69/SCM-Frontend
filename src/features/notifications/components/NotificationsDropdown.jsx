import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, AlertCircle, Info, Mail, Bell } from "lucide-react";
import { useNotificationsStore } from "../store.js";

const ICON_MAP = {
  check: CheckCircle2,
  info: Info,
  mail: Mail,
  alert: AlertCircle,
  bell: Bell,
};
const TONE = {
  success: "text-success bg-success-soft",
  warning: "text-warning bg-warning-soft",
  danger: "text-danger bg-danger-soft",
  info: "text-info bg-info-soft",
};

export default function NotificationsDropdown({ onClose }) {
  const ref = useRef(null);
  const items = useNotificationsStore((s) => s.items).slice(0, 5);
  const unread = useNotificationsStore((s) => s.items.filter((n) => n.unread).length);
  const markRead = useNotificationsStore((s) => s.markRead);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current?.contains(e.target)) return;
      // Don't close on clicks to the bell trigger — otherwise mousedown
      // closes and the button's onClick re-opens immediately.
      if (e.target.closest?.('[aria-label="Notifications"]')) return;
      onClose?.();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-80 rounded-2xl z-50 overflow-hidden border border-border"
      style={{
        backgroundColor: "var(--color-surface)",
        backdropFilter: "blur(14px) saturate(1.1)",
        WebkitBackdropFilter: "blur(14px) saturate(1.1)",
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.06), 0 4px 16px -4px rgba(0,0,0,0.10), 0 24px 48px -16px rgba(0,0,0,0.18)",
      }}
    >
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-text text-sm">Notifications</h3>
          {unread > 0 && (
            <span className="text-xs text-primary font-semibold">{unread} new</span>
          )}
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="text-xs text-primary font-semibold hover:underline"
          >
            Mark all read
          </button>
        )}
      </div>
      <div className="max-h-80 overflow-y-auto divide-y divide-border">
        {items.length === 0 && (
          <div className="p-6 text-center text-text-muted text-sm">You're all caught up 🎉</div>
        )}
        {items.map((n) => {
          const Icon = ICON_MAP[n.icon] ?? Bell;
          return (
            <Link
              key={n.id}
              to={n.link}
              onClick={() => {
                markRead(n.id);
                onClose?.();
              }}
              className={`flex items-start gap-3 p-3 hover:bg-surface-container-low transition-colors ${
                n.unread ? "" : "opacity-70"
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${TONE[n.tone]}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-text truncate flex items-center gap-2">
                  {n.title}
                  {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                </div>
                <div className="text-xs text-text-muted">{n.time}</div>
              </div>
            </Link>
          );
        })}
      </div>
      <Link
        to="/app/notifications"
        onClick={onClose}
        className="block px-4 py-3 text-center text-sm font-bold text-primary hover:bg-surface-container-low border-t border-border"
      >
        View all notifications
      </Link>
    </div>
  );
}
