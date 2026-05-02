import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCheck, CheckCircle2, AlertCircle, Info, Mail, RotateCcw } from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import { useNotificationsStore } from "../store.js";
import { useToast } from "../../../hooks/useToast.jsx";

const ICON_MAP = {
  check: CheckCircle2,
  info: Info,
  mail: Mail,
  alert: AlertCircle,
  bell: Bell,
};
const TONE = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
};

export default function NotificationsInboxPage() {
  const [filter, setFilter] = useState("all");
  const items = useNotificationsStore((s) => s.items);
  const markRead = useNotificationsStore((s) => s.markRead);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);
  const reset = useNotificationsStore((s) => s.reset);
  const toast = useToast();

  const unreadCount = items.filter((n) => n.unread).length;
  const filtered = filter === "unread" ? items.filter((n) => n.unread) : items;

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title="Notifications"
        subtitle="Stay updated on what's happening in your workspace"
        actions={
          <>
            <button
              onClick={() => {
                reset();
                toast.info("Demo notifications restored");
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-md border border-border text-text text-sm font-semibold hover:bg-surface-container-low"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
            <button
              onClick={() => {
                markAllRead();
                toast.success("All notifications marked as read");
              }}
              disabled={unreadCount === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-md border border-border text-text text-sm font-semibold hover:bg-surface-container-low disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCheck className="h-4 w-4" /> Mark all read
            </button>
          </>
        }
      />

      <div className="flex gap-2 mb-6">
        {[
          { k: "all", l: `All (${items.length})` },
          { k: "unread", l: `Unread (${unreadCount})` },
        ].map((f) => (
          <button
            key={f.k}
            onClick={() => setFilter(f.k)}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold ${
              filter === f.k
                ? "bg-primary text-primary-foreground"
                : "bg-surface-container-low text-text border border-border"
            }`}
          >
            {f.l}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((n) => {
          const Icon = ICON_MAP[n.icon] ?? Bell;
          return (
            <Link
              key={n.id}
              to={n.link}
              onClick={() => markRead(n.id)}
              className={`flex items-start gap-4 p-4 rounded-lg border transition-colors hover:border-primary ${
                n.unread ? "bg-surface-container-lowest border-border" : "bg-transparent border-border/50"
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${TONE[n.tone]}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-semibold text-sm ${n.unread ? "text-text" : "text-text-muted"}`}>
                    {n.title}
                  </span>
                  {n.unread && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                </div>
                <p className="text-sm text-text-muted">{n.body}</p>
                <div className="text-xs text-text-subtle mt-1">{n.time}</div>
              </div>
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-text-muted">
            <Bell className="h-12 w-12 mx-auto mb-4 text-text-subtle" strokeWidth={1.25} />
            <p>{filter === "unread" ? "Nothing unread" : "No notifications"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
