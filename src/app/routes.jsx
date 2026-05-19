import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

import UserLayout from "../layouts/UserLayout.jsx";
import VendorLayout from "../layouts/VendorLayout.jsx";
import AdminLayout from "../layouts/AdminLayout.jsx";
import { useAuthStore } from "../features/auth/store.js";

// Eager — entry points + small shells. Lazy-loading the login page would
// add a flash on the most common entry point, so it stays in the main bundle.
import Login from "../features/auth/pages/Login.jsx";
import Landing from "../pages/Landing.jsx";
import Forbidden from "../pages/Forbidden.jsx";
import RoleGate from "./guards/RoleGate.jsx";
import PermissionGate from "./guards/PermissionGate.jsx";

// Lazy — every page-level component, split into route-bound chunks. The
// initial bundle drops from ~1MB → ~200-300 KB; each route fetches its
// own chunk on first nav. Vite produces hashed chunk filenames automatically.
const ForgotPassword          = lazy(() => import("../features/auth/pages/ForgotPassword.jsx"));
const ResetPassword           = lazy(() => import("../features/auth/pages/ResetPassword.jsx"));
const VendorRegistrationPage  = lazy(() => import("../features/onboarding/pages/VendorRegistrationPage.jsx"));

const UserHome     = lazy(() => import("../features/user-home/pages/UserHome.jsx"));
const CFOHome      = lazy(() => import("../features/user-home/pages/CFOHome.jsx"));
const VendorHome   = lazy(() => import("../features/vendor-home/pages/VendorHome.jsx"));
const AdminHome    = lazy(() => import("../features/admin-home/pages/AdminHome.jsx"));

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
const GRNApprovals = lazy(() => import("../features/grn/pages/Approvals.jsx"));

const InvoicesList         = lazy(() => import("../features/finance/pages/InvoicesList.jsx"));
const InvoiceApproval      = lazy(() => import("../features/finance/pages/InvoiceApproval.jsx"));
const PaymentsList         = lazy(() => import("../features/payments/pages/List.jsx"));
const PaymentCreate        = lazy(() => import("../features/payments/pages/Create.jsx"));
const PaymentDetail        = lazy(() => import("../features/payments/pages/Detail.jsx"));
const PaymentsOutstanding  = lazy(() => import("../features/payments/pages/Outstanding.jsx"));
const PaymentFTM           = lazy(() => import("../features/payments/pages/PaymentFTM.jsx"));
const PaymentCumulative    = lazy(() => import("../features/payments/pages/PaymentCumulative.jsx"));
const PaymentAwaiting      = lazy(() => import("../features/payments/pages/AwaitingApproval.jsx"));
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
const VGRNList           = lazy(() => import("../features/vendor-portal/pages/VendorGRNList.jsx"));
const VApplicationStatus = lazy(() => import("../features/vendor-portal/pages/VendorApplicationStatus.jsx"));

const ProfilePage = lazy(() => import("../features/auth/pages/Profile.jsx"));

