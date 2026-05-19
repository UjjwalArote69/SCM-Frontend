import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Bell, Menu, Factory } from "lucide-react";
import GlobalSearch from "./GlobalSearch.jsx";
import ThemeToggle from "../ui/ThemeToggle.jsx";
import NotificationsDropdown from "../../features/notifications/components/NotificationsDropdown.jsx";
import ProfileMenu from "../../features/notifications/components/ProfileMenu.jsx";
import { useAuthStore } from "../../features/auth/store.js";
import { useUIStore } from "../../features/ui/store.js";
import { formatUserRole } from "../../data/roles.js";
import { simpleNavFor } from "./navConfig.js";

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

export default function Topbar({ mode = "default" }) {
  const user          = useAuthStore((s) => s.user);
  const openMobileNav = useUIStore((s) => s.openMobileNav);
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();

  const pageLabel = getPageLabel(location.pathname);
  const initials  = computeInitials(user?.name, user?.email);
  const roleShort = user ? formatUserRole(user, { short: true }) : null;
  const isSimple  = mode === "simple";
  const simpleNav = isSimple ? simpleNavFor(user) : [];

  return (
    <header className="scm-chrome h-16 sticky top-0 z-30 bg-bg/70 backdrop-blur-xl border-b border-border flex items-center gap-2 sm:gap-4 px-3 sm:px-4 md:px-6">

      {/* ── Left ── */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Hamburger only when there's a sidebar to open. Simple users
            (employee / site_person) have no sidebar, so hide it for them. */}
        {!isSimple && (
          <button
            type="button"
            onClick={openMobileNav}
            className="md:hidden text-text-muted hover:text-text p-1.5 -ml-1 rounded-full hover:bg-surface-container-low transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        {isSimple ? (
          // Brand mark replaces the sidebar entirely. Icon-only on mobile,
          // icon + wordmark on desktop.
          <Link to="/app" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-sm group-hover:brightness-110 transition-[filter]">
              <Factory className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="hidden md:inline text-[15px] font-black text-text tracking-tight">
              Suppliers First
            </span>
          </Link>
        ) : (
          <h1 className="hidden md:block text-sm font-semibold text-text">{pageLabel}</h1>
        )}
      </div>

      {isSimple && simpleNav.length > 0 ? (
        // Inline nav — visible on mobile too now that the hamburger is gone.
        // Tight pill style so it doesn't crowd notifications + avatar.
        <nav className="flex items-center gap-1 ml-0 sm:ml-2">
          {simpleNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={item.label}
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-colors ${
                    isActive
                      ? "bg-primary-soft text-primary"
                      : "text-text-muted hover:text-text hover:bg-surface-container-low"
                  }`
                }
              >
                <Icon className="h-[15px] w-[15px]" strokeWidth={2.2} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      ) : null}

      {/* ── Search (pill, left-of-center) — hidden in simple mode ── */}
      {isSimple ? <div className="flex-1" /> : <GlobalSearch />}

      {/* ── Right ── */}
      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">

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

        {/* User — pill cluster: avatar + name + role. On mobile the pill
            collapses to just an avatar circle (no border, no extra padding)
            so the cluster stays inside even at iPhone-SE width (320px). */}
        <div className="relative flex items-center ml-0.5 sm:ml-1">
          <button
            type="button"
            onClick={() => { setProfileOpen((v) => !v); setNotifOpen(false); }}
            className="flex items-center gap-2.5 md:pl-1 md:pr-3 md:py-1 md:rounded-full md:border md:border-border md:bg-surface-container-low md:hover:bg-surface-container transition-colors"
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
