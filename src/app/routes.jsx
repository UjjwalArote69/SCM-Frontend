import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

import UserLayout from "../layouts/UserLayout.jsx";
import VendorLayout from "../layouts/VendorLayout.jsx";
import AdminLayout from "../layouts/AdminLayout.jsx";

// Eager — entry points + small shells. Lazy-loading the login page would
// add a flash on the most common entry point, so it stays in the main bundle.
import Login from "../features/auth/pages/Login.jsx";
import Landing from "../pages/Landing.jsx";
import Forbidden from "../pages/Forbidden.jsx";
import RoleGate from "./guards/RoleGate.jsx";

// Lazy — every page-level component, split into route-bound chunks. The
// initial bundle drops from ~1MB → ~200-300 KB; each route fetches its
// own chunk on first nav. Vite produces hashed chunk filenames automatically.
const ForgotPassword          = lazy(() => import("../features/auth/pages/ForgotPassword.jsx"));
const ResetPassword           = lazy(() => import("../features/auth/pages/ResetPassword.jsx"));
const VendorRegistrationPage  = lazy(() => import("../features/onboarding/pages/VendorRegistrationPage.jsx"));

const UserHome   = lazy(() => import("../features/user-home/pages/UserHome.jsx"));
const VendorHome = lazy(() => import("../features/vendor-home/pages/VendorHome.jsx"));
const AdminHome  = lazy(() => import("../features/admin-home/pages/AdminHome.jsx"));

const PRList   = lazy(() => import("../features/purchase-requests/pages/List.jsx"));
const PRCreate = lazy(() => import("../features/purchase-requests/pages/Create.jsx"));
const PRDetail = lazy(() => import("../features/purchase-requests/pages/Detail.jsx"));

const POList   = lazy(() => import("../features/purchase-orders/pages/List.jsx"));
const POCreate = lazy(() => import("../features/purchase-orders/pages/Create.jsx"));
const PODetail = lazy(() => import("../features/purchase-orders/pages/Detail.jsx"));

const QList    = lazy(() => import("../features/quotations/pages/List.jsx"));
const QCreate  = lazy(() => import("../features/quotations/pages/CreateRFQ.jsx"));
const QCompare = lazy(() => import("../features/quotations/pages/Comparison.jsx"));
const QSubmit  = lazy(() => import("../features/quotations/pages/SubmitQuote.jsx"));

const GRNList     = lazy(() => import("../features/grn/pages/List.jsx"));
const GRNCreate   = lazy(() => import("../features/grn/pages/Create.jsx"));
const GRNDetail   = lazy(() => import("../features/grn/pages/Detail.jsx"));

const InvoicesList         = lazy(() => import("../features/finance/pages/InvoicesList.jsx"));
const InvoiceApproval      = lazy(() => import("../features/finance/pages/InvoiceApproval.jsx"));
const PaymentsList         = lazy(() => import("../features/payments/pages/List.jsx"));
const PaymentCreate        = lazy(() => import("../features/payments/pages/Create.jsx"));
const PaymentDetail        = lazy(() => import("../features/payments/pages/Detail.jsx"));
const VendorInvoiceUpload  = lazy(() => import("../features/finance/pages/VendorInvoiceUpload.jsx"));

const InventoryList = lazy(() => import("../features/masters/pages/Inventory.jsx"));
const ItemsList     = lazy(() => import("../features/masters/pages/ItemsList.jsx"));
const VendorsList   = lazy(() => import("../features/masters/pages/VendorsList.jsx"));
const Categories    = lazy(() => import("../features/masters/pages/Categories.jsx"));
const Companies     = lazy(() => import("../features/masters/pages/Companies.jsx"));
const Projects      = lazy(() => import("../features/masters/pages/Projects.jsx"));
const Departments   = lazy(() => import("../features/masters/pages/Departments.jsx"));

const UsersList         = lazy(() => import("../features/admin-home/pages/UsersList.jsx"));
const RolesPermissions  = lazy(() => import("../features/admin-home/pages/RolesPermissions.jsx"));
const ApprovalRules     = lazy(() => import("../features/admin-home/pages/ApprovalRules.jsx"));
const Settings          = lazy(() => import("../features/admin-home/pages/Settings.jsx"));

