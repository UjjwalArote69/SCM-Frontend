# SCM Frontend — Architecture & App Flow

Complete map of the codebase, routing, and user journeys. Read this alongside `CLAUDE.md` (which stays short and is auto-loaded every session).

---

## 1. Folder tree

```
scm-frontend/
├── designs/                            Google Stitch HTML exports
│   ├── completed/                        already converted to JSX
│   │   ├── login/                          Login, ForgotPassword, ResetPassword, + error/success states
│   │   └── vendor steps/                   Step1 … Step6 of vendor registration
│   └── remaining/                        pending conversion
│       ├── Dashboard.html                  (already consumed for UserHome)
│       └── Sidebar.html                    (already consumed for Sidebar.jsx)
│
├── public/                             static assets served as-is
├── src/
│   │
│   ├── main.jsx                        React entry point → renders <App/>
│   ├── index.css                       Tailwind v4 import + theme tokens (light + dark)
│   │
│   ├── api/
│   │   └── client.js                   shared axios instance (STUB — wire baseURL + interceptors)
│   │
│   ├── app/                            app-wide plumbing
│   │   ├── App.jsx                       <Providers><AppRoutes/></Providers>
│   │   ├── providers.jsx                 ThemeProvider + BrowserRouter
│   │   ├── routes.jsx                    full route tree
│   │   └── guards/                       (currently unused — removed for testing)
│   │       ├── ProtectedRoute.jsx          any-auth gate
│   │       ├── RoleGate.jsx                <RoleGate allow={["admin"]}/>
│   │       └── RedirectByRole.jsx          / → role-specific home
│   │
│   ├── layouts/                        shells (chrome only, no data fetching)
│   │   ├── AuthLayout.jsx                two-pane: red brand panel + white form
│   │   ├── PublicLayout.jsx              topbar only (landing, T&C, public invoice)
│   │   ├── UserLayout.jsx                Sidebar("user") + Topbar
│   │   ├── VendorLayout.jsx              Sidebar("vendor") + Topbar
│   │   └── AdminLayout.jsx               Sidebar("admin") + Topbar
│   │
│   ├── components/                     presentational, domain-agnostic
│   │   ├── nav/
│   │   │   ├── Sidebar.jsx                 driven by navConfig, picks tree via `audience` prop
│   │   │   ├── Topbar.jsx                  tabs + search + theme + bell + help + avatar
│   │   │   └── navConfig.js                user / vendor / admin nav trees
│   │   ├── auth/
│   │   │   ├── Button.jsx                  red-gradient primary button
│   │   │   └── Field.jsx                   labeled input with icon + error
│   │   ├── data/
│   │   │   ├── DataTable.jsx               generic data grid (STUB)
│   │   │   └── DataTableSection.jsx        titled section wrapping a DataTable
│   │   ├── feedback/
│   │   │   ├── Loader.jsx                  (STUB)
│   │   │   ├── Skeleton.jsx                loading skeleton
│   │   │   ├── ConfirmModal.jsx            confirmation dialog
│   │   │   └── ErrorBoundary.jsx           React error boundary
│   │   ├── forms/
│   │   │   └── FormKit.jsx                 generic field-by-schema renderer
│   │   ├── misc/
│   │   │   ├── AnimatedPage.jsx            page fade wrapper
│   │   │   ├── StaggeredGrid.jsx           staggered animation grid
│   │   │   ├── DocumentPreview.jsx         inline file/doc preview
│   │   │   ├── CompanyPicker.jsx           company selector
│   │   │   └── TermsTemplatePicker.jsx     T&C template dropdown
│   │   └── ui/
│   │       └── ThemeToggle.jsx             Moon/Sun circular button
│   │
│   ├── features/                       domain-first code — one folder per feature
│   │   │
│   │   ├── auth/
│   │   │   ├── pages/
│   │   │   │   ├── Login.jsx
│   │   │   │   ├── ForgotPassword.jsx
│   │   │   │   └── ResetPassword.jsx
│   │   │   ├── api.js                      (STUB) login/forgot/reset endpoints
│   │   │   └── store.js                    useAuthStore (Zustand + persist)
│   │   │
│   │   ├── onboarding/                   vendor registration 6-step wizard
│   │   │   ├── components/
│   │   │   │   ├── VendorRegShell.jsx      full-screen shell w/ stepper + footer nav
│   │   │   │   └── Stepper.jsx             horizontal 6-step indicator
│   │   │   ├── pages/
│   │   │   │   └── VendorRegistrationPage.jsx   orchestrator keyed by :step
│   │   │   └── steps/
│   │   │       ├── Step1VendorInfo.jsx     company name, category, GST, PAN, address, certs
│   │   │       ├── Step2References.jsx     up to 5 business references
│   │   │       ├── Step3Bank.jsx           bank details + cancelled cheque
│   │   │       ├── Step4Statutory.jsx      4 statutory document uploads
│   │   │       ├── Step5Business.jsx       turnover, employees, products
│   │   │       └── Step6Status.jsx         success confirmation + summary
│   │   │
│   │   ├── user-home/
│   │   │   ├── pages/UserHome.jsx          KPIs + activity + quick actions + charts
│   │   │   └── api.js                      (STUB) dashboard data
│   │   ├── vendor-home/
│   │   │   └── pages/VendorHome.jsx        (scaffold)
│   │   ├── admin-home/
│   │   │   └── pages/AdminHome.jsx         (scaffold)
│   │   │
│   │   ├── purchase-requests/
│   │   │   ├── pages/                      (empty — to build)
│   │   │   ├── components/
│   │   │   │   └── PurchaseRequestForm.jsx
│   │   │   └── api.js                      (STUB)
│   │   ├── purchase-orders/
│   │   │   ├── components/
│   │   │   │   ├── PurchaseOrderForm.jsx
│   │   │   │   └── VendorPOAcceptForm.jsx
│   │   │   └── api.js                      (STUB)
│   │   ├── quotations/
│   │   │   ├── components/QuotationForm.jsx
│   │   │   └── api.js                      (STUB)
│   │   ├── grn/
│   │   │   ├── components/
│   │   │   │   ├── GRNForm.jsx
│   │   │   │   ├── IRNForm.jsx
│   │   │   │   ├── StockReceiveForm.jsx
│   │   │   │   └── DeliveryChallanForm.jsx
│   │   │   └── api.js                      (STUB)
│   │   ├── finance/
│   │   │   └── components/
│   │   │       ├── InvoiceForm.jsx
│   │   │       ├── PaymentForm.jsx
│   │   │       ├── ProformaInvoiceForm.jsx
│   │   │       └── PurchaseReturnForm.jsx
│   │   ├── masters/
│   │   │   ├── components/
│   │   │   │   ├── ItemForm.jsx
│   │   │   │   ├── VendorForm.jsx
│   │   │   │   ├── CompanyForm.jsx
│   │   │   │   └── ProjectForm.jsx
│   │   │   ├── api.js                      (STUB)
│   │   │   └── store.js                    useMasterStore (STUB)
│   │   ├── reports/                      empty
│   │   └── vendor-portal/
│   │       └── pages/
│   │           ├── VendorPOViewPage.jsx            (STUB)
│   │           ├── VendorQuotationSubmitPage.jsx   (STUB)
│   │           ├── VendorApplicationStatusPage.jsx (STUB)
│   │           └── VendorProfilePage.jsx           (STUB)
│   │
│   ├── pages/                          route-destinations not tied to a feature
│   │   ├── Landing.jsx                     (STUB) marketing home
│   │   ├── NotFound.jsx                    (STUB) 404
│   │   ├── PublicInvoice.jsx               (STUB) shareable invoice view
│   │   └── TermsCondition.jsx              (STUB)
│   │
│   ├── hooks/
│   │   ├── useTheme.jsx                    ThemeProvider + useTheme() — handles light/dark
│   │   ├── useCan.js                       useCan("pr.approve") → boolean
│   │   ├── useNotifications.jsx            (STUB) toast hook
│   │   └── usePageTitle.js                 (STUB) document title setter
│   │
│   ├── context/
│   │   └── FormContext.js                  (STUB) multi-step form state
│   │
│   ├── data/
│   │   ├── constants.js                    (STUB) status enums, doc types
│   │   ├── roles.js                        ROLES, ROLE_IDS, ROLE_LABELS, ROLE_HOME
│   │   └── permissions.js                  role → Set(actions), hasPermission()
│   │
│   ├── utils/
│   │   ├── sessionToken.js                 (STUB) token read/write
│   │   └── rbac.js                         isUserRole / isVendor / isAdmin / can
│   │
│   ├── assets/                         local SVGs/images
│   │   └── react.svg
│   │
│   └── test/
│       ├── components.test.jsx             (STUB)
│       ├── mocks.jsx                       (STUB)
│       └── setup.js                        (STUB)
│
├── CLAUDE.md                           short rules + route list + structure (auto-loaded)
├── ARCHITECTURE.md                     this file
├── package.json
├── vite.config.js
├── eslint.config.js
├── postcss.config.js                   empty shadow (blocks Laravel root config)
└── index.html
```

