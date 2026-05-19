import { useEffect, useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronsLeft, ChevronsRight, Factory, X } from "lucide-react";
import { NAV_CONFIG, simpleNavFor } from "./navConfig.js";
import { useUIStore } from "../../features/ui/store.js";
import { usePRStore } from "../../features/purchase-requests/store.js";
import { usePOStore } from "../../features/purchase-orders/store.js";
import { useVendorsStore } from "../../features/masters/vendors/store.js";
import { useUsersStore } from "../../features/admin-home/users/store.js";
import { usePaymentStore } from "../../features/payments/store.js";
import { useAuthStore } from "../../features/auth/store.js";
import { formatUserRole } from "../../data/roles.js";

function NavItem({ to, icon: Icon, label, end, collapsed, onNavigate, badgeCount }) {
  const showBadge = badgeCount > 0;
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      title={collapsed ? `${label}${showBadge ? ` (${badgeCount})` : ""}` : undefined}
      className={({ isActive }) =>
        [
          "relative flex items-center gap-3 text-sm rounded-xl transition-colors duration-150",
          collapsed ? "mx-auto w-10 h-10 justify-center" : "mx-3 px-3 py-2.5",
          isActive
            ? "bg-surface-container-low border border-border text-text font-semibold shadow-sm"
            : "text-text-muted hover:bg-surface-container-low hover:text-text",
        ]
          .filter(Boolean)
          .join(" ")
      }
    >
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
      {showBadge && (
        <span
          className={
            collapsed
              ? "absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-warning text-primary-foreground text-[9px] font-bold flex items-center justify-center"
              : "ml-auto min-w-[20px] px-1.5 h-5 rounded-full bg-warning-soft text-warning text-[10px] font-bold flex items-center justify-center"
          }
        >
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}
    </NavLink>
  );
}

