import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Search, FileText, ShoppingBag, ShoppingCart, Package, Building2, Boxes,
  UserCog, Briefcase, FolderKanban, LayoutGrid, BarChart3, FileCheck2, Shield,
  Settings, Wallet, ReceiptText, Warehouse, ArrowRight, X,
} from "lucide-react";
import { usePRStore } from "../../features/purchase-requests/store.js";
import { usePOStore } from "../../features/purchase-orders/store.js";
import { useRFQStore } from "../../features/quotations/store.js";
import { useGRNStore } from "../../features/grn/store.js";
import { useVendorsStore } from "../../features/masters/vendors/store.js";
import { useItemsStore } from "../../features/masters/items/store.js";
import { useUsersStore } from "../../features/admin-home/users/store.js";
import { usePaymentStore } from "../../features/payments/store.js";

/**
 * Global search across loaded entity stores + a static page-navigation list.
 *
 *   - `/admin/*` audience gets the full surface (entities + admin pages).
 *   - `/vendor/*` is scoped to vendor-portal pages.
 *   - everything else (in-org `/app/*`) gets the operational surface.
 *
 * The data comes from already-loaded Zustand stores — we don't fire extra
 * API calls. If a store is empty, that entity simply doesn't contribute
 * results until the user has visited that section once.
 *
 * Keyboard:  ↑ / ↓ to move, Enter to open, Esc to close, Ctrl/⌘+K to focus.
 */

const ENTITY_ICONS = {
  pr: ShoppingCart, po: ShoppingBag, rfq: FileText, grn: Package,
  vendor: Building2, item: Boxes, user: UserCog, payment: Wallet, page: ArrowRight,
};

// ── Page registry (static navigation suggestions) ────────────────────────────
const PAGES = {
  app: [
    { to: "/app",                     label: "Dashboard",         icon: BarChart3 },
    { to: "/app/purchase-requests",   label: "Purchase Requests", icon: ShoppingCart },
    { to: "/app/purchase-orders",     label: "Purchase Orders",   icon: ShoppingBag },
    { to: "/app/quotations",          label: "Quotations",        icon: FileText },
    { to: "/app/grn",                 label: "GRN",               icon: Package },
    { to: "/app/inventory",           label: "Inventory",         icon: Warehouse },
    { to: "/app/invoices",            label: "Invoices",          icon: ReceiptText },
    { to: "/app/payments",            label: "Payments",          icon: Wallet },
    { to: "/app/reports",             label: "Reports",           icon: BarChart3 },
    { to: "/app/profile",             label: "My Profile",        icon: UserCog },
  ],
  admin: [
    { to: "/admin",                     label: "Control Center",     icon: BarChart3 },
    { to: "/admin/users",               label: "Users",              icon: UserCog },
    { to: "/admin/roles",               label: "Roles & Permissions", icon: Shield },
    { to: "/admin/approvals",           label: "Approval Rules",     icon: FileCheck2 },
    { to: "/admin/departments",         label: "Departments",        icon: Briefcase },
    { to: "/admin/settings",            label: "Settings",           icon: Settings },
    { to: "/admin/items",               label: "Items",              icon: Boxes },
    { to: "/admin/vendors",             label: "Vendors",            icon: Building2 },
    { to: "/admin/categories",          label: "Categories",         icon: LayoutGrid },
    { to: "/admin/companies",           label: "Companies",          icon: Building2 },
    { to: "/admin/projects",            label: "Projects",           icon: FolderKanban },
    { to: "/admin/purchase-requests",   label: "Purchase Requests",  icon: ShoppingCart },
    { to: "/admin/purchase-orders",     label: "Purchase Orders",    icon: ShoppingBag },
    { to: "/admin/quotations",          label: "Quotations",         icon: FileText },
    { to: "/admin/grn",                 label: "GRN",                icon: Package },
    { to: "/admin/inventory",           label: "Inventory",          icon: Warehouse },
    { to: "/admin/payments",            label: "Payments",           icon: Wallet },
    { to: "/admin/reports",             label: "Reports",            icon: BarChart3 },
  ],
  vendor: [
    { to: "/vendor",                     label: "Vendor Dashboard",  icon: BarChart3 },
    { to: "/vendor/quotation-requests",  label: "Quotation Requests",icon: FileText },
    { to: "/vendor/quotations",          label: "My Quotations",     icon: FileText },
    { to: "/vendor/purchase-orders",     label: "Purchase Orders",   icon: ShoppingBag },
    { to: "/vendor/invoices",            label: "Invoices",          icon: ReceiptText },
    { to: "/vendor/profile",             label: "My Profile",        icon: UserCog },
  ],
};