**STUB** means the file exists but is 0 bytes or placeholder — safe to fill in without worrying about breaking imports.

---

## 2. Route map

```
/                                → redirects to /login

──── PUBLIC / AUTH ────────────────────────────────────────────────
/login                           Login page
/forgot-password                 Request reset link
/reset-password/:token?          Set new password (token optional during testing)

──── ONBOARDING (pre-auth, vendor signup) ─────────────────────────
/vendor-registration             → /vendor-registration/1
/vendor-registration/1           Step 1 — Vendor Info
/vendor-registration/2           Step 2 — References
/vendor-registration/3           Step 3 — Bank Details
/vendor-registration/4           Step 4 — Statutory Documents
/vendor-registration/5           Step 5 — Business Profile
/vendor-registration/6           Step 6 — Application Submitted

──── USER PORTAL (employee / manager / hod) ───────────────────────
/app                             UserHome (dashboard)
/app/purchase-requests           TBD
/app/quotations                  TBD
/app/purchase-orders             TBD
/app/grn                         TBD
/app/inventory                   TBD
/app/invoices                    TBD
/app/payments                    TBD
/app/reports                     TBD

──── VENDOR PORTAL ────────────────────────────────────────────────
/vendor                          VendorHome
/vendor/quotation-requests       TBD
/vendor/quotations               TBD (vendor's submitted quotes)
/vendor/purchase-orders          TBD
/vendor/invoices                 TBD
/vendor/application-status       TBD

──── ADMIN CONSOLE ────────────────────────────────────────────────
/admin                           AdminHome
/admin/purchase-requests         TBD
/admin/purchase-orders           TBD
/admin/quotations                TBD
/admin/grn                       TBD
/admin/inventory                 TBD
/admin/invoices                  TBD
/admin/payments                  TBD
/admin/items                     TBD     ┐
/admin/vendors                   TBD     │
/admin/categories                TBD     │ Masters
/admin/companies                 TBD     │
/admin/projects                  TBD     │
/admin/departments               TBD     ┘
/admin/reports                   TBD
/admin/users                     TBD     ┐
/admin/roles                     TBD     │
/admin/approvals                 TBD     │ System
/admin/settings                  TBD     ┘

*any-other-path*                 → redirects to /login
```