// Role allowlists per layout — coarse gate on which audience can load this
// layout at all. Fine-grained "can this user see this section" is handled by
// PermissionGate against the admin-editable permissions matrix.
const USER_ROLES = [
  "admin", "manager", "employee", "hod", "cfo", "ceo", "director",
  "accountant", "purchase_officer", "site_person", "project_manager", "customer",
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

// Layer a permission gate on top of the layout-level role gate. Use this for
// every /app route whose visibility is admin-configurable at /admin/roles.
const wrapPerm = (Layout, Page, permission, props) => {
  const inner = wrap(Layout, Page, props);
  return <PermissionGate require={permission}>{inner}</PermissionGate>;
};

function RouteFallback() {
  return (
    <div className="flex h-[60vh] items-center justify-center text-text-muted">
      <Loader2 className="size-6 animate-spin" />
    </div>
  );
}

// /app dispatcher: route-specific landings.
//   cfo               → finance-centric dashboard
//   single-PR-only    → straight to the PR list (no dashboard to duplicate it).
//                        Used today by employees with the default grant; if an
//                        admin widens an employee's grant via /admin/roles,
//                        they get the full composite dashboard automatically.
//   others            → full UserHome composite dashboard
function AppHome() {
  const user  = useAuthStore((s) => s.user);
  const role  = user?.role;
  const perms = user?.permissions ?? [];
  const onlyPr =
    perms.includes("pr.view")
    && !perms.includes("po.view")
    && !perms.includes("quote.view")
    && !perms.includes("grn.view")
    && !perms.includes("payment.view")
    && !perms.includes("invoice.view")
    && !perms.includes("reports.view")
    && !perms.includes("*");
  const onlyGrn =
    perms.includes("grn.view")
    && !perms.includes("pr.view")
    && !perms.includes("po.view")
    && !perms.includes("quote.view")
    && !perms.includes("payment.view")
    && !perms.includes("invoice.view")
    && !perms.includes("reports.view")
    && !perms.includes("*");
  if (role === "cfo")        return <CFOHome />;
  if (onlyPr)                return <Navigate to="/app/purchase-requests" replace />;
  if (onlyGrn || role === "site_person") return <Navigate to="/app/grn" replace />;
  return <UserHome />;
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
      <Route path="/app" element={wrap(UserLayout, AppHome)} />

      <Route path="/app/purchase-requests" element={wrapPerm(UserLayout, PRList, "pr.view")} />
      <Route path="/app/purchase-requests/new" element={wrapPerm(UserLayout, PRCreate, "pr.create")} />
      <Route path="/app/purchase-requests/:id" element={wrapPerm(UserLayout, PRDetail, "pr.view")} />

      <Route path="/app/purchase-orders" element={wrapPerm(UserLayout, POList, "po.view")} />
      <Route path="/app/purchase-orders/new" element={wrapPerm(UserLayout, POCreate, "po.create")} />
      <Route path="/app/purchase-orders/:id" element={wrapPerm(UserLayout, PODetail, "po.view")} />

      <Route path="/app/quotations" element={wrapPerm(UserLayout, QList, "quote.view")} />
      <Route path="/app/quotations/new" element={wrapPerm(UserLayout, QCreate, "quote.create")} />
      <Route path="/app/quotations/:id" element={wrapPerm(UserLayout, QCompare, "quote.view")} />

      <Route path="/app/grn" element={wrapPerm(UserLayout, GRNList, "grn.view")} />
      <Route path="/app/grn/approvals" element={wrapPerm(UserLayout, GRNApprovals, "grn.view")} />
      <Route path="/app/grn/new" element={wrapPerm(UserLayout, GRNCreate, "grn.create")} />
      <Route path="/app/grn/:id" element={wrapPerm(UserLayout, GRNDetail, "grn.view")} />

      <Route path="/app/inventory" element={wrapPerm(UserLayout, InventoryList, "inventory.view")} />

      <Route path="/app/invoices" element={wrapPerm(UserLayout, InvoicesList, "invoice.view")} />
      <Route path="/app/invoices/:id/approve" element={wrapPerm(UserLayout, InvoiceApproval, "invoice.approve")} />

      <Route path="/app/payments" element={wrapPerm(UserLayout, PaymentsList, "payment.view")} />
      <Route path="/app/payments/awaiting" element={wrapPerm(UserLayout, PaymentAwaiting, "payment.view")} />
      <Route path="/app/payments/outstanding" element={wrapPerm(UserLayout, PaymentsOutstanding, "payment.view")} />
      <Route path="/app/payments/ftm" element={wrapPerm(UserLayout, PaymentFTM, "payment.view")} />
      <Route path="/app/payments/cumulative" element={wrapPerm(UserLayout, PaymentCumulative, "payment.view")} />
      <Route path="/app/payments/new" element={wrapPerm(UserLayout, PaymentCreate, "payment.create")} />
      <Route path="/app/payments/:number" element={wrapPerm(UserLayout, PaymentDetail, "payment.view")} />

      <Route path="/app/reports" element={wrapPerm(UserLayout, ReportBuilder, "reports.view")} />
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
      <Route path="/vendor/grn" element={wrap(VendorLayout, VGRNList)} />
      <Route path="/vendor/grn/:id" element={wrap(VendorLayout, GRNDetail)} />
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
