import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Settings, LogOut, HelpCircle } from "lucide-react";
import { useAuthStore } from "../../auth/store.js";
import { useToast } from "../../../hooks/useToast.jsx";

export default function ProfileMenu({ user, onClose }) {
  const ref = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    const handler = (e) => {
      if (!ref.current?.contains(e.target)) onClose?.();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const role = user?.role ?? "employee";
  const profileLink =
    role === "vendor" ? "/vendor/profile" : role === "admin" ? "/admin/settings" : "/app/profile";
  const settingsLink = role === "admin" ? "/admin/settings" : "/app/profile";

  const items = [
    { to: profileLink, icon: User, label: "My Profile" },
    { to: settingsLink, icon: Settings, label: "Settings" },
    { to: "#", icon: HelpCircle, label: "Help Center", onClick: () => toast.info("Help center is coming soon") },
  ];

  const handleLogout = () => {
    onClose?.();
    logout();
    toast.success("Signed out");
    navigate("/login");
  };

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-56 bg-surface-container-lowest border border-border rounded-lg shadow-lg z-50 overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-border">
        <div className="text-sm font-bold text-text">{user?.name ?? "Guest"}</div>
        <div className="text-xs text-text-muted">{user?.email ?? "not signed in"}</div>
        {user?.role && (
          <div className="text-[10px] uppercase tracking-wider text-primary font-bold mt-1">{user.role}</div>
        )}
      </div>
      <div className="py-1">
        {items.map((it) => {
          const Icon = it.icon;
          if (it.onClick) {
            return (
              <button
                key={it.label}
                type="button"
                onClick={() => {
                  onClose?.();
                  it.onClick();
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-text hover:bg-surface-container-low transition-colors text-left"
              >
                <Icon className="h-4 w-4 text-text-muted" />
                {it.label}
              </button>
            );
          }
          return (
            // Key on label (not `to`) — for non-admin users both Profile and
            // Settings resolve to /app/profile; using `to` would collide.
            <Link
              key={it.label}
              to={it.to}
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-2 text-sm text-text hover:bg-surface-container-low transition-colors"
            >
              <Icon className="h-4 w-4 text-text-muted" />
              {it.label}
            </Link>
          );
        })}
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-danger hover:bg-danger-soft transition-colors border-t border-border"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </button>
    </div>
  );
}