**Role guards are currently off** (`routes.jsx` renders layouts directly, no `<RoleGate>`). When the backend login endpoint lands, wrap each `/app /vendor /admin` block in `<RoleGate allow={[...]}>`.

---

## 3. User journeys

### 3.1 Vendor onboarding (no login needed)

```
  Landing / Login page
         │
         ▼  clicks "Register as Vendor"
  /vendor-registration/1  — Vendor Info
         │  Save & Continue
         ▼
  /vendor-registration/2  — References
         │  Save & Continue
         ▼
  /vendor-registration/3  — Bank Details
         │  Save & Continue
         ▼
  /vendor-registration/4  — Statutory Documents
         │  Save & Continue
         ▼
  /vendor-registration/5  — Business Profile
         │  Submit
         ▼
  /vendor-registration/6  — Application Submitted (success card)
         │  Go to login
         ▼
  /login
```

Orchestrator: `features/onboarding/pages/VendorRegistrationPage.jsx`.
Shell: `features/onboarding/components/VendorRegShell.jsx`.
Each step is its own component that renders inside the shell's content slot.

### 3.2 Regular user (employee / manager / hod)

```
  /login
      │  submit credentials  (TODO: hit features/auth/api.js → store user)
      ▼
  /app   (UserHome — KPIs, activity, approvals)
      │
      ├── /app/purchase-requests     create / approve PRs
      ├── /app/quotations            compare vendor quotes
      ├── /app/purchase-orders       track orders
      ├── /app/grn                   log received goods
      ├── /app/inventory             stock view
      ├── /app/invoices              bills from vendors
      ├── /app/payments              payments sent
      └── /app/reports               analytics
```

