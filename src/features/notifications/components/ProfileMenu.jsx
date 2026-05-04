import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Settings, LogOut, HelpCircle } from "lucide-react";
import { useAuthStore } from "../../auth/store.js";
import { useToast } from "../../../hooks/useToast.jsx";
import { formatUserRole } from "../../../data/roles.js";

function computeInitials(name, email) {
  if (name?.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }
  return email ? email.slice(0, 2).toUpperCase() : "?";
}

export default function ProfileMenu({ user, onClose }) {
  const ref = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    const handler = (e) => {
      // Don't close if the click is inside the menu itself.
      if (ref.current?.contains(e.target)) return;
      // Don't close if the click is on the topbar profile-toggle button —
      // otherwise mousedown closes the menu and then the button's onClick
      // immediately toggles it back open, making the avatar feel un-clickable
      // when the menu is already open.
      if (e.target.closest?.('[aria-label="Profile menu"]')) return;
      onClose?.();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const role = user?.role ?? "employee";
  const profileLink =
    role === "vendor"
      ? "/vendor/profile"
      : role === "admin"
        ? "/admin/settings"
        : "/app/profile";
  const settingsLink = role === "admin" ? "/admin/settings" : "/app/profile";

  const items = [
    { to: profileLink, icon: User, label: "My Profile" },
    { to: settingsLink, icon: Settings, label: "Settings" },
    {
      to: "#",
      icon: HelpCircle,
      label: "Help Center",
      onClick: () => toast.info("Help center is coming soon"),
    },
  ];

  const handleLogout = () => {
    onClose?.();
    logout();
    toast.success("Signed out");
    navigate("/login");
  };

  const initials = computeInitials(user?.name, user?.email);
  const roleLabel = user ? formatUserRole(user) : null;

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-72 rounded-2xl z-50 overflow-hidden border border-border"
      style={{
        backgroundColor: "var(--color-surface)",
        backdropFilter: "blur(14px) saturate(1.1)",
        WebkitBackdropFilter: "blur(14px) saturate(1.1)",
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.06), 0 4px 16px -4px rgba(0,0,0,0.10), 0 24px 48px -16px rgba(0,0,0,0.18)",
      }}
    >
      {/* Profile header — avatar + name + role */}
      <div className="px-4 py-4 border-b border-border flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold overflow-hidden shrink-0">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.name ?? "avatar"}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold text-text truncate">
            {user?.name ?? "Guest"}
          </div>
          <div className="text-[11px] text-text-muted truncate">
            {user?.email ?? "not signed in"}
          </div>
          {roleLabel && (
            <div className="text-[9px] uppercase tracking-[0.18em] text-primary font-bold mt-1">
              {roleLabel}
            </div>
          )}
        </div>
      </div>

      {/* Menu items */}
      <div className="p-1.5">
        {items.map((it) => {
          const Icon = it.icon;
          const cls =
            "w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-text hover:bg-surface-container-low rounded-xl transition-colors text-left";
          if (it.onClick) {
            return (
              <button
                key={it.label}
                type="button"
                onClick={() => {
                  onClose?.();
                  it.onClick();
                }}
                className={cls}
              >
                <Icon
                  className="h-4 w-4 text-text-muted"
                  strokeWidth={2}
                />
                {it.label}
              </button>
            );
          }
          return (
            <Link
              key={it.label}
              to={it.to}
              onClick={onClose}
              className={cls}
            >
              <Icon className="h-4 w-4 text-text-muted" strokeWidth={2} />
              {it.label}
            </Link>
          );
        })}
      </div>

      {/* Sign out — separated, danger-tinted */}
      <div className="p-1.5 border-t border-border">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold text-danger hover:bg-danger-soft rounded-xl transition-colors"
        >
          <LogOut className="h-4 w-4" strokeWidth={2} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