const ReportBuilder      = lazy(() => import("../features/reports/pages/ReportBuilder.jsx"));
const NotificationsInbox = lazy(() => import("../features/notifications/pages/Inbox.jsx"));

const VQuotationRequests = lazy(() => import("../features/vendor-portal/pages/VendorQuotationRequests.jsx"));
const VQuotations        = lazy(() => import("../features/vendor-portal/pages/VendorQuotations.jsx"));
const VPOList            = lazy(() => import("../features/vendor-portal/pages/VendorPOList.jsx"));
const VInvoices          = lazy(() => import("../features/vendor-portal/pages/VendorInvoices.jsx"));
const VApplicationStatus = lazy(() => import("../features/vendor-portal/pages/VendorApplicationStatus.jsx"));

const ProfilePage = lazy(() => import("../features/auth/pages/Profile.jsx"));

// Role allowlists per layout
const USER_ROLES = [
  "admin",
  "manager",
  "employee",
  "hod",
  "cfo",
  "ceo",
  "director",
  "accountant",
  "purchase_officer",
  "customer",
];
const VENDOR_ROLES = ["admin", "vendor"];
const ADMIN_ROLES = ["admin"];

const LAYOUT_ROLES = new Map([
  [UserLayout, USER_ROLES],
  [VendorLayout, VENDOR_ROLES],
  [AdminLayout, ADMIN_ROLES],
]);

const wrap = (Layout, Page, props = {}) => {
  const allow = LAYOUT_ROLES.get(Layout);
  const node = (
    <Layout>
      <Page {...props} />
    </Layout>
  );
  return allow ? <RoleGate allow={allow}>{node}</RoleGate> : node;
};