All live under `UserLayout` (Sidebar + Topbar).
Sidebar items come from `NAV_CONFIG.user` in `components/nav/navConfig.js`.

### 3.3 Vendor (after approval)

```
  /login
      │  vendor credentials
      ▼
  /vendor  (VendorHome)
      │
      ├── /vendor/quotation-requests   incoming RFQs → respond
      ├── /vendor/quotations           my submitted quotes
      ├── /vendor/purchase-orders      POs from the company (accept/reject)
      ├── /vendor/invoices             upload invoice against a PO
      └── /vendor/application-status   onboarding / verification state
```

### 3.4 Admin

```
  /login
      │  admin credentials
      ▼
  /admin  (AdminHome)
      │
      ├── Procurement (4 pages)   org-wide PR/PO/Quotation/GRN visibility
      ├── Goods (1 page)          Inventory
      ├── Finance (2 pages)       Invoices, Payments
      ├── Masters (6 pages)       Items/Vendors/Categories/Companies/Projects/Departments
      ├── Insights (1 page)       Reports
      └── System (4 pages)        Users, Roles, Approval Rules, Settings
```

---

## 4. Business flow (SCM happy path)

This is what the software exists to coordinate.

```
  EMPLOYEE                MANAGER/HOD           ADMIN                  VENDOR
  ────────                ───────────           ─────                  ──────
  1. Creates              2. Approves PR
     Purchase Request
     (PR) for X items           │
                                ▼
                          3. Admin generates
                             RFQ from PR, picks
                             candidate vendors
                                                                       4. Vendors see
                                                                          Quotation
                                                                          Request
                                                                                │
                                                                                ▼
                                                                       5. Submits
                                                                          quote with
                                                                          prices +
                                                                          delivery
                          6. Reviews quotes,
                             picks winner
                                                ┘
                                                │
                                                ▼
                          7. Converts winning quote
                             into Purchase Order (PO)
                                                                       8. Receives PO,
                                                                          accepts or
                                                                          negotiates
                                                                                │
                                                                                ▼
                                                                       9. Delivers
                                                                          goods
  10. Receives goods,
      logs them as
      GRN (Goods
      Receipt Note)
                                                                       11. Uploads
                                                                           invoice
                                                                           against PO
                                                                                │
                                                ▼
                                         12. Admin approves
                                             invoice,
                                             schedules payment
                                                                       13. Vendor sees
                                                                           payment
                                                                           settled
```

Each numbered step maps to a route/page in the portals above.

---

## 5. Data flow per feature

The pattern is the same everywhere — use this template when adding any feature.

```
                  ┌──────────────────────┐
                  │  features/<domain>/  │
                  │        api.js        │
                  │  (axios calls that   │
                  │   hit Laravel JSON)  │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │  features/<domain>/  │
                  │       store.js       │ (Zustand — only if cross-page state)
                  └──────────┬───────────┘
                             │
                             ▼
   ┌──────────────────────┐     ┌──────────────────────┐
   │  features/<domain>/  │     │  features/<domain>/  │
   │        pages/        │ ◄── │     components/      │
   │    (route targets)   │     │  (forms, rows, etc.) │
   └──────────┬───────────┘     └──────────────────────┘
              │
              ▼
   ┌──────────────────────┐
   │       layouts/       │   (UserLayout / VendorLayout / AdminLayout)
   └──────────────────────┘
              ▲
              │ renders inside
              ▼
   ┌──────────────────────┐
   │       app/           │   routes.jsx picks layout per route prefix
   └──────────────────────┘
```

Example for building out `/app/purchase-requests`:

