import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Bell, Menu, Search } from "lucide-react";
import ThemeToggle from "../ui/ThemeToggle.jsx";
import NotificationsDropdown from "../../features/notifications/components/NotificationsDropdown.jsx";
import ProfileMenu from "../../features/notifications/components/ProfileMenu.jsx";
import { useAuthStore } from "../../features/auth/store.js";
import { useUIStore } from "../../features/ui/store.js";
import { formatUserRole } from "../../data/roles.js";

const SECTION_LABELS = {
  "":                   "Dashboard",
  "purchase-requests":  "Purchase Requests",
  "purchase-orders":    "Purchase Orders",
  "quotations":         "Quotations",
  "grn":                "Goods Receipt",
  "inventory":          "Inventory",
  "invoices":           "Invoices",
  "payments":           "Payments",
  "reports":            "Reports",
  "vendors":            "Vendors",
  "items":              "Items",
  "categories":         "Categories",
  "companies":          "Companies",
  "projects":           "Projects",
  "departments":        "Departments",
  "users":              "Users",
  "roles":              "Roles & Permissions",
  "approvals":          "Approval Rules",
  "settings":           "Settings",
  "notifications":      "Notifications",
  "profile":            "My Profile",
  "quotation-requests": "Quotation Requests",
  "application-status": "Application Status",
};

function getPageLabel(pathname) {
  const slug = pathname.split("/").filter(Boolean)[1] || "";
  if (SECTION_LABELS[slug] !== undefined) return SECTION_LABELS[slug];
  if (slug) return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return "Dashboard";
}

function computeInitials(name, email) {
  if (name?.trim()) {
    return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  }
  return email ? email.slice(0, 2).toUpperCase() : "?";
}

export default function Topbar() {
  const user          = useAuthStore((s) => s.user);
  const openMobileNav = useUIStore((s) => s.openMobileNav);
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();

  const pageLabel = getPageLabel(location.pathname);
  const initials  = computeInitials(user?.name, user?.email);
  const roleShort = user ? formatUserRole(user, { short: true }) : null;

  return (
    <header className="h-16 sticky top-0 z-30 bg-bg/80 backdrop-blur-md border-b border-border flex items-center gap-4 px-4 md:px-6">

      {/* ── Left ── */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={openMobileNav}
          className="md:hidden text-text-muted hover:text-text p-1.5 -ml-1 rounded-full hover:bg-surface-container-low transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="hidden md:block text-sm font-semibold text-text">{pageLabel}</h1>
      </div>

      {/* ── Search (pill, left-of-center) ── */}
      <div className="flex-1 flex justify-start md:justify-start">
        <label className="flex items-center gap-2.5 bg-surface-container-low border border-border rounded-full pl-4 pr-3 py-2 w-full max-w-sm cursor-text hover:border-primary/40 focus-within:border-primary/60 transition-colors">
          <Search className="h-3.5 w-3.5 text-text-muted shrink-0" />
          <input
            type="search"
            placeholder="Search…"
            className="bg-transparent outline-none text-sm text-text placeholder:text-text-subtle w-full min-w-0"
          />
        </label>
      </div>

      {/* ── Right ── */}
      <div className="flex items-center gap-1 shrink-0">

        <ThemeToggle />

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setNotifOpen((v) => !v); setProfileOpen(false); }}
            className="relative h-9 w-9 rounded-full text-text-muted hover:text-text hover:bg-surface-container-low border border-border flex items-center justify-center transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-[16px] w-[16px]" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
          </button>
          {notifOpen && <NotificationsDropdown onClose={() => setNotifOpen(false)} />}
        </div>

        {/* User — pill cluster: avatar + name + role */}
        <div className="relative flex items-center ml-1">
          <button
            type="button"
            onClick={() => { setProfileOpen((v) => !v); setNotifOpen(false); }}
            className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full border border-border bg-surface-container-low hover:bg-surface-container transition-colors"
            aria-label="Profile menu"
            title={user?.name ?? "Profile"}
          >
            <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold overflow-hidden shrink-0">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name ?? "avatar"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{user ? initials : "?"}</span>
              )}
            </span>
            {user && (
              <span className="hidden md:flex flex-col items-start leading-none gap-1 min-w-0">
                <span className="text-xs font-semibold text-text truncate max-w-[120px]">
                  {user.name}
                </span>
                {roleShort && (
                  <span className="text-[9px] font-bold uppercase tracking-widest text-text-muted">
                    {roleShort}
                  </span>
                )}
              </span>
            )}
          </button>
          {profileOpen && <ProfileMenu user={user} onClose={() => setProfileOpen(false)} />}
        </div>
      </div>
    </header>
  );
}
