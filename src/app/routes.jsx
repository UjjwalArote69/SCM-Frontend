import { Routes, Route, Navigate } from "react-router-dom";

import UserLayout from "../layouts/UserLayout.jsx";
import VendorLayout from "../layouts/VendorLayout.jsx";
import AdminLayout from "../layouts/AdminLayout.jsx";

// Auth
import Login from "../features/auth/pages/Login.jsx";
import ForgotPassword from "../features/auth/pages/ForgotPassword.jsx";
import ResetPassword from "../features/auth/pages/ResetPassword.jsx";

// Onboarding
import VendorRegistrationPage from "../features/onboarding/pages/VendorRegistrationPage.jsx";

// Homes
import UserHome from "../features/user-home/pages/UserHome.jsx";
import VendorHome from "../features/vendor-home/pages/VendorHome.jsx";
import AdminHome from "../features/admin-home/pages/AdminHome.jsx";

// Purchase Requests
import PRList from "../features/purchase-requests/pages/List.jsx";
import PRCreate from "../features/purchase-requests/pages/Create.jsx";
import PRDetail from "../features/purchase-requests/pages/Detail.jsx";

// Purchase Orders
import POList from "../features/purchase-orders/pages/List.jsx";
import POCreate from "../features/purchase-orders/pages/Create.jsx";
import PODetail from "../features/purchase-orders/pages/Detail.jsx";

// Quotations
import QList from "../features/quotations/pages/List.jsx";
import QCreate from "../features/quotations/pages/CreateRFQ.jsx";
import QCompare from "../features/quotations/pages/Comparison.jsx";
import QSubmit from "../features/quotations/pages/SubmitQuote.jsx";

// GRN
import GRNList from "../features/grn/pages/List.jsx";
import GRNCreate from "../features/grn/pages/Create.jsx";
import GRNDetail from "../features/grn/pages/Detail.jsx";
import StockReceive from "../features/grn/pages/StockReceive.jsx";

// Finance
import InvoicesList from "../features/finance/pages/InvoicesList.jsx";
import InvoiceApproval from "../features/finance/pages/InvoiceApproval.jsx";
import PaymentsList from "../features/payments/pages/List.jsx";
import PaymentCreate from "../features/payments/pages/Create.jsx";
import PaymentDetail from "../features/payments/pages/Detail.jsx";
import VendorInvoiceUpload from "../features/finance/pages/VendorInvoiceUpload.jsx";
import ProformaInvoice from "../features/finance/pages/ProformaInvoice.jsx";
import DeliveryChallan from "../features/finance/pages/DeliveryChallan.jsx";
import PurchaseReturn from "../features/finance/pages/PurchaseReturn.jsx";

// Masters
import InventoryList from "../features/masters/pages/Inventory.jsx";
import ItemsList from "../features/masters/pages/ItemsList.jsx";
import VendorsList from "../features/masters/pages/VendorsList.jsx";
import Categories from "../features/masters/pages/Categories.jsx";
import Companies from "../features/masters/pages/Companies.jsx";
import Projects from "../features/masters/pages/Projects.jsx";
import Departments from "../features/masters/pages/Departments.jsx";

// Admin
import UsersList from "../features/admin-home/pages/UsersList.jsx";
import RolesPermissions from "../features/admin-home/pages/RolesPermissions.jsx";
import ApprovalRules from "../features/admin-home/pages/ApprovalRules.jsx";
import Settings from "../features/admin-home/pages/Settings.jsx";

// Reports
import ReportBuilder from "../features/reports/pages/ReportBuilder.jsx";

// Notifications
import NotificationsInbox from "../features/notifications/pages/Inbox.jsx";

// Vendor portal
import VQuotationRequests from "../features/vendor-portal/pages/VendorQuotationRequests.jsx";
import VQuotations from "../features/vendor-portal/pages/VendorQuotations.jsx";
import VPOList from "../features/vendor-portal/pages/VendorPOList.jsx";
import VInvoices from "../features/vendor-portal/pages/VendorInvoices.jsx";
import VApplicationStatus from "../features/vendor-portal/pages/VendorApplicationStatus.jsx";

// Shared profile page (user + vendor)
import ProfilePage from "../features/auth/pages/Profile.jsx";

// Misc
import Forbidden from "../pages/Forbidden.jsx";
import RoleGate from "./guards/RoleGate.jsx";

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

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

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
      <Route path="/app/grn/stock-receive" element={wrap(UserLayout, StockReceive)} />
      <Route path="/app/grn/delivery-challan" element={wrap(UserLayout, DeliveryChallan)} />
      <Route path="/app/grn/purchase-return" element={wrap(UserLayout, PurchaseReturn)} />

      <Route path="/app/inventory" element={wrap(UserLayout, InventoryList)} />
      <Route path="/app/inventory/receive" element={wrap(UserLayout, StockReceive)} />

      <Route path="/app/invoices" element={wrap(UserLayout, InvoicesList)} />
      <Route path="/app/invoices/:id/approve" element={wrap(UserLayout, InvoiceApproval)} />
      <Route path="/app/invoices/proforma" element={wrap(UserLayout, ProformaInvoice)} />

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
  );
}
