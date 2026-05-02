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
} from "lucide-react";

export const NAV_CONFIG = {
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
        { to: "/app/purchase-requests", icon: ShoppingCart, label: "Purchase Requests" },
        { to: "/app/quotations", icon: FileText, label: "Quotations" },
        { to: "/app/purchase-orders", icon: ShoppingBag, label: "Purchase Orders" },
        { to: "/app/grn", icon: Package, label: "GRN" },
      ],
    },
    {
      label: "Goods",
      items: [
        { to: "/app/inventory", icon: Warehouse, label: "Inventory" },
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
        { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
      ],
    },
    {
      label: "Procurement",
      items: [
        { to: "/admin/purchase-requests", icon: ShoppingCart, label: "Purchase Requests" },
        { to: "/admin/purchase-orders", icon: ShoppingBag, label: "Purchase Orders" },
        { to: "/admin/quotations", icon: FileText, label: "Quotations" },
        { to: "/admin/grn", icon: Package, label: "GRN" },
      ],
    },
    {
      label: "Goods",
      items: [
        { to: "/admin/inventory", icon: Warehouse, label: "Inventory" },
      ],
    },
    {
      label: "Finance",
      items: [
        { to: "/admin/invoices", icon: ReceiptText, label: "Invoices" },
        { to: "/admin/payments", icon: Banknote, label: "Payments" },
      ],
    },
    {
      label: "Masters",
      items: [
        { to: "/admin/items", icon: Boxes, label: "Items" },
        { to: "/admin/vendors", icon: Users, label: "Vendors" },
        { to: "/admin/categories", icon: LayoutGrid, label: "Categories" },
        { to: "/admin/companies", icon: Building2, label: "Companies" },
        { to: "/admin/projects", icon: FolderKanban, label: "Projects" },
        { to: "/admin/departments", icon: Briefcase, label: "Departments" },
      ],
    },
    {
      label: "Insights",
      items: [
        { to: "/admin/reports", icon: BarChart3, label: "Reports" },
      ],
    },
    {
      label: "System",
      items: [
        { to: "/admin/users", icon: UserCog, label: "Users" },
        { to: "/admin/roles", icon: Shield, label: "Roles & Permissions" },
        { to: "/admin/approvals", icon: FileCheck2, label: "Approval Rules" },
        { to: "/admin/settings", icon: Settings, label: "Settings" },
      ],
    },
  ],
};