export default function Sidebar({ audience = "user", mode = "full" }) {
  const collapsed      = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar  = useUIStore((s) => s.toggleSidebar);
  const mobileNavOpen  = useUIStore((s) => s.mobileNavOpen);
  const closeMobileNav = useUIStore((s) => s.closeMobileNav);
  const user           = useAuthStore((s) => s.user);
  const userRole       = user?.role;
  const userPerms      = user?.permissions ?? [];
  const isSimple       = mode === "simple";
  // Role-specific layout substitution inside the "user" audience: CFO sees a
  // finance-centric nav. The actual item set is still filtered by permissions
  // below, so the CFO layout is just a different *ordering* of the sections.
  const effectiveKey = audience === "user" && userRole === "cfo" ? "cfo" : audience;
  const rawSections    = NAV_CONFIG[effectiveKey] ?? NAV_CONFIG.user;
  // Filter nav entries by the user's permission grants (admin-editable matrix
  // at /admin/roles). An item without a `permission` is visible to everyone;
  // admin's permissions array is the wildcard ["*"] from /api/me, which we
  // honour explicitly.
  const sections = useMemo(() => {
    const isAdmin = Array.isArray(userPerms) && userPerms.includes("*");
    const allows = (item) => !item.permission
      || isAdmin
      || userPerms.includes(item.permission);
    return rawSections
      .map((section) => ({ ...section, items: section.items.filter(allows) }))
      .filter((section) => section.items.length > 0);
  }, [rawSections, userPerms]);
  const location       = useLocation();

  // ── Live badge counts (admin only) — derived from already-fetched stores ──
  const isAdmin = audience === "admin";
  const prItems       = usePRStore((s) => s.items);
  const poItems       = usePOStore((s) => s.items);
  const vendorItems   = useVendorsStore((s) => s.items);
  const userItems     = useUsersStore((s) => s.items);
  const paymentItems  = usePaymentStore((s) => s.items);
  const badges = useMemo(() => {
    if (!isAdmin) return {};
    return {
      "prs-pending":      prItems.filter((p) => p.status === "pending").length,
      "pos-pending":      poItems.filter((p) => p.chain_stage && p.chain_stage !== "done"
                                                && !["accepted","rejected","fulfilled"].includes(p.status)).length,
      "vendors-pending":  vendorItems.filter((v) => v.approval_status === "pending"
                                                || v.status === "pending").length,
      "users-invited":    userItems.filter((u) => !u.email_verified_at).length,
      "payments-pending": paymentItems.filter((p) =>
        p.chain_stage === "pending_cfo" || p.chain_stage === "pending_ceo").length,
    };
  }, [isAdmin, prItems, poItems, vendorItems, userItems, paymentItems]);

  useEffect(() => { closeMobileNav(); }, [location.pathname, closeMobileNav]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mobileNavOpen]);

  // Simple mode: no desktop chrome at all. Drawer-only on mobile, fixed
  // width when open, translated off-screen otherwise. We never expand
  // onto the page on desktop so the simple-user landing experience can
  // own the full viewport.
  if (isSimple) {
    const items = simpleNavFor(user);
    const roleShort = user ? formatUserRole(user, { short: true }) : null;
    const mobileTransform = mobileNavOpen ? "translate-x-0" : "-translate-x-full";
    return (
      <>
        {mobileNavOpen && (
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeMobileNav}
            className="md:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
          />
        )}
        <nav
          className={`md:hidden fixed left-0 top-0 h-full w-72 max-w-[85vw] z-40 flex flex-col bg-surface-container-lowest/95 backdrop-blur-xl border-r border-border transition-transform duration-200 ${mobileTransform}`}
        >
          {/* Brand row */}
          <div className="shrink-0 flex items-center gap-3 h-16 px-4 border-b border-border">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-sm">
              <Factory className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="text-[15px] font-black text-text tracking-tight flex-1 truncate">
              Suppliers First
            </span>
            <button
              type="button"
              onClick={closeMobileNav}
              className="text-text-muted hover:text-text p-1 rounded-lg transition-colors"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Identity pill */}
          {user && (
            <div className="px-4 pt-5 pb-3">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-black overflow-hidden shrink-0">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name ?? ""} className="w-full h-full object-cover" />
                  ) : (
                    (user.name ?? "?").trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-bold text-text truncate leading-tight">{user.name}</div>
                  {roleShort && (
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-subtle mt-0.5">
                      {roleShort}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Nav */}
          <div className="flex-1 overflow-y-auto px-3 pt-4">
            <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-text-subtle">
              Workspace
            </p>
            <div className="flex flex-col gap-1">
              {items.map((item) => (
                <NavItem
                  key={item.to}
                  to={item.to}
                  icon={item.icon}
                  label={item.label}
                  end={item.end}
                  collapsed={false}
                  onNavigate={closeMobileNav}
                />
              ))}
            </div>
          </div>
        </nav>
      </>
    );
  }

  const widthCls           = collapsed ? "md:w-16" : "md:w-64";
  const mobileTransformCls = mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0";

  return (
    <>
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={closeMobileNav}
          className="md:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
        />
      )}

      <nav
        className={`scm-chrome fixed left-0 top-0 h-full w-64 flex flex-col z-40 bg-surface-container-lowest/85 backdrop-blur-xl border-r border-border transition-transform duration-200 md:transition-[width] ${widthCls} ${mobileTransformCls}`}
      >
        {/* ── Brand ── */}
        <div className={`shrink-0 flex items-center gap-3 h-16 ${collapsed ? "justify-center px-0" : "px-4"}`}>
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-sm">
            <Factory className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <>
              <span className="text-[15px] font-black text-text tracking-tight flex-1 truncate">
                Suppliers First
              </span>
              <button
                type="button"
                onClick={closeMobileNav}
                className="md:hidden text-text-muted hover:text-text p-1 rounded-lg transition-colors"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {/* ── Nav ── */}
        <div className="flex-1 overflow-y-auto py-2 space-y-5">
          {sections.map((section) => (
            <div key={section.label}>
              {!collapsed && (
                <p className="px-6 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-text-subtle">
                  {section.label}
                </p>
              )}
              <div className="flex flex-col gap-1">
                {section.items.map((item) => (
                  <NavItem
                    key={item.to}
                    {...item}
                    collapsed={collapsed}
                    onNavigate={closeMobileNav}
                    badgeCount={item.badge ? badges[item.badge] : undefined}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Collapse toggle (desktop only) ── */}
        <div className="shrink-0 border-t border-border p-2 hidden md:block">
          <button
            type="button"
            onClick={toggleSidebar}
            title={collapsed ? "Expand" : undefined}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-text-muted hover:text-text hover:bg-surface-container-low rounded-lg transition-colors ${collapsed ? "justify-center px-0" : ""}`}
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4 shrink-0" />
            ) : (
              <>
                <ChevronsLeft className="h-4 w-4 shrink-0" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </nav>
    </>
  );
}