function audienceFromPath(pathname) {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/vendor")) return "vendor";
  return "app";
}

const MAX_PER_GROUP = 5;

export default function GlobalSearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const audience = audienceFromPath(location.pathname);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  // Entity stores — read items only; do NOT trigger fetches from here.
  const prs       = usePRStore((s) => s.items);
  const pos       = usePOStore((s) => s.items);
  const rfqs      = useRFQStore((s) => s.items);
  const grns      = useGRNStore((s) => s.items);
  const vendors   = useVendorsStore((s) => s.items);
  const items     = useItemsStore((s) => s.items);
  const users     = useUsersStore((s) => s.items);
  const payments  = usePaymentStore((s) => s.items);

  // Cmd/Ctrl+K shortcut to focus the input
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Click outside → close
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (!wrapperRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Reset active index when results change
  useEffect(() => { setActiveIdx(0); }, [query, audience]);

  // Close on route change
  useEffect(() => { setOpen(false); setQuery(""); }, [location.pathname]);

  // Compute groups based on audience + query
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const matches = (s) => typeof s === "string" && s.toLowerCase().includes(q);

    const linkPrefix = audience === "admin" ? "/admin" : audience === "vendor" ? "/vendor" : "/app";

    const groups = [];

    // PRs
    if (audience !== "vendor") {
      const rows = prs.filter((p) => matches(p.number) || matches(p.title) || matches(p.requester_name) || matches(p.department))
        .slice(0, MAX_PER_GROUP)
        .map((p) => ({
          kind: "pr",
          to: `${linkPrefix}/purchase-requests/${p.number}`,
          primary: p.number,
          secondary: p.title || p.requester_name || "—",
          tag: p.status,
        }));
      if (rows.length) groups.push({ label: "Purchase Requests", rows });
    }

    // POs
    {
      const rows = pos.filter((p) => matches(p.number) || matches(p.vendor) || matches(p.pr_number))
        .slice(0, MAX_PER_GROUP)
        .map((p) => ({
          kind: "po",
          to: `${linkPrefix}/purchase-orders/${p.number}`,
          primary: p.number,
          secondary: p.vendor || "—",
          tag: p.status,
        }));
      if (rows.length) groups.push({ label: "Purchase Orders", rows });
    }

    // RFQs / Quotations
    if (audience !== "vendor") {
      const rows = rfqs.filter((r) => matches(r.number) || matches(r.pr_number))
        .slice(0, MAX_PER_GROUP)
        .map((r) => ({
          kind: "rfq",
          to: `${linkPrefix}/quotations/${r.number}`,
          primary: r.number,
          secondary: r.pr_number ? `From ${r.pr_number}` : "—",
          tag: r.status,
        }));
      if (rows.length) groups.push({ label: "Quotations", rows });
    }

    // GRNs
    if (audience !== "vendor") {
      const rows = grns.filter((g) => matches(g.number) || matches(g.po_number) || matches(g.vendor))
        .slice(0, MAX_PER_GROUP)
        .map((g) => ({
          kind: "grn",
          to: `${linkPrefix}/grn/${g.number}`,
          primary: g.number,
          secondary: g.po_number || g.vendor || "—",
          tag: g.status,
        }));
      if (rows.length) groups.push({ label: "GRNs", rows });
    }

    // Vendors
    if (audience !== "vendor") {
      const rows = vendors.filter((v) => matches(v.vendor_name) || matches(v.code) || matches(v.gstin))
        .slice(0, MAX_PER_GROUP)
        .map((v) => ({
          kind: "vendor",
          to: audience === "admin" ? `/admin/vendors` : `/app/profile`,
          primary: v.vendor_name,
          secondary: v.code,
          tag: v.approval_status ?? v.status,
        }));
      if (rows.length) groups.push({ label: "Vendors", rows });
    }

    // Items
    if (audience !== "vendor") {
      const rows = items.filter((i) => matches(i.code) || matches(i.name) || matches(i.category))
        .slice(0, MAX_PER_GROUP)
        .map((i) => ({
          kind: "item",
          to: audience === "admin" ? `/admin/items` : `/app/inventory`,
          primary: i.code,
          secondary: i.name,
          tag: i.category,
        }));
      if (rows.length) groups.push({ label: "Items", rows });
    }

    // Users — admin only
    if (audience === "admin") {
      const rows = users.filter((u) => matches(u.name) || matches(u.email) || matches(u.role))
        .slice(0, MAX_PER_GROUP)
        .map((u) => ({
          kind: "user",
          to: "/admin/users",
          primary: u.name || u.email,
          secondary: u.email,
          tag: u.role,
        }));
      if (rows.length) groups.push({ label: "Users", rows });
    }

    // Payments
    if (audience !== "vendor") {
      const rows = payments.filter((p) => matches(p.number) || matches(p.vendor) || matches(p.po_number))
        .slice(0, MAX_PER_GROUP)
        .map((p) => ({
          kind: "payment",
          to: `${linkPrefix}/payments/${p.number}`,
          primary: p.number,
          secondary: p.vendor || p.po_number,
          tag: p.status,
        }));
      if (rows.length) groups.push({ label: "Payments", rows });
    }

    // Pages — always last (lower priority than data hits)
    {
      const pages = PAGES[audience] ?? [];
      const rows = pages.filter((p) => matches(p.label))
        .slice(0, MAX_PER_GROUP)
        .map((p) => ({
          kind: "page",
          to: p.to,
          primary: p.label,
          secondary: "Open page",
          icon: p.icon,
        }));
      if (rows.length) groups.push({ label: "Pages", rows });
    }

    return groups;
  }, [query, audience, prs, pos, rfqs, grns, vendors, items, users, payments]);

  // Flat list for keyboard nav
  const flat = useMemo(() => groups.flatMap((g) => g.rows), [groups]);
  const total = flat.length;

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      setOpen(false);
      e.currentTarget.blur();
      return;
    }
    if (!open || total === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % total);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + total) % total);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = flat[activeIdx];
      if (target) navigate(target.to);
    }
  };

  const showPanel = open && query.trim().length > 0;
  const hasResults = total > 0;

  return (
    <div ref={wrapperRef} className="flex-1 flex justify-start relative">
      <label className={`flex items-center gap-2.5 bg-surface-container-low border rounded-full pl-4 pr-3 py-2 w-full max-w-sm cursor-text transition-colors ${
        open ? "border-primary/60" : "border-border hover:border-primary/40"
      }`}>
        <Search className="h-3.5 w-3.5 text-text-muted shrink-0" />
        <input
          ref={inputRef}
          type="search"
          placeholder="Search PRs, POs, vendors, items… (Ctrl+K)"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="bg-transparent outline-none text-sm text-text placeholder:text-text-subtle w-full min-w-0"
        />
        {query && (
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setQuery(""); inputRef.current?.focus(); }}
            className="text-text-subtle hover:text-text-muted shrink-0"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </label>

      {showPanel && (
        <div className="absolute top-full left-0 mt-2 w-full max-w-md bg-surface-container-lowest border border-border rounded-xl shadow-2xl overflow-hidden z-50">
          {!hasResults ? (
            <div className="p-6 text-center text-sm text-text-muted">
              No matches for <span className="font-semibold text-text">"{query}"</span>
              <p className="text-xs text-text-subtle mt-1">
                Visit a section once to populate its data for search.
              </p>
            </div>
          ) : (
            <div className="max-h-[480px] overflow-y-auto py-1">
              {(() => {
                let runningIdx = 0;
                return groups.map((group) => (
                  <section key={group.label}>
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-text-subtle bg-surface-container-low/60 border-b border-border">
                      {group.label}
                    </div>
                    {group.rows.map((row) => {
                      const myIdx = runningIdx++;
                      const isActive = myIdx === activeIdx;
                      const Icon = row.icon ?? ENTITY_ICONS[row.kind] ?? ArrowRight;
                      return (
                        <button
                          key={`${row.kind}-${row.to}-${row.primary}-${myIdx}`}
                          type="button"
                          onMouseEnter={() => setActiveIdx(myIdx)}
                          onMouseDown={(e) => { e.preventDefault(); navigate(row.to); }}
                          className={`w-full text-left flex items-center gap-3 px-3 py-2 transition-colors ${
                            isActive ? "bg-primary-soft" : "hover:bg-surface-container-low"
                          }`}
                        >
                          <span className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                            isActive ? "bg-primary text-primary-foreground" : "bg-surface-container-low text-text-muted"
                          }`}>
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="text-sm font-semibold text-text truncate block">{row.primary}</span>
                            {row.secondary && (
                              <span className="text-xs text-text-muted truncate block">{row.secondary}</span>
                            )}
                          </span>
                          {row.tag && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-container-low text-text-muted shrink-0">
                              {row.tag}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </section>
                ));
              })()}
            </div>
          )}
          <div className="px-3 py-1.5 text-[10px] text-text-subtle bg-surface-container-low/60 border-t border-border flex items-center justify-between">
            <span>{total} result{total === 1 ? "" : "s"}</span>
            <span>↑↓ to navigate · Enter to open · Esc to close</span>
          </div>
        </div>
      )}
    </div>
  );
}
