# SCM Frontend — Project Reference

React frontend for a Laravel-backed Supply Chain Management tool (Meka Group, India). Auto-loaded every session — keep it tight, treat it as the **single source of truth for stack, conventions, routes, and RBAC**. Session diaries live in [`PROGRESS.md`](./PROGRESS.md); flow diagrams live in [`FLOW.md`](./FLOW.md); deeper architecture lives in [`ARCHITECTURE.md`](./ARCHITECTURE.md).

> ✅ **Reality check on FLOW.md** — as of **2026-04-30**, items 1–8 + 10 + 11 are fully implemented (RFQ purchase-only writes, PO purchase-only writes, three-party RFQ consensus, CFO/CEO award chain, Purchase-HOD assignment of RFQ/PO authoring, vendor rate-lock during consensus, PO 5-stage internal approval chain, vendor payments, cost-tiered payment approval). Items still open: **9** (PO PDF) and **12 / 13** (vendor portal upload of E-Way Bill / invoice / delivery note). See [`PROGRESS.md` → "Current implementation snapshot"](./PROGRESS.md#current-implementation-snapshot--2026-04-30) for the live status table.

---

## 🚀 Quick start (run these directly — don't re-discover)

CWD assumed: `scm-frontend/`. Use `run_in_background: true` for the long-running ones.

**Backend (Laravel API on `127.0.0.1:8000`)** — run in background:
```bash
cd "C:/Users/ujjwa/OneDrive/Desktop/Ujjwal/Work/SCM/backupmeka" && C:/xampp/php/php.exe artisan serve --host=127.0.0.1 --port=8000
```
Verify: `curl -s -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:8000/api/me` → `401` means up (no token = expected).

**Frontend (Vite on `:5173`)** — run in background:
```bash
npm run dev
```

**MySQL** — XAMPP MySQL on port **3307**, DB `meka_scm`. Check it's up:
```bash
C:/xampp/mysql/bin/mysqladmin -u root -P 3307 --connect-timeout=2 ping
```
If not, start it:
```bash
C:/xampp/mysql/bin/mysqld.exe --defaults-file=C:/xampp/mysql/bin/my.ini --standalone
```

**Smoke tests:**
```bash
node test/api-smoke.mjs       # 44/44 — full RBAC + terminal-state + auto-fulfill
node test/vendor-smoke.mjs    # 34/34 — vendor scoping + rename-cascade
```

> Don't use `localhost` — Windows IPv6 timeout. Always `127.0.0.1`. See [Common gotchas](#common-gotchas).

---

## Table of contents

1. [What this is](#what-this-is)
2. [Stack](#stack)
3. [Local setup & commands](#local-setup--commands)
4. [Demo accounts](#demo-accounts)
5. [Three audiences](#three-audiences)
6. [Roles, permissions, and RBAC constants](#roles-permissions-and-rbac-constants)
7. [Backend API](#backend-api)
8. [Folder structure](#folder-structure)
9. [Live route map](#live-route-map)
10. [Theme tokens](#theme-tokens)
11. [Conventions](#conventions)
12. [Common gotchas](#common-gotchas)
13. [Designs](#designs)

---

## What this is

A web app that drives the **procure-to-receive** pipeline for an industrial group:

```
PR  →  RFQ  →  PO  →  GRN
(request)  (compare quotes)  (purchase order)  (goods receipt)
```

Three audiences share one frontend:

- **In-org users** (employee, manager, HOD, CFO, CEO, purchase_officer, accountant, director, customer) at `/app`
- **Vendors** at `/vendor` — submit quotes, accept POs, see only their own data
- **Admins** at `/admin` — full CRUD + masters

Backend is Laravel; tokens are sha256-hashed bearer tokens stored on `users.api_token`. RBAC is enforced **defense-in-depth** at four layers: route guards → axios interceptor → middleware → controller.

---

## Stack

| Layer | Tech | Notes |
|---|---|---|
| Build | Vite 8 + `@vitejs/plugin-react` 6 | |
| Runtime | React 19, react-router-dom 7 | |
| Styling | Tailwind v4 via `@tailwindcss/vite` | NOT PostCSS. Local `postcss.config.js` is an empty shadow to block the Laravel root's config from leaking in. |
| HTTP | axios | Shared client at `src/api/client.js`. Reads `VITE_API_URL`, defaults to `http://127.0.0.1:8000/api` (NOT `localhost` — see [Common gotchas](#common-gotchas)). Auto-attaches bearer from `localStorage["scm-auth"]`. |
| State | Zustand + `persist` middleware | One store per feature. Auth + notifications persist. |
| Icons | lucide-react | Designs reference Material Symbols — convert during port. |
| Font | Inter via Google Fonts | `index.html` |
| Node | v25, npm 11 | |
| Backend | Laravel 11 + MySQL 8 | XAMPP MySQL on port **3307**, DB `meka_scm`. |

---

## Local setup & commands

### Frontend

```bash
npm run dev        # Vite dev server at http://localhost:5173
npm run build      # production build
npm run lint       # ESLint
```

### Running the full stack

```bash
# Terminal 1 — Laravel API (must use 127.0.0.1, see gotchas)
cd ..
C:/xampp/php/php.exe artisan serve --host=127.0.0.1 --port=8000

# Terminal 2 — React
cd scm-frontend
npm run dev
```

### Smoke tests

```bash
node test/api-smoke.mjs       # 44/44 — full RBAC + terminal-state + auto-fulfill
node test/vendor-smoke.mjs    # 34/34 — vendor scoping + rename-cascade
```

Both pace login attempts to dodge the `throttle:5,1` rate limit (sleep 65s between batches).

### One-time backend setup

- XAMPP MySQL running on port **3307**
- Database `meka_scm` exists
- Laravel `.env`: `DB_PORT=3307`, `DB_DATABASE=meka_scm`, `DB_USERNAME=root`, empty password
- If `vendor/` is missing:
  ```bash
  ../composer.phar install --ignore-platform-req=ext-sodium --ignore-platform-req=ext-gd --ignore-platform-req=ext-zip
  ```
- Seed:
  ```bash
  C:/xampp/php/php.exe artisan db:seed --class=DemoUsersSeeder
  C:/xampp/php/php.exe artisan db:seed --class=DemoProcurementSeeder
  ```

---

## Demo accounts

Password for all: **`password`**. The login page has quick-login cards.

All seeded by `DemoUsersSeeder` (which depends on `DemoDepartmentsSeeder` running first):

Demo `@scm.com` accounts follow the convention `<role>.<dept>@scm.com` so the
department is visible in the email itself. Roles that aren't department-scoped
(admin, ceo, director, customer, vendor) keep the plain `<role>@scm.com` form.

| Email | Role | Department | Lands on |
|---|---|---|---|
| rahul@meka.in | admin | ADMIN | `/admin` |
| sarah@meka.in | manager | SALES | `/app` |
| anna@meka.in | employee | MFG | `/app` |
| **marcus@meka.in** | hod | **PROC** (Procurement HOD) | `/app` |
| vendor@acme.com | vendor → **Acme Industries** | — | `/vendor` |
| admin@scm.com | admin | ADMIN | `/admin` |
| manager.eng@scm.com | manager | ENG | `/app` |
| employee.it@scm.com | employee | IT | `/app` |
| **hod.it@scm.com** | hod | **IT** (IT HOD) | `/app` |
| **hod.fin@scm.com** | hod | **FIN** (Finance HOD) | `/app` |
| **hod.purch@scm.com** | hod | **PURCH** (Purchase HOD) | `/app` |
| cfo.fin@scm.com | cfo | FIN | `/app` |
| ceo@scm.com | ceo | ADMIN | `/app` |
| director@scm.com | director | ADMIN | `/app` |
| accountant.fin@scm.com | accountant | FIN | `/app` |
| **purchase.purch@scm.com** | purchase_officer | **PURCH** | `/app` |
| customer@scm.com | customer | — | `/app` |
| vendor@scm.com | vendor → **Global SCM Vendor** | — | `/vendor` |

Four distinct **HODs by department** make the consensus flow testable: Procurement HOD (`marcus@meka.in`), Purchase HOD (`hod.purch@scm.com`), Finance HOD (`hod.fin@scm.com`), IT HOD (`hod.it@scm.com`).

> **Procurement vs Purchase** — they're separate departments now. **Procurement (PROC)** owns *strategic sourcing* — RFQs, vendor selection, contracts. **Purchase (PURCH)** owns *tactical buying* — issuing POs, tracking orders, day-to-day spend. The Purchase HOD is the gatekeeper for PO authorisation; the Procurement HOD drives RFQ consensus.

> Vendor users without a matching `app_vendors.user_id` row will see empty lists everywhere — vendor-scoped queries find nothing. Always pair a vendor user with an AppVendor row.

---

## Three audiences

| Audience | Roles | Entry | Layout |
|---|---|---|---|
| **User** | employee, manager, hod, cfo, ceo, purchase_officer, accountant, director, customer | `/app` | `UserLayout` |
| **Vendor** | vendor | `/vendor` | `VendorLayout` |
| **Admin** | admin | `/admin` | `AdminLayout` |

`RoleGate` is **enabled** in `routes.jsx` via the `wrap()` helper. Three allowlists: `USER_ROLES`, `VENDOR_ROLES` (admin + vendor), `ADMIN_ROLES`. Unauthorized → `/403`.

Guard files:
- `src/app/guards/ProtectedRoute.jsx` — must be authenticated
- `src/app/guards/RoleGate.jsx` — must have one of the listed roles
- `src/app/guards/RedirectByRole.jsx` — root-level role-aware redirect

---

## Roles, permissions, and RBAC constants

### All 11 roles

`admin · manager · hod · cfo · ceo · purchase_officer · accountant · director · employee · customer · vendor`

### Backend role constants (per controller)

| Constant | Roles | Where used |
|---|---|---|
| `canWriteRfq` / `canWritePo` | admin, purchase_officer | RFQ create/delete, PO create. Per FLOW.md item 6 the Purchase HOD has approve+read only — they assign authoring to a subordinate officer instead of writing directly. |
| `BACKOFFICE_ROLES` | admin, purchase_officer, manager, hod, cfo, ceo | RFQ award/close, consensus voting (HOD-only inside) |
| `WAREHOUSE_ROLES` | admin, manager, hod, employee | GRN create |
| `WRITE_ROLES` (vendor) | admin only | Vendor master CRUD |
| `ORG_WIDE_VIEW_ROLES` | every internal role | RFQ list view (vendors are scoped separately) |

> Frontend `BACKOFFICE_ROLES` set in `src/features/purchase-orders/pages/Detail.jsx`, `Comparison.jsx`, etc. **must match the backend** — drift causes button-visibility bugs.

### Permission map

`src/data/permissions.js` is the canonical client-side permission table. Use `useCan("pr.approve")` (`src/hooks/useCan.js`) instead of inline role checks where possible.

### Defense-in-depth layers

```
route   <RoleGate allow={[...]}>   redirect to /403 if not in list
HTTP    axios interceptor          attaches Bearer ‹token›
edge    ApiToken middleware        validates sha256(token) hash
action  Controller RBAC            in_array($role, BACKOFFICE_ROLES) ?: 403
guard   Terminal-state check       409 on mutating approved/rejected/etc
```

---

## Backend API

Laravel API at `http://127.0.0.1:8000/api`. React calls it through `src/api/client.js`. Full backend walkthrough at `docs/BACKEND.md`.

### Auth

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/login` | email + password → `{ user, token }`. `throttle:5,1`. |
| POST | `/api/logout` | clears token. Bearer required. |
| GET | `/api/me` | current user. Bearer required. |
| PUT | `/api/me` | self-update name + password (current-password required). |
| POST | `/api/vendor-register` | public vendor self-signup (creates user + AppVendor cascaded). |

Bearer middleware: `app/Http/Middleware/ApiToken.php`.

### Procurement CRUD (all bearer-protected)

| Endpoint | Methods | Notes |
|---|---|---|
| `/api/prs` | GET, POST | List supports `?q=` and `?status=`. Non-approvers see only own. |
| `/api/prs/{number}` | GET, DELETE | Delete: admin-only OR creator while at HOD stage. |
| `/api/prs/{number}/status` | POST | `{ action: approve\|reject\|hold\|cancel, comments }`. Role must match `chain_stage`. |
| `/api/rfqs` | GET, POST | View: org-wide. Create: BACKOFFICE_ROLES. |
| `/api/rfqs/{number}` | GET, DELETE | Delete: admin-only. |
| `/api/rfqs/{number}/award` | POST | BACKOFFICE_ROLES. Vendor must be in invite list. |
| `/api/rfqs/{number}/close` | POST | BACKOFFICE_ROLES. |
| `/api/rfqs/{number}/submit` | POST | Vendor only. Identity derived from token, not body. `prices[]` size-validated to items. |
| `/api/pos` | GET, POST | Create: BACKOFFICE_ROLES. |
| `/api/pos/{number}` | GET, DELETE | Delete: admin-only. |
| `/api/pos/{number}/accept` | POST | Assigned vendor (via `app_vendors.user_id`) or admin. |
| `/api/pos/{number}/reject` | POST | Same gate. |
| `/api/grns` | GET, POST | Create: WAREHOUSE_ROLES. PO must be `accepted`/`fulfilled`. Auto-fulfills PO when received ≥ ordered. |
| `/api/grns/{number}` | GET, DELETE | Delete: admin-only. |

### Masters CRUD (all bearer-protected, admin-only writes unless noted)

| Endpoint | Notes |
|---|---|
| `/api/vendors[*]` | Full vendor master. `index` scoped: vendor sees only self; non-back-office gets 403. |
| `/api/admin/users[*]` | `UserAdminController`. Self-delete blocked (422); vendor-user delete blocked. |
| `/api/items[*]` | `ItemController`. |
| `/api/departments[*]` | `DepartmentController`. 12 seeded. |

### Models

| Model | Table | Notes |
|---|---|---|
| `App\Models\AppPr` | `app_prs` | PR-YYYY-NNNN. items, customer, project, region, delivery_location, site_name. |
| `App\Models\AppRfq` | `app_rfqs` | QT-YYYY-NNNN. items, vendors[] (invites), responses[] (quotes), awarded_vendor. |
| `App\Models\AppPo` | `app_pos` | PO-YYYY-NNNN. items with rate+gst, vendor (snapshot), rfq_number. |
| `App\Models\AppGrn` | `app_grns` | GRN-YYYY-NNN. po_number, vendor, items (received qty). |
| `App\Models\AppVendor` | `app_vendors` | Full master + `user_id` FK. |

All items / invite lists / quote responses are **JSON columns** on the parent record — denormalised by design for snapshot integrity (e.g. an awarded vendor's name is frozen on `app_pos.vendor` even if `app_vendors.vendor_name` later changes — though the PUT /me cascade keeps them in sync; see [Common gotchas](#common-gotchas)).

### Auto-generated number formats

| Document | Pattern | Example |
|---|---|---|
| PR | `PR-YYYY-NNNN` | `PR-2026-0042` |
| RFQ | `QT-YYYY-NNNN` | `QT-2026-0017` |
| PO | `PO-YYYY-NNNN` | `PO-2026-0009` |
| GRN | `GRN-YYYY-NNN` | `GRN-2026-031` |

### Terminal states (mutation returns 409)

| Entity | Terminal states |
|---|---|
| PR | `approved` · `rejected` · `cancelled` (`hold` is non-terminal — resumable) |
| RFQ | `awarded` · `closed` |
| PO | `fulfilled` · `rejected` |
| GRN | none — append-only |

### Graceful fallback

`features/auth/store.js` tries the real API first via `pingApi()`. If unreachable (1.5s timeout), it switches to mock mode — **demo still works without Laravel running**. A `mode: "api" | "mock"` flag lives in auth state.

---

## Folder structure

```
src/
├── api/
│   └── client.js                    shared axios instance + pingApi() health check
├── app/                             app-wide plumbing
│   ├── App.jsx, providers.jsx, routes.jsx
│   └── guards/                      ProtectedRoute, RoleGate, RedirectByRole
├── layouts/                         AuthLayout, PublicLayout, UserLayout, VendorLayout, AdminLayout
├── components/                      presentational, domain-agnostic
│   ├── nav/                         Sidebar (role-driven), Topbar (notifications + profile menu + search)
│   ├── auth/                        Button, Field
│   ├── data/                        PageHeader, StatusPill, DataTable, DataTableSection
│   ├── feedback/                    Drawer, Toast (legacy — prefer useToast hook), Loader, Skeleton, ConfirmModal, ErrorBoundary
│   ├── forms/                       FormKit
│   ├── misc/                        AnimatedPage, StaggeredGrid, DocumentPreview, CompanyPicker, TermsTemplatePicker
│   └── ui/                          Card, EmptyState, KpiCard, ThemeToggle
├── features/                        domain work, one folder per feature
│   ├── auth/                        pages/ + api.js (login/logout/me) + store.js (Zustand, persists to localStorage)
│   ├── onboarding/                  vendor 6-step wizard — steps/, pages/, components/VendorRegShell
│   ├── user-home/                   pages/UserHome.jsx — KPIs, quick actions, approvals queue
│   ├── vendor-home/                 pages/VendorHome.jsx
│   ├── admin-home/                  pages/AdminHome.jsx + UsersList, RolesPermissions, ApprovalRules, Settings
│   ├── purchase-requests/           pages/{List,Create,Detail} + components/UpdateStatusModal + api.js + store.js  ← API
│   ├── purchase-orders/             pages/{List,Create,Detail} + components/AcceptPOModal + api.js + store.js      ← API
│   ├── quotations/                  pages/{List,CreateRFQ,Comparison,SubmitQuote} + components/EditQuoteDrawer + api.js + store.js  ← API
│   ├── grn/                         pages/{List,Create,Detail,StockReceive} + api.js + store.js                    ← API
│   ├── finance/                     pages/{InvoicesList,InvoiceApproval,ProformaInvoice,DeliveryChallan,PurchaseReturn,VendorInvoiceUpload}  (mock)
│   ├── masters/                     pages/{Inventory,ItemsList,VendorsList,Categories,Companies,Projects,Departments} + drawers
│   ├── notifications/               pages/Inbox.jsx + components/{NotificationsDropdown, ProfileMenu} + store.js (Zustand persist)
│   ├── reports/                     pages/ReportBuilder.jsx
│   └── vendor-portal/               useVendorIdentity.js + pages/{VendorQuotationRequests, VendorQuotations, VendorPOList, VendorInvoices, VendorApplicationStatus, SubmitQuote}
├── pages/                           route destinations NOT tied to a feature (Landing, NotFound, PublicInvoice, TermsCondition, Forbidden)
├── hooks/
│   ├── useTheme.jsx
│   ├── useToast.jsx                 global toast context — wrapped by app/providers
│   ├── useCan.js                    useCan("pr.approve") backed by data/permissions.js
│   ├── useNotifications.jsx, usePageTitle.js
├── context/FormContext.js           (stub)
├── data/                            constants.js, roles.js, permissions.js
├── utils/                           sessionToken.js, rbac.js, format.js
├── assets/, test/, main.jsx, index.css
```

---

## Live route map

```
/                              → Navigate to /login
/login                         → Login (real /api/login + demo-account quick-login cards)
/forgot-password               → ForgotPassword
/reset-password/:token?        → ResetPassword
/vendor-registration/:step     → 6-step vendor onboarding

/app                           → UserHome (KPIs click into list pages; Quick Actions link to create pages)
/app/purchase-requests[/new, /:number]   ← API (list/create/detail with live status updates)
/app/purchase-orders[/new, /:number]     ← API
/app/quotations[/new, /:number]          ← API (RFQ list / CreateRFQ / Comparison with Award)
/app/grn[/new, /:number]                 ← API
/app/grn/{stock-receive, delivery-challan, purchase-return}   forms (mock)
/app/inventory[/receive]                 inventory list + stock receive (mock)
/app/invoices[/:id/approve, /proforma]   invoice list + CFO approval + proforma (mock)
/app/reports                             ReportBuilder
/app/profile                             user profile (shared component)
/app/notifications                       full inbox (Zustand-backed)

/vendor                                    VendorHome
/vendor/quotation-requests                 ← API (filters RFQs by vendor name)
/vendor/quotations                         vendor's submitted quotes (reads from RFQ store)
/vendor/quotations/submit/:id              ← API (submits quote response to server)
/vendor/purchase-orders[/:id]              ← API (POs addressed to current vendor; detail can accept)
/vendor/invoices[/upload]                  invoices + upload (mock — preview-only banner)
/vendor/profile, /vendor/application-status, /vendor/notifications

/admin                                     AdminHome (8 KPI tiles + pending PR queue + pending vendor card + system links)
/admin/{purchase-requests,purchase-orders,quotations,grn}[/:id]     ← API, reuse same pages
/admin/{inventory,invoices,items,vendors,categories,companies,projects,departments}   masters
/admin/{users,roles,approvals,settings,reports,notifications}                          mostly mock

/403                                       Forbidden
```

---

## Theme tokens

Defined in `src/index.css`. Two layers:

1. Raw CSS vars on `:root` and `[data-theme="dark"]` — swap at runtime.
2. `@theme inline` maps them into Tailwind utilities.

### Semantic token names (use these — never hex)

| Group | Tokens |
|---|---|
| Brand (red+white) | `bg-primary`, `bg-primary-hover`, `bg-primary-soft`, `bg-primary-deep`, `text-primary-foreground` |
| Surfaces | `bg-bg`, `bg-surface`, `bg-surface-alt`, `bg-surface-container`, `bg-surface-container-low`, `bg-surface-container-lowest`, `border-border`, `border-outline-variant` |
| Text | `text-text`, `text-text-muted`, `text-text-subtle` |
| Status | `bg-success` / `bg-success-soft` / `text-success` — same for `warning`, `danger`, `info` |

### Theme toggle

`hooks/useTheme.jsx` (`ThemeProvider`, `useTheme()`) + reusable button at `components/ui/ThemeToggle.jsx`. Persists to `localStorage["scm-theme"]`, respects `prefers-color-scheme` on first load, sets `data-theme="dark"` on `<html>`.

---

## Conventions

### Code organisation

- **Feature-first.** Anything domain-specific (forms, pages, API, store, hooks) lives under `features/<domain>/`. Cross-cutting UI lives in `components/`.
- **Files**: JSX files use `.jsx`. Hooks are `.jsx` if they render JSX, `.js` otherwise.
- **Branding = "SCM"** (nothing else). Stitch designs drift between SCM_ARCHITECT / Industrial Architect — ignore those variants.

### Styling

- **Semantic tokens only.** If you're about to write `bg-red-600`, use `bg-primary` instead. If a token is missing, add it to `index.css` rather than hardcoding.
- **Icons are Lucide.** When converting Stitch designs, map `material-symbols-outlined` names to the nearest Lucide icon.
- **Currency = ₹** (rupees). Anywhere `$` appears, it's a leftover and should be fixed.
- **Standard page width**: `max-w-6xl` for app pages.

### Data layer

- **Stores (Zustand)**: `features/<domain>/store.js`. Convention:
  - state: `items`, `loading`, `error`
  - `fetchAll()` — GET list, set items
  - `create(payload)` — POST, prepend to items, return record
  - domain mutations (e.g. `updateStatus`, `accept`, `award`, `submitQuote`) — PATCH/POST + update item in place
  - `remove(number)` — DELETE + filter items
- **Schema-shape rules (frontend ↔ backend)**:
  - PR/RFQ/PO/GRN items use `name` (required) + `code` / `hsn_code` / `uom` / `qty`. PO additionally needs `rate` and `gst`. NOT `description`/`quantity`/`unit_price`.
  - PR status mutation: `{ action: approve|reject|hold|cancel, comments }`. NOT `{ status }`.
  - RFQ submit: `prices` is a parallel **numeric array** sized to items (server-validated); `gst` is a parallel array of GST percentages.
  - GRN store requires `vendor` field separate from items.
  - Login + `/me` responses are FLAT (`{ user, token }` / `{ id, name, email, role }`). Every other endpoint wraps in `{ data: ... }`. Convention inconsistency, both sides handle it.

### Forms

Handle submit with `e.preventDefault()`, local `useState` for fields, validation inline. Submit calls the store action (which calls the API) and toasts on success/error.

### Toasts

Always use `useToast()` from `hooks/useToast.jsx`. Never render the legacy `components/feedback/Toast.jsx` directly in new code.

### RBAC pattern (established across PR/RFQ/PO/GRN)

1. Backend controller has `BACKOFFICE_ROLES` / `WAREHOUSE_ROLES` constants.
2. Frontend List page imports the same set; hides Create button for non-authorized roles.
3. `features/<domain>/pages/Create.jsx` does a `<Navigate to="/app/<domain>" replace />` role-gate **after all hooks have run** (rules-of-hooks).
4. Backend `index()` scopes the list (creator-only / vendor-only / org-wide) so even URL-tampered access shows nothing.

### Key invariants

- **Vendor identity is always derived server-side** from `AppVendor::where('user_id', $user->id)->value('vendor_name')`. Never trust `vendor` name in request body from a vendor-role user.
- **Auto-fulfill chain**: GRN store triggers PO `status=fulfilled` when aggregate received = ordered. Same pattern is ready for PO → Invoice → Payment.
- **Deep-link prefill**: Create pages accept `?rfq=QT-…` / `?pr=PR-…` query params and auto-populate from the source document.
- **Terminal-state guard**: every status-mutating endpoint checks `if (in_array($record->status, [TERMINAL_STATES], true)) return 409`.

---

## Common gotchas

### `localhost` vs `127.0.0.1` (Windows + IPv6)

The axios `baseURL` **must** be `http://127.0.0.1:8000/api`, not `http://localhost:8000/api`. On Windows, `localhost` resolves to both IPv6 (`::1`) and IPv4 (`127.0.0.1`) with IPv6 preferred — but `php artisan serve --host=127.0.0.1` only listens on IPv4. Browser waits 1–3 seconds per request for the IPv6 attempt to time out. Hardcoded in `src/api/client.js`.

### Vendor rename cascade

When a vendor renames itself via `PUT /me`, the linked `app_vendors.vendor_name` updates — but vendor names are also **snapshot in JSON columns** across `app_rfqs.vendors[]`, `app_rfqs.responses[].vendor`, `app_rfqs.awarded_vendor`, `app_pos.vendor`, `app_grns.vendor`. The `PUT /me` route handler walks all four tables in a transaction and rewrites the old name. Don't add a new place that snapshots vendor name without updating that handler.

### Vendor without AppVendor row

A vendor user with no matching `app_vendors.user_id` row will see empty lists everywhere because vendor-scoped queries find nothing. Always pair via seeder.

### Login throttle

`/api/login` has `throttle:5,1` (5 attempts per minute). Smoke tests sleep 65s between batches. If you're testing manually and locked out, wait 60s.

### `null` leaks in detail pages

Use the centralized `isEmpty()` helper. `formatDate("null")` returns `"—"`, not the string `"null"`.

### CORS preflight

Don't set `withCredentials: true` on axios — it triggers an unnecessary CORS preflight. The bearer token does all the auth; cookies are not used.

### Hooks-before-redirect

In any page that role-gates with `<Navigate />`, **all hooks must run before** the conditional return. Otherwise you'll hit the React rules-of-hooks error.

---

## Designs

Google Stitch exports (HTML + inline Tailwind) live in `designs/`.

- `designs/completed/` — login, vendor-reg steps
- `designs/remaining/` — 40+ converted, several still reference designs (full finance suite, vendor/invoice details)

Stitch uses Material Design token names — `index.css` provides equivalents. Replace `material-symbols-outlined` with Lucide during conversion.

When converting a screen: read the one HTML file, reuse existing components (`AuthLayout`, `Field`, `Button`, `PageHeader`, `StatusPill`, `Drawer`, `Card`, `EmptyState`, `KpiCard`, etc.), don't re-read the whole `designs/` folder.

---

## Sister docs

| File | Purpose |
|---|---|
| [`PROGRESS.md`](./PROGRESS.md) | Session-by-session changelog + current implementation snapshot (✅/🟡/🔴/⚠️) |
| [`FLOW.md`](./FLOW.md) | Mermaid flow diagrams (some flows are aspirational — see disclaimer at top) |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Deep-dive flow diagrams, ERD hints, patterns — read when you need the bigger picture |
| `docs/BACKEND.md` | Full Laravel backend walkthrough |