1. `features/purchase-requests/api.js` → `listPRs()`, `createPR(payload)`, etc.
2. `features/purchase-requests/store.js` → Zustand cache of current PR list (optional)
3. `features/purchase-requests/components/PRList.jsx` → table row rendering
4. `features/purchase-requests/pages/List.jsx` → top-level page that fetches + renders
5. `features/purchase-requests/pages/Create.jsx` → page that wraps `PurchaseRequestForm`
6. Register routes in `app/routes.jsx` under `/app/purchase-requests`

---

## 6. Theming

- Raw CSS vars in `src/index.css`:
  - `:root { ... }` — light palette
  - `[data-theme="dark"] { ... }` — dark palette
- `@theme inline { ... }` in the same file maps those vars into Tailwind utility names.
- Semantic classes only: `bg-primary`, `bg-surface`, `text-text-muted`, `border-border`, `bg-success-soft`, etc. Never raw hex.
- `useTheme()` (from `hooks/useTheme.jsx`) exposes `{ theme, setTheme, toggleTheme }`; the provider is wired in `app/providers.jsx`.
- `<ThemeToggle />` (from `components/ui/ThemeToggle.jsx`) renders a Moon/Sun button; included in `AuthLayout`, `Topbar`, and `VendorRegShell`.

---

## 7. Role & permissions wiring

```
data/roles.js          source of truth: ROLES, ROLE_IDS, ROLE_LABELS, ROLE_HOME
data/permissions.js    role → Set of action strings ("pr.create", "po.approve", …)
                       + hasPermission(role, action)
utils/rbac.js          thin wrappers: isUserRole / isVendor / isAdmin / can
hooks/useCan.js        useCan("pr.approve") — pulls role from useAuthStore,
                       returns boolean. Use inside components for inline checks.
app/guards/            route-level gates (RoleGate, ProtectedRoute, RedirectByRole)
                       — currently NOT wired in routes.jsx (testing mode)
features/auth/store.js useAuthStore — Zustand store with { user, token, login, logout }
                       persists to localStorage as `scm-auth`
```

When the backend is ready:
1. Fill in `features/auth/store.js login()` to hit the real endpoint.
2. Populate `user.role` with one of `"employee" | "manager" | "hod" | "vendor" | "admin"`.
3. Re-wrap `/app`, `/vendor`, `/admin` routes in `<RoleGate allow={[…]}>` in `app/routes.jsx`.
4. Swap the `/` route element from `<Navigate to="/login" />` back to `<RedirectByRole />`.

---

## 8. Implementation status snapshot

| Area | Done | Stub | Notes |
|---|---|---|---|
| **Theming** | ✓ | | Light + dark tokens, toggle button live |
| **Auth pages** | ✓ (UI) | submit handlers | Login/Forgot/Reset all render, no API yet |
| **Vendor onboarding** | ✓ (all 6 steps) | | Local state only, no API wiring |
| **User home** | ✓ | | Mock data inline |
| **Vendor home** | placeholder | | |
| **Admin home** | placeholder | | |
| **Sidebar/Topbar** | ✓ | | Role-aware |
| **Role guards** | code present | disabled | Re-enable in routes.jsx when auth lands |
| **API client** | ✗ | yes | No axios baseURL, no interceptors |
| **Forms** | code present | not route-linked | PR/PO/Quotation/GRN/etc forms exist but no pages to wrap them |
| **Features pages** (List/View/Create per domain) | ✗ | | Main build-out target |
| **Tests** | ✗ | yes | Vitest files are empty |

---

## 9. Dependencies to install before building

```
npm install zustand
```

Required by `features/auth/store.js` and any future store. Not yet in package.json.

---

## 10. Quick reference — which file handles what

| I want to … | Edit … |
|---|---|
| Add a new route | `src/app/routes.jsx` |
| Change the sidebar nav | `src/components/nav/navConfig.js` |
| Change theme colors | `src/index.css` |
| Change login form | `src/features/auth/pages/Login.jsx` |
| Add a vendor portal page | create under `src/features/vendor-portal/pages/`, register in `routes.jsx` |
| Add permission-based UI | `src/data/permissions.js` + `useCan()` in the component |
| Change layout (sidebar + header) | `src/layouts/UserLayout.jsx` (or Vendor / Admin) |
| Wire the auth API | `src/features/auth/api.js` + `src/features/auth/store.js` |
| Add a shared UI primitive | `src/components/ui/` (themed) or `components/feedback/` / `forms/` |
