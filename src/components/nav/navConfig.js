import {
  LayoutDashboard,
  ShoppingCart,
  FileText,
  ShoppingBag,
  Package,
  Warehouse,
  ReceiptText,
  Banknote,
  Boxes,
  Users,
  LayoutGrid,
  Building2,
  FolderKanban,
  Settings,
  BarChart3,
  UserCog,
  Shield,
  ClipboardCheck,
  FileCheck2,
  Briefcase,
  Inbox,
  PackageCheck,
  UserCircle2,
} from "lucide-react";

// Roles whose default permission grant is so narrow that the full sidebar
// feels empty. For these users we collapse navigation into the topbar and
// give them an editorial landing page instead. The full sidebar reappears
// the moment an admin grants them broader access (see isSimpleUser below
// — it's strictly role-based so it stays stable across re-grants).
export const SIMPLE_USER_ROLES = new Set(["employee", "site_person"]);

export const isSimpleUser = (user) =>
  Boolean(user) && SIMPLE_USER_ROLES.has(user.role);

// Single-link inline nav surfaced in the topbar (desktop) + mobile drawer
// when a simple user is signed in. We only surface their primary workflow
// here — the avatar pill on the topbar's right already has "My Profile"
// in its dropdown, so an inline Profile link would just duplicate it.
export const SIMPLE_USER_NAV = {
  employee: [
    { to: "/app/purchase-requests", icon: ShoppingCart, label: "Requests", end: false },
  ],
  site_person: [
    { to: "/app/grn", icon: PackageCheck, label: "Receipts", end: false },
  ],
};

export const simpleNavFor = (user) => {
  if (!user) return [];
  return SIMPLE_USER_NAV[user.role] ?? [];
};

export const NAV_CONFIG = {
  // Each item declares the permission it requires. Sidebar filters items
  // whose permission is missing from the user's grant. Empty sections collapse
  // out so the rail stays tight. Admin (with role='admin') has the "*" token
  // and passes every check.
  //
  // Items without `permission` are visible to anyone — used for things like
  // Dashboard (every authenticated user has SOMETHING to do, even if it's an
  // empty composite home).
  user: [
    {
      label: "Main",
      items: [
        { to: "/app", icon: LayoutDashboard, label: "Dashboard", end: true },
      ],
    },
    {
      label: "Procurement",
      items: [
        { to: "/app/purchase-requests", icon: ShoppingCart, label: "Purchase Requests", permission: "pr.view" },
        { to: "/app/quotations",        icon: FileText,     label: "Quotations",        permission: "quote.view" },
        { to: "/app/purchase-orders",   icon: ShoppingBag,  label: "Purchase Orders",   permission: "po.view" },
        { to: "/app/grn",               icon: Package,      label: "GRN",               permission: "grn.view" },
      ],
    },
    {
      label: "Goods",
      items: [
        { to: "/app/inventory", icon: Warehouse, label: "Inventory", permission: "inventory.view" },
      ],
    },
    {
      label: "Finance",
      items: [
        { to: "/app/invoices", icon: ReceiptText, label: "Invoices", permission: "invoice.view" },
        { to: "/app/payments", icon: Banknote,    label: "Payments", permission: "payment.view" },
      ],
    },
    {
      label: "Insights",
      items: [
        { to: "/app/reports", icon: BarChart3, label: "Reports", permission: "reports.view" },
      ],
    },
  ],

  // CFO sees a finance-centric layout: Finance is the primary section, then
  // Procurement (for context on what's in the pipeline) and Reports.
  // Inventory is dropped (not actionable for CFO).
  cfo: [
    {
      label: "Main",
      items: [
        { to: "/app", icon: LayoutDashboard, label: "Dashboard", end: true },
      ],
    },
    {
      label: "Finance",
      items: [
        { to: "/app/invoices", icon: ReceiptText, label: "Invoices" },
        { to: "/app/payments", icon: Banknote, label: "Payments" },
      ],
    },
    {
      label: "Approvals",
      items: [
        { to: "/app/purchase-requests", icon: ShoppingCart, label: "Purchase Requests" },
        { to: "/app/purchase-orders", icon: ShoppingBag, label: "Purchase Orders" },
        { to: "/app/quotations", icon: FileText, label: "Quotations" },
        // CFO approves GRN at pending_cfo — needs a link to find them.
        { to: "/app/grn", icon: Package, label: "GRN" },
      ],
    },
    {
      label: "Insights",
      items: [
        { to: "/app/reports", icon: BarChart3, label: "Reports" },
      ],
    },
  ],

  vendor: [
    {
      label: "Main",
      items: [
        { to: "/vendor", icon: LayoutDashboard, label: "Dashboard", end: true },
      ],
    },
    {
      label: "Procurement",
      items: [
        { to: "/vendor/quotation-requests", icon: Inbox, label: "Quotation Requests" },
        { to: "/vendor/quotations", icon: FileText, label: "My Quotations" },
        { to: "/vendor/purchase-orders", icon: ShoppingBag, label: "Purchase Orders" },
        { to: "/vendor/invoices", icon: ReceiptText, label: "Invoices" },
        { to: "/vendor/grn", icon: PackageCheck, label: "Goods Receipts" },
      ],
    },
    {
      label: "Account",
      items: [
        { to: "/vendor/application-status", icon: ClipboardCheck, label: "Application Status" },
      ],
    },
  ],

  admin: [
    {
      label: "Main",
      items: [
        { to: "/admin", icon: LayoutDashboard, label: "Control Center", end: true },
      ],
    },
    {
      // Admin's actual job: configuring how the system behaves.
      label: "Control",
      items: [
        { to: "/admin/users",        icon: UserCog,     label: "Users",              badge: "users-invited" },
        { to: "/admin/roles",        icon: Shield,      label: "Roles & Permissions" },
        { to: "/admin/approvals",    icon: FileCheck2,  label: "Approval Rules" },
        { to: "/admin/departments",  icon: Briefcase,   label: "Departments" },
        { to: "/admin/settings",     icon: Settings,    label: "Settings" },
      ],
    },
    {
      label: "Catalog",
      items: [
        { to: "/admin/items",       icon: Boxes,       label: "Items" },
        { to: "/admin/vendors",     icon: Users,       label: "Vendors",     badge: "vendors-pending" },
        { to: "/admin/categories",  icon: LayoutGrid,  label: "Categories" },
        { to: "/admin/companies",   icon: Building2,   label: "Companies" },
        { to: "/admin/projects",    icon: FolderKanban, label: "Projects" },
      ],
    },
    {
      label: "Operations",
      items: [
        { to: "/admin/purchase-requests", icon: ShoppingCart, label: "Purchase Requests", badge: "prs-pending" },
        { to: "/admin/purchase-orders",   icon: ShoppingBag,  label: "Purchase Orders",   badge: "pos-pending" },
        { to: "/admin/quotations",        icon: FileText,     label: "Quotations" },
        { to: "/admin/grn",               icon: Package,      label: "GRN" },
        { to: "/admin/inventory",         icon: Warehouse,    label: "Inventory" },
      ],
    },
    {
      label: "Finance",
      items: [
        { to: "/admin/invoices", icon: ReceiptText, label: "Invoices" },
        { to: "/admin/payments", icon: Banknote,    label: "Payments", badge: "payments-pending" },
      ],
    },
    {
      label: "Insights",
      items: [
        { to: "/admin/reports", icon: BarChart3, label: "Reports" },
      ],
    },
  ],
};