function RouteFallback() {
  return (
    <div className="flex h-[60vh] items-center justify-center text-text-muted">
      <Loader2 className="size-6 animate-spin" />
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route path="/" element={<Landing />} />

      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token?" element={<ResetPassword />} />

      {/* Onboarding — vendor login + registration on separate routes */}
      <Route path="/vendor-login" element={<VendorRegistrationPage />} />
      <Route path="/vendor-register" element={<VendorRegistrationPage />} />
      {/* Legacy alias — old links kept working, lands on registration */}
      <Route
        path="/vendor-registration"
        element={<Navigate to="/vendor-register" replace />}
      />
      <Route
        path="/vendor-registration/:step"
        element={<Navigate to="/vendor-register" replace />}
      />

      {/* USER app */}
      <Route path="/app" element={wrap(UserLayout, UserHome)} />

      <Route path="/app/purchase-requests" element={wrap(UserLayout, PRList)} />
      <Route path="/app/purchase-requests/new" element={wrap(UserLayout, PRCreate)} />
      <Route path="/app/purchase-requests/:id" element={wrap(UserLayout, PRDetail)} />

      <Route path="/app/purchase-orders" element={wrap(UserLayout, POList)} />
      <Route path="/app/purchase-orders/new" element={wrap(UserLayout, POCreate)} />
      <Route path="/app/purchase-orders/:id" element={wrap(UserLayout, PODetail)} />

      <Route path="/app/quotations" element={wrap(UserLayout, QList)} />
      <Route path="/app/quotations/new" element={wrap(UserLayout, QCreate)} />
      <Route path="/app/quotations/:id" element={wrap(UserLayout, QCompare)} />

      <Route path="/app/grn" element={wrap(UserLayout, GRNList)} />
      <Route path="/app/grn/new" element={wrap(UserLayout, GRNCreate)} />
      <Route path="/app/grn/:id" element={wrap(UserLayout, GRNDetail)} />
      {/* /app/grn/stock-receive, /delivery-challan, /purchase-return — removed
         (alternate stub forms; the real flow is /app/grn/new) */}

      <Route path="/app/inventory" element={wrap(UserLayout, InventoryList)} />
      {/* /app/inventory/receive — removed; use /app/grn/new */}

      <Route path="/app/invoices" element={wrap(UserLayout, InvoicesList)} />
      <Route path="/app/invoices/:id/approve" element={wrap(UserLayout, InvoiceApproval)} />
      {/* /app/invoices/proforma — removed (stub form); raise via /vendor/invoices/upload */}

      <Route path="/app/payments" element={wrap(UserLayout, PaymentsList)} />
      <Route path="/app/payments/new" element={wrap(UserLayout, PaymentCreate)} />
      <Route path="/app/payments/:number" element={wrap(UserLayout, PaymentDetail)} />

      <Route path="/app/reports" element={wrap(UserLayout, ReportBuilder)} />
      <Route path="/app/notifications" element={wrap(UserLayout, NotificationsInbox)} />
      <Route path="/app/profile" element={wrap(UserLayout, ProfilePage)} />

      {/* VENDOR portal */}
      <Route path="/vendor" element={wrap(VendorLayout, VendorHome)} />
      <Route path="/vendor/quotation-requests" element={wrap(VendorLayout, VQuotationRequests)} />
      <Route path="/vendor/quotations" element={wrap(VendorLayout, VQuotations)} />
      <Route path="/vendor/quotations/submit/:id" element={wrap(VendorLayout, QSubmit)} />
      <Route path="/vendor/purchase-orders" element={wrap(VendorLayout, VPOList)} />
      <Route path="/vendor/purchase-orders/:id" element={wrap(VendorLayout, PODetail, { view: "vendor" })} />
      <Route path="/vendor/invoices" element={wrap(VendorLayout, VInvoices)} />
      <Route path="/vendor/invoices/upload" element={wrap(VendorLayout, VendorInvoiceUpload)} />
      <Route path="/vendor/profile" element={wrap(VendorLayout, ProfilePage)} />
      <Route path="/vendor/application-status" element={wrap(VendorLayout, VApplicationStatus)} />
      <Route path="/vendor/notifications" element={wrap(VendorLayout, NotificationsInbox)} />

      {/* ADMIN console */}
      <Route path="/admin" element={wrap(AdminLayout, AdminHome)} />
      <Route path="/admin/purchase-requests" element={wrap(AdminLayout, PRList)} />
      <Route path="/admin/purchase-requests/:id" element={wrap(AdminLayout, PRDetail)} />
      <Route path="/admin/purchase-orders" element={wrap(AdminLayout, POList)} />
      <Route path="/admin/purchase-orders/:id" element={wrap(AdminLayout, PODetail)} />
      <Route path="/admin/quotations" element={wrap(AdminLayout, QList)} />
      <Route path="/admin/quotations/:id" element={wrap(AdminLayout, QCompare)} />
      <Route path="/admin/grn" element={wrap(AdminLayout, GRNList)} />
      <Route path="/admin/grn/:id" element={wrap(AdminLayout, GRNDetail)} />
      <Route path="/admin/inventory" element={wrap(AdminLayout, InventoryList)} />
      <Route path="/admin/invoices" element={wrap(AdminLayout, InvoicesList)} />
      <Route path="/admin/invoices/:id/approve" element={wrap(AdminLayout, InvoiceApproval)} />
      <Route path="/admin/payments" element={wrap(AdminLayout, PaymentsList)} />
      <Route path="/admin/payments/new" element={wrap(AdminLayout, PaymentCreate)} />
      <Route path="/admin/payments/:number" element={wrap(AdminLayout, PaymentDetail)} />
      <Route path="/admin/items" element={wrap(AdminLayout, ItemsList)} />
      <Route path="/admin/vendors" element={wrap(AdminLayout, VendorsList)} />
      <Route path="/admin/categories" element={wrap(AdminLayout, Categories)} />
      <Route path="/admin/companies" element={wrap(AdminLayout, Companies)} />
      <Route path="/admin/projects" element={wrap(AdminLayout, Projects)} />
      <Route path="/admin/departments" element={wrap(AdminLayout, Departments)} />
      <Route path="/admin/reports" element={wrap(AdminLayout, ReportBuilder)} />
      <Route path="/admin/users" element={wrap(AdminLayout, UsersList)} />
      <Route path="/admin/roles" element={wrap(AdminLayout, RolesPermissions)} />
      <Route path="/admin/approvals" element={wrap(AdminLayout, ApprovalRules)} />
      <Route path="/admin/settings" element={wrap(AdminLayout, Settings)} />
      <Route path="/admin/notifications" element={wrap(AdminLayout, NotificationsInbox)} />

      {/* Utility */}
      <Route path="/403" element={<Forbidden />} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
    </Suspense>
  );
}
