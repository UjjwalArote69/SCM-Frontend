import { useEffect, useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronsLeft, ChevronsRight, Factory, X } from "lucide-react";
import { NAV_CONFIG } from "./navConfig.js";
import { useUIStore } from "../../features/ui/store.js";
import { usePRStore } from "../../features/purchase-requests/store.js";
import { usePOStore } from "../../features/purchase-orders/store.js";
import { useVendorsStore } from "../../features/masters/vendors/store.js";
import { useUsersStore } from "../../features/admin-home/users/store.js";
import { usePaymentStore } from "../../features/payments/store.js";

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

export default function Sidebar({ audience = "user" }) {
  const collapsed      = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar  = useUIStore((s) => s.toggleSidebar);
  const mobileNavOpen  = useUIStore((s) => s.mobileNavOpen);
  const closeMobileNav = useUIStore((s) => s.closeMobileNav);
  const sections       = NAV_CONFIG[audience] ?? NAV_CONFIG.user;
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
