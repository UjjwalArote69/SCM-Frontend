# Suppliers First Frontend — Project Reference

React frontend for a Laravel-backed Supply Chain Management tool (, India). **Auto-loaded every session** — keep it tight, treat it as the **single source of truth for stack, conventions, routes, and RBAC**.

Sister docs:
- [`PROGRESS.md`](./PROGRESS.md) — session-by-session changelog + current implementation snapshot
- [`FLOW.md`](./FLOW.md) — Mermaid flow diagrams (some flows are aspirational — see disclaimer at top)
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — deep-dive flow diagrams, ERD hints, patterns
- [`DESIGN.md`](./DESIGN.md) — **canonical design system** (color tokens, typography, layout, components, page archetypes). Treat its tokens as the contract; **don't retheme the live UI from runtime data**.
- `docs/BACKEND.md` — full Laravel backend walkthrough

> ✅ **FLOW.md status (as of 2026-05-09)**: Items 1–8 + 10–20 are fully implemented end-to-end. Open: standalone Notifications system + per-project PM scoping for GRN approval. See [`PROGRESS.md` → Current implementation snapshot](./PROGRESS.md#current-implementation-snapshot--2026-05-08).

---

## Table of contents

1. [Quick start](#-quick-start)
2. [What this is](#what-this-is)
3. [Stack](#stack)
4. [Local setup & commands](#local-setup--commands)
5. [Demo accounts](#demo-accounts)
6. [Three audiences](#three-audiences)
7. [Roles, permissions, and RBAC](#roles-permissions-and-rbac)
8. [Permission system (role_permissions matrix)](#permission-system-role_permissions-matrix)
9. [Backend API](#backend-api)
10. [Models and snapshots](#models-and-snapshots)
11. [Folder structure](#folder-structure)
12. [Live route map](#live-route-map)
13. [Theme tokens](#theme-tokens)
14. [Conventions](#conventions)
15. [List page archetype](#list-page-archetype)
16. [Common gotchas](#common-gotchas)
17. [Designs](#designs)

---

## 🚀 Quick start

CWD assumed: `scm-frontend/`. Use `run_in_background: true` for the long-running ones.

**Backend (Laravel API on `127.0.0.1:8000`)** — run in background:
```bash
cd "C:/Users/ujjwa/OneDrive/Desktop/Ujjwal/Work/Suppliers First/backupmeka" && C:/xampp/php/php.exe artisan serve --host=127.0.0.1 --port=8000
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
node test/api-smoke.mjs           # 54/54 — full RBAC + chain + auto-fulfill + PM approval
node test/vendor-smoke.mjs        # 34/34 — vendor scoping + rename-cascade
node test/setup-grn-fixture.mjs   # one-shot: drives PR → RFQ → PO chain so a fresh PO sits at "accepted"
```

> **Don't use `localhost`** — Windows IPv6 timeout. Always `127.0.0.1`. See [Common gotchas](#common-gotchas).

---

## What this is

A web app that drives the **procure-to-pay** pipeline for an industrial group:

```
PR  →  RFQ  →  PO  →  GRN  →  Invoice  →  Payment
(request)  (compare quotes)  (purchase order)  (goods receipt with PM approval)  (vendor bills us)  (we settle)
```

The full lifecycle is implemented end-to-end with role-gated approvals at every step:

- **PR** — any in-org user raises; HOD → CFO → CEO chain (rule-driven via `app_approval_rules`).
- **RFQ** — Purchase Officer authors (assigned by Purchase HOD); vendors auto-selected by item category; three-HOD consensus → CFO → CEO → Purchase-HOD award.
- **PO** — Purchase Officer authors (assigned by Purchase HOD); 5-stage approval (purchase_hod → finance_hod → respective_hod → cfo → ceo); vendor accepts or rejects.
- **GRN** — `site_person` creates with damage tracking + invoice/eway-bill upload; `project_manager` inspects + approves; PO auto-fulfils only on damage-free accepted units.
- **Invoice** — vendor uploads with optional dispatch docs; CFO/Accountant/Admin approves.
- **Payment** — Finance creates; cost-tiered approval (`<₹50k` direct; `₹50k–5L` → CFO; `≥₹5L` → CFO + CEO).

Three audiences share one frontend; backend is Laravel. Tokens are **sha256-hashed bearer tokens** stored on `users.api_token`. RBAC is enforced **defense-in-depth at six layers** (route guard → axios interceptor → middleware → controller → terminal-state guard → vendor-response scrub).

---

## Stack

| Layer | Tech | Notes |
|---|---|---|
| Build | Vite 8 + `@vitejs/plugin-react` 6 | route-level code splitting via `React.lazy()` in `routes.jsx`. Main bundle ~320 kB / 96 kB gzipped; 50+ per-route chunks. |
| Runtime | React 19, react-router-dom 7 | |
| Styling | Tailwind v4 via `@tailwindcss/vite` | **NOT PostCSS.** Local `postcss.config.js` is an empty shadow to block the Laravel root's PostCSS config from leaking in. Tokens defined in `src/index.css` `@theme inline` block. |
| HTTP | axios | Shared client at `src/api/client.js`. Reads `VITE_API_URL`; defaults to `http://127.0.0.1:8000/api` (NOT `localhost`). Auto-attaches bearer from `localStorage["scm-auth"]` via interceptor. |
| State | Zustand + `persist` middleware | One store per feature (`features/<domain>/store.js`). Auth + notifications + theme persist to localStorage. |
| Icons | `lucide-react` only | Stitch design imports reference Material Symbols — convert to nearest Lucide icon during port. |
| Font | **Montserrat** via Google Fonts | Loaded in `index.html`; weights 300–900. Wired through `--font-sans` CSS var. |
| PDFs | DomPDF (server-side) | One blade per doc type in `resources/views/pdf/` — PR / PO / RFQ / GRN / Payment. Print iframe pattern on detail pages. |
| Backend | Laravel 11 + MySQL 8 | XAMPP MySQL on port **3307**, DB `meka_scm`. |
| Node | v25, npm 11 | |

---

## Local setup & commands

### Frontend

```bash
npm run dev        # Vite dev server at http://localhost:5173 (browser; the API uses 127.0.0.1)
npm run build      # production build → dist/
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

| File | Coverage | Status |
|---|---|---|
| `test/api-smoke.mjs` | Auth + PR + RFQ + PO + GRN with full RBAC + terminal-state + chain advancement + PM approval + auto-fulfil | **54/54** |
| `test/vendor-smoke.mjs` | Vendor scoping + RFQ visibility + quote submission + PO accept + rename-cascade + write-attempt blocks | **34/34** |
| `test/setup-grn-fixture.mjs` | Setup helper — drives PR → RFQ → PO end-to-end so a fresh PO is sitting at `status=accepted`, ready for `site_person` to GRN against. | one-shot |

Tests pace login attempts to dodge the `throttle:5,1` rate limit (sleep 65s between batches).

### One-time backend setup

- XAMPP MySQL running on port **3307**
- Database `meka_scm` exists
- Laravel `.env`: `DB_PORT=3307`, `DB_DATABASE=meka_scm`, `DB_USERNAME=root`, empty password
- If `vendor/` is missing:
  ```bash
  ../composer.phar install --ignore-platform-req=ext-sodium --ignore-platform-req=ext-gd --ignore-platform-req=ext-zip
  ```
- Storage symlink (so logos/avatars/PDF assets serve under `/storage/*`):
  ```bash
  C:/xampp/php/php.exe artisan storage:link
  ```
- Seed:
  ```bash
  C:/xampp/php/php.exe artisan db:seed --class=DemoDepartmentsSeeder
  C:/xampp/php/php.exe artisan db:seed --class=DemoUsersSeeder
  C:/xampp/php/php.exe artisan db:seed --class=DemoCatalogSeeder
  C:/xampp/php/php.exe artisan db:seed --class=DemoProcurementSeeder
  C:/xampp/php/php.exe artisan db:seed --class=PermissionsSeeder
  C:/xampp/php/php.exe artisan db:seed --class=ApprovalRulesDefaultSeeder
  ```

---

## Demo accounts

Password for all: **`password`**. The login page has quick-login cards.

All seeded by `DemoUsersSeeder` (depends on `DemoDepartmentsSeeder` running first).

Demo `@scm.com` accounts follow the convention `<role>.<dept>@scm.com` so the department is visible in the email itself. Roles that aren't department-scoped (admin, ceo, director, customer, vendor) keep the plain `<role>@scm.com` form.

| Email | Role | Department | Lands on |
|---|---|---|---|
| `rahul@meka.in` | admin | ADMIN | `/admin` |
| `sarah@meka.in` | manager | SALES | `/app` |
| `anna@meka.in` | employee | MFG | `/app` |
| **`marcus@meka.in`** | hod | **PROC** (Procurement HOD) | `/app` |
| `vendor@acme.com` | vendor → **Acme Industries** | — | `/vendor` |
| `admin@scm.com` | admin | ADMIN | `/admin` |
| `manager.eng@scm.com` | manager | ENG | `/app` |
| `employee.it@scm.com` | employee | IT | `/app` |
| **`hod.it@scm.com`** | hod | **IT** (IT HOD) | `/app` |
| **`hod.fin@scm.com`** | hod | **FIN** (Finance HOD) | `/app` |
| **`hod.purch@scm.com`** | hod | **PURCH** (Purchase HOD) | `/app` |
| `cfo.fin@scm.com` | cfo | FIN | `/app` |
| `ceo@scm.com` | ceo | ADMIN | `/app` |
| `director@scm.com` | director | ADMIN | `/app` |
| `accountant.fin@scm.com` | accountant | FIN | `/app` |
| **`purchase.purch@scm.com`** | purchase_officer | **PURCH** | `/app` |
| **`site.ops@scm.com`** | site_person | OPS | `/app` |
| **`pm.eng@scm.com`** | project_manager | ENG | `/app` |
| `customer@scm.com` | customer | — | `/app` |
| `vendor@scm.com` | vendor → **Global Suppliers First Vendor** | — | `/vendor` |

Plus one HOD per dept (ENG / MFG / OPS / SALES / HR / LEGAL / QA / RND) and one employee per dept — see seeder for full list.

**Four distinct HODs by department** make the consensus flow testable: Procurement (`marcus@meka.in`), Purchase (`hod.purch@scm.com`), Finance (`hod.fin@scm.com`), IT (`hod.it@scm.com`).

> **Procurement vs Purchase**: separate departments. **Procurement (PROC)** owns *strategic sourcing* — RFQs, vendor selection, contracts. **Purchase (PURCH)** owns *tactical buying* — PO issuance, day-to-day spend. The Purchase HOD gates PO authorisation; the Procurement HOD votes on RFQ consensus.

> **Vendor users without a matching `app_vendors.user_id` row** see empty lists everywhere — vendor-scoped queries find nothing. Always pair via seeder.

---

## Three audiences

| Audience | Layout | Roles | Entry |
|---|---|---|---|
| **User** | `UserLayout` | employee, manager, hod, cfo, ceo, director, accountant, purchase_officer, **site_person**, **project_manager**, customer | `/app` |
| **Vendor** | `VendorLayout` | vendor (admin permitted for support) | `/vendor` |
| **Admin** | `AdminLayout` | admin | `/admin` |

`RoleGate` is **enabled** in `routes.jsx` via the `wrap()` helper. Three allowlists: `USER_ROLES`, `VENDOR_ROLES` (admin + vendor), `ADMIN_ROLES`. Unauthorized → `/403`.

Guard files:
- `src/app/guards/ProtectedRoute.jsx` — must be authenticated
- `src/app/guards/RoleGate.jsx` — must have one of the listed roles
- `src/app/guards/RedirectByRole.jsx` — root-level role-aware redirect after login

---

## Roles, permissions, and RBAC

### All 13 roles

`admin · manager · hod · cfo · ceo · director · accountant · purchase_officer · site_person · project_manager · employee · customer · vendor`

Defined in `src/data/roles.js` (`ROLES`, `ROLE_LABELS`, `ROLE_SHORT_LABELS`, `ROLE_HOME`, `ROLE_AUDIENCE`, `USER_PORTAL_ROLES`).

### Backend role helpers / constants per controller

| Controller | Constant / helper | Roles | Where used |
|---|---|---|---|
| `RfqController` | `canWriteRfq($user)` | admin, purchase_officer | RFQ create/delete (per FLOW.md item 6, Purchase HOD has approve+read only — they assign the authoring task to a subordinate officer instead). |
| `RfqController` | `BACKOFFICE_ROLES` | admin, purchase_officer, manager, hod, cfo, ceo | Award/close. Consensus voting is HOD-only (gated separately by department match). |
| `RfqController` | `ORG_WIDE_VIEW_ROLES` | every internal role incl. **site_person + project_manager** | RFQ list view. Vendors are scoped separately via `scrubForVendor()`. |
| `PoController` | `canWritePo($user)` | admin, purchase_officer | PO create. |
| `PoController` | `ORG_WIDE_VIEW_ROLES` | every internal role incl. **site_person + project_manager** | PO list view. |
| `GrnController` | `creatorRoles()` | reads from `role_permissions` table — see [Permission system](#permission-system-role_permissions-matrix) | GRN create gate. Default = admin + site_person + project_manager. |
| `GrnController` | `ORG_WIDE_VIEW_ROLES` | admin, manager, hod, cfo, ceo, director, accountant, purchase_officer, **site_person, project_manager**, customer (NOT employee) | GRN list/detail view. Employees can't see GRNs. |
| `GrnController` | `updateStatus` (PM approval) | project_manager, admin | Approve/reject GRN at `chain_stage=pending_pm`. |
| `PrController` | `APPROVER_ROLES` (broad-view) | admin, hod, cfo, ceo, **site_person, project_manager** | Org-wide PR list; non-listed roles see only own PRs. Approval itself is gated separately by `ChainEngine::canActOnStage` matching role to current chain stage. |
| `PaymentController` | `canManagePayment` / `canMarkPaid` | admin, accountant, FIN HOD; admin + FIN HOD for mark-paid | All in-org roles can view; only listed can create/release. |
| `InvoiceController` | `ORG_VIEW_ROLES` | admin, cfo, ceo, director, accountant, manager, hod, purchase_officer, **site_person, project_manager** | Invoice list. |
| `InvoiceController` | `APPROVER_ROLES` | cfo, accountant, admin | Approve / reject invoice. |
| `VendorController` | `READ_LIST_ROLES` | admin, purchase_officer, manager, hod, cfo, ceo, director, accountant, **site_person, project_manager** | Vendor master read. |
| `VendorController` | `WRITE_ROLES` | admin only | Vendor master create/update/delete. Vendor self-updates flow through `PUT /me`. |

> Frontend mirrors of these constants (in `src/features/<domain>/pages/*.jsx`) **must match the backend** — drift causes button-visibility bugs.

### Defense-in-depth layers

```
1. Route guard       <RoleGate allow={[...]}>          redirect to /403 if not in list
2. HTTP interceptor  axios baseURL + Bearer attach     adds `Authorization: Bearer ‹token›`
3. Edge middleware   ApiToken (Http/Middleware)        validates sha256(token) → users.api_token
4. Controller RBAC   helpers / constants               in_array($role, …) ?: 403
5. Terminal-state    409 if record already terminal    `if (in_array($status, TERMINAL)) abort(409)`
6. Vendor scrub      scrubForVendor() on responses     hides consents, chain_stage, approval_history
```

### Vendor response scrubs

Vendor-role callers get **stripped responses** so curl-sniffing the API can't reveal internal evaluator state:

- `RfqController::scrubForVendor()` — adds `rates_locked` boolean; hides `consents`, `chain_stage`, `assigned_po_author_id`, `assignedPoAuthor`.
- `PoController::scrubForVendor()` — adds `released` boolean (`true` iff `chain_stage='done'`); hides `chain_stage`, `respective_dept_code`, `approval_history`, `last_comment`.

The 409 lock messages also neutralise to *"This PO is still awaiting buyer approval and cannot be acted on yet."*

---

## Permission system (`role_permissions` matrix)

Permissions are stored in two tables:

- **`permissions`** — catalog of permission codes (e.g. `pr.create`, `grn.create`, `po.approve`). Seeded by `PermissionsSeeder.php`. Each row has `code`, `name`, `module`.
- **`role_permissions`** — many-to-many join: `(role, permission_code)`. Admin is intentionally **not** seeded here — admin always implicitly passes `can()` checks server-side.

### `User::can($code)` helper

`app/Models/User.php` overrides Laravel's `can()` so any controller can call `$user->can('grn.create')`:

- **Admin** short-circuits to `true` (returns `['*']` from `abilities()`).
- **Other roles** consult the `role_permissions` rows for that role.
- Result is request-cached on the `User` instance; call `$user->refreshAbilities()` after a same-request mutation if you need a re-read.

### Two admin UIs that write to the same table

| Page | What it edits | Source of truth |
|---|---|---|
| `/admin/roles` (Roles & Permissions) | Full role × permission matrix. Pick a role on the left, tick permissions in the modules on the right, click **Save** in the sticky bar. | Direct CRUD on `role_permissions`. |
| `/admin/settings → Access Control` | The single `grn.create` permission — checkbox per role. | Convenience shortcut: `SettingsController::syncGrnCreatePermission()` rewrites `grn.create` rows in `role_permissions`. The `grn_creator_roles` value returned by `GET /api/settings` is **derived** from the matrix, not stored as its own column. |

Both UIs read/write the same underlying data — no drift.

### `permissions` array on `/api/me`

`scm_user_payload()` in `routes/api.php` returns `permissions: [...]` on every `/login`, `/me`, and avatar-update response. Frontend reads `user.permissions.includes('grn.create')` from the auth store to gate UI affordances. Admin gets the special token `["*"]`.

### Frontend permission table (legacy)

`src/data/permissions.js` is a static client-side fallback table; `src/hooks/useCan.js` provides `useCan("pr.approve")`. Use this where a fully-canonical server-roundtrip is overkill, but **prefer `user.permissions`** from `/api/me` for new code.

---

## Backend API

Laravel API at `http://127.0.0.1:8000/api`. React calls it through `src/api/client.js`. Full backend walkthrough at `docs/BACKEND.md`.

### Auth

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/login` | email + password → `{ user, token }`. `throttle:5,1`. |
| POST | `/api/logout` | clears `users.api_token`. Bearer required. |
| GET | `/api/me` | current user + permissions. Bearer required. |
| PUT | `/api/me` | self-update name + password (current-password required). Vendor users also cascade `vendor_name` rewrite across JSON snapshots. |
| POST | `/api/me/avatar` | multipart upload (jpg/png/webp ≤ 2 MB). Returns updated user with `avatar_url`. |
| DELETE | `/api/me/avatar` | clear avatar. |
| POST | `/api/forgot-password` | hashed token in `password_reset_tokens`. Generic 200 to prevent email enumeration. Dev mode returns `_reset_url` inline. |
| POST | `/api/reset-password` | verify token + email + freshness (60 min); rotate password; invalidate `api_token`. |
| POST | `/api/vendor-register` | public vendor self-signup (creates user + AppVendor cascaded). |

Bearer middleware: `app/Http/Middleware/ApiToken.php`. Token stored as `sha256` hash on `users.api_token`.

### Procurement endpoints (all bearer-protected)

| Endpoint | Methods | Notes |
|---|---|---|
| `/api/prs` | GET, POST | List supports `?q=` and `?status=`; non-approver roles scoped to own. Bundled detail response includes `documents` and `assignedRfqAuthor`. |
| `/api/prs/{number}` | GET, DELETE | Delete: admin OR creator (while at HOD stage **or** after rejection). |
| `/api/prs/{number}/status` | POST | `{ action: approve\|reject\|hold\|cancel, comments }`. Role gate via `ChainEngine::canActOnStage`. |
| `/api/prs/{number}/assign-rfq-author` | POST | Purchase HOD / admin assigns a `purchase_officer` once PR is approved. |
| `/api/prs/{number}/pdf` | GET | DomPDF stream (inline by default; `?download=1` for attachment). |
| `/api/pr-documents[*]` | GET, POST, DELETE, GET `/{id}/download` | Attachments scoped per PR. |
| `/api/rfqs` | GET, POST | Vendors auto-selected by item category — `vendors` field optional (admin override available). |
| `/api/rfqs/{number}` | GET, DELETE | Delete: admin only. |
| `/api/rfqs/{number}/award` | POST | Requires `chain_stage=done` AND Purchase HOD or admin. Vendor must be `consents.agreed_vendor`. |
| `/api/rfqs/{number}/close` | POST | BACKOFFICE_ROLES. |
| `/api/rfqs/{number}/submit` | POST | Vendor only. Identity derived from token, not body. `prices[]` size-validated to items. **Locked** if any HOD has voted (returns 409 with rates_locked). |
| `/api/rfqs/{number}/agree` | POST | HOD votes for a vendor. Slots filled by department code (PURCH→purchase, FIN→finance, matching `respective_dept_code`→respective). |
| `/api/rfqs/{number}/withdraw-agreement` | POST | HOD pulls back their vote. |
| `/api/rfqs/{number}/status` | POST | CFO/CEO approve/hold/reject the financial chain. |
| `/api/rfqs/{number}/assign-po-author` | POST | Purchase HOD / admin assigns PO author (post-award). |
| `/api/rfqs/{number}/pdf` | GET | DomPDF. |
| `/api/pos` | GET, POST | Create: admin + purchase_officer only. |
| `/api/pos/{number}` | GET, DELETE | Delete: admin only. |
| `/api/pos/{number}/accept` / `/reject` | POST | Assigned vendor (via `app_vendors.user_id`) or admin. Locked until `chain_stage=done`. |
| `/api/pos/{number}/status` | POST | Internal 5-stage approval (purchase_hod → finance_hod → respective_hod → cfo → ceo → done). Driven by `ChainEngine`. |
| `/api/pos/{number}/pdf` | GET | DomPDF. |
| `/api/po-documents[*]` | GET, POST, GET `/{id}/download`, DELETE | Vendor uploads dispatch docs (e_way_bill / invoice / delivery_note) once PO is accepted. Employees + customers blocked from view. |
| `/api/grns` | GET, POST | Create gated via `$user->can('grn.create')`. PO must be `accepted/fulfilled`. Initial `chain_stage=pending_pm`. |
| `/api/grns/{number}` | GET, DELETE | View: ORG_WIDE_VIEW_ROLES (excludes employee). Delete: admin only. |
| `/api/grns/{number}/status` | POST | PM approval — advances `pending_pm → done` (or `rejected`). Triggers `maybeFulfilPo()`. |
| `/api/grns/{number}/accept-replacement` | POST | Vendor acknowledges damaged units + commits to replacement. |
| `/api/grn-documents[*]` | GET, POST, GET `/{id}/download`, DELETE | Invoice / proforma / tax_invoice / damage_photo / other. Damage photos can link to a specific `item_index`. |
| `/api/grns/{number}/pdf` | GET | DomPDF. |

### Finance endpoints

| Endpoint | Methods | Notes |
|---|---|---|
| `/api/payments` | GET, POST | Create: admin + accountant + FIN HOD. PO must be `accepted/fulfilled`. |
| `/api/payments/{number}` | GET, DELETE | All in-org can view. Vendors scoped to own. Delete: admin only. |
| `/api/payments/{number}/status` | POST | CFO / CEO approve at their stage (rule-driven). |
| `/api/payments/{number}/mark-paid` | POST | Admin + FIN HOD. 409 if `chain_stage !== 'cleared_to_pay'`. |
| `/api/payments/{number}/pdf` | GET | DomPDF voucher. |
| `/api/invoices` | GET, POST | Vendor self-uploads with PO link + items snapshot + totals. |
| `/api/invoices/{number}` | GET, DELETE | View scoped per role. |
| `/api/invoices/{number}/status` | POST | Approve / reject by CFO / accountant / admin. |

### Masters / system endpoints (admin-only writes unless noted)

| Endpoint | Notes |
|---|---|
| `/api/vendors[*]` | Full vendor master. `index` scoped: vendor sees only own; non-back-office gets 403 on list. Public `POST /api/vendor-register` for self-signup. |
| `/api/admin/users[*]` | `UserAdminController`. Self-delete blocked (422); vendor-user delete blocked. |
| `/api/users/purchase-officers` | List for the assignment dropdowns. PURCH-HOD + admin only. |
| `/api/items[*]` | Item catalog. Code + HSN editable; `spec_hints` JSON drives the requester-side spec panel. |
| `/api/departments[*]` | 13 seeded (incl. PROC + PURCH + IT + FIN + ENG + MFG + OPS + SALES + HR + LEGAL + QA + RND + ADMIN). Force-delete with `?force=1` orphans linked users. |
| `/api/categories[*]` | Item catalog hierarchy. |
| `/api/companies[*]` | Legal entities. |
| `/api/projects[*]` | Active initiatives + budgets. |
| `/api/inventory` | Derived from approved GRNs (no inventory table). Aggregates `received - damaged` per active SKU. |
| `/api/reports/*` | 8 pre-built procurement analytics — spendByVendor, spendByDepartment, spendByCategory, monthlyTrend, pendingApprovals, vendorPerformance, funnel, cycleTime. |
| `/api/settings` | Singleton `app_company_settings`. GET open to in-org; PUT admin-only. |
| `/api/settings/logo` | Multipart logo upload (≤ 512 KB). Stored under `storage/app/public/logos/*`. |
| `/api/roles-permissions` | GET: `{ permissions: [...], matrix: { role: [code, ...] } }`. PUT `/{role}` writes `role_permissions` for that role. |
| `/api/approval-rules[*]` | `ChainEngine` rules CRUD. `POST /preview` for live test. |
| `/api/notifications` | Server-side notifications (Zustand-persisted seed today; backend wire still pending). |

### Auto-generated number formats

| Document | Pattern | Example |
|---|---|---|
| PR | `PR-YYYY-NNNN` | `PR-2026-0042` |
| RFQ | `QT-YYYY-NNNN` | `QT-2026-0017` |
| PO | `PO-YYYY-NNNN` | `PO-2026-0009` |
| GRN | `GRN-YYYY-NNN` | `GRN-2026-031` |
| Invoice | `INV-YYYY-NNNN` | `INV-2026-0023` |
| Payment | `PAY-YYYY-NNNN` | `PAY-2026-0011` |

### Terminal states (mutation returns 409)

| Entity | Terminal states | Notes |
|---|---|---|
| PR | `approved` · `rejected` · `cancelled` | `hold` is non-terminal — resumable. |
| RFQ | `awarded` · `closed` | Reject is terminal (chain stays at the rejecting stage). |
| PO | `fulfilled` · `rejected` | Vendor accept allowed only when `chain_stage='done'`. |
| GRN | none — append-only | `chain_stage` advances `pending_pm → done` on PM approve, or `→ rejected`. |
| Invoice | `approved` · `rejected` · `paid` | |
| Payment | `cleared_to_pay` (then `paid` once mark-paid fires) | |

### Graceful API/mock fallback

`features/auth/store.js` tries the real API first via `pingApi()` (1.5s timeout). If unreachable, switches to mock mode — **demo still works without Laravel running**. A `mode: "api" | "mock"` flag lives in auth state.

---

## Models and snapshots

| Model | Table | Key fields |
|---|---|---|
| `App\Models\User` | `users` | `role`, `department_id` (FK), `api_token` (sha256), `avatar_path`. `User::can($code)` → `role_permissions`. |
| `App\Models\AppPr` | `app_prs` | `PR-YYYY-NNNN`. items, customer, project, region, delivery_location, site_name, `chain_stage`, `approval_history`, `assigned_rfq_author_id`. |
| `App\Models\AppRfq` | `app_rfqs` | `QT-YYYY-NNNN`. items, vendors[] (invites), responses[] (quotes), awarded_vendor, `consents` JSON, `chain_stage`, `assigned_po_author_id`. |
| `App\Models\AppPo` | `app_pos` | `PO-YYYY-NNNN`. items with rate+gst, vendor (snapshot), rfq_number, `chain_stage`, `respective_dept_code`, `approval_history`, `last_comment`. |
| `App\Models\AppGrn` | `app_grns` | `GRN-YYYY-NNN`. po_number, vendor, items (with `damaged` + `remark`), `chain_stage`, `replacement_status`, `damage_remark`/`damage_by`/`damage_comment`, `pm_approved_by`, `pm_approved_at`, `inspection_notes`, `approval_history`. |
| `App\Models\AppPoDocument` | `app_po_documents` | dispatch docs uploaded by vendor. `download_url` accessor; `file_path` hidden. |
| `App\Models\AppGrnDocument` | `app_grn_documents` | invoice/proforma/tax_invoice/damage_photo/other. `item_index` links damage photos to a specific GRN line. |
| `App\Models\AppInvoice` | `app_invoices` | `INV-YYYY-NNNN`. po_number, vendor, items snapshot, totals, status, approval_history. |
| `App\Models\AppPayment` | `app_payments` | `PAY-YYYY-NNNN`. po_number, vendor, amount, status, payment_method, reference_no, paid_at, `chain_stage`, `approval_history`. |
| `App\Models\AppVendor` | `app_vendors` | Full master + `user_id` FK to identity. |
| `App\Models\AppCompanySettings` | `app_company_settings` | Singleton (id=1). legal_name, address, gstin, pan, currency, fiscal_year_start, logo_path, primary_color, email_footer, integrations[]. **Note**: `grn_creator_roles` was a real column but is now derived from `role_permissions` on read; the column is left in place for back-compat but no longer the source of truth. |
| `App\Models\AppApprovalRule` | `app_approval_rules` | `ChainEngine` rule rows: entity, name, priority, active, conditions (JSON), stages (JSON). |
| `App\Models\AppDepartment` | `app_departments` | Code + name + head_name + active. |
| `App\Models\AppItem` | `app_items` | Master catalog. code, name, category, hsn_code, uom, price, spec_hints (JSON). |
| `App\Models\AppCategory` / `AppCompany` / `AppProject` | corresponding tables | masters. |
| `App\Models\Permission` / `RolePermission` | `permissions` / `role_permissions` | Permission catalog + role mappings. |

### JSON snapshots vs joins

`items[]`, vendor invite lists, quote responses, `consents`, and `approval_history` are **JSON columns** on the parent record — denormalised by design for **snapshot integrity** (e.g. an awarded vendor's name is frozen on `app_pos.vendor` even if `app_vendors.vendor_name` later changes).

> The `PUT /me` cascade keeps vendor-name snapshots in sync — see [Vendor rename cascade](#vendor-rename-cascade) under gotchas. Anywhere you add a new place that snapshots a vendor name, update that handler too.

### `ChainEngine` (approval rule resolver)

`app/Services/ChainEngine.php` is the single source of truth for PR / PO / Payment chains. Reads `app_approval_rules` and resolves the chain at runtime:

- `resolve($entity, $context)` — first matching rule by priority.
- `stagesFor($entity, $context)` — resolved stages with `:requester_dept` substituted (skipped when null + `skip_if_dept_null`).
- `initialStage`, `nextStage($current, $entity, $context)`.
- `canActOnStage($user, $stageKey, $entity, $context)` — admin always; else role match + department match if stage is dept-locked.

PR/PO/Payment models append `chain_stages` (resolved chain for THIS record) to their JSON output via `$appends`, so the frontend doesn't need to re-resolve.

### Auto-fulfil semantics

`GrnController::maybeFulfilPo()`:
1. Only counts GRNs with `chain_stage='done'` AND `status != 'rejected'` (a GRN at `pending_pm` does NOT count toward fulfilment).
2. **Damaged units don't count** — `accepted = received - damaged`.
3. PO flips to `fulfilled` when aggregate accepted ≥ ordered across approved GRNs.

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
│   ├── nav/                         Sidebar (audience-driven, hardcoded brand mark per DESIGN.md), Topbar, GlobalSearch
│   ├── auth/                        Button, Field
│   ├── data/                        PageHeader, StatusPill, KpiStatCard, RefreshButton
│   ├── feedback/                    Drawer, Toast (legacy), Loader, Skeleton, ConfirmModal, ErrorBoundary, AssignAuthorModal, ChainStatusModal
│   ├── forms/                       FormKit, ItemPicker (catalog autocomplete)
│   ├── misc/                        AnimatedPage, StaggeredGrid, DocumentPreview, CompanyPicker, TermsTemplatePicker, PrintActions, PrintLetterhead, PrintFooter
│   └── ui/                          Card, EmptyState, KpiCard, ThemeToggle
├── features/                        domain work, one folder per feature
│   ├── auth/                        pages/{Login, ForgotPassword, ResetPassword, Profile} + api.js + store.js
│   ├── onboarding/                  vendor 3-step wizard (account, business, done) — pages/, components/VendorRegShell
│   ├── user-home/                   pages/UserHome.jsx — KPIs, pipeline strip, quick actions, activity feed, approvals queue
│   ├── vendor-home/                 pages/VendorHome.jsx
│   ├── admin-home/                  pages/{AdminHome, UsersList, RolesPermissions, ApprovalRules, Settings}
│   ├── purchase-requests/           pages/{List,Create,Detail} + components/{UpdateStatusModal, AssignAuthorModal, AttachmentsSection} + api.js + store.js
│   ├── purchase-orders/             pages/{List,Create,Detail} + components/{AcceptPOModal, PoDocumentsCard} + api.js + store.js
│   ├── quotations/                  pages/{List,CreateRFQ,Comparison,SubmitQuote} + components/{EditQuoteDrawer, AwardFlowPanel} + api.js + store.js
│   ├── grn/                         pages/{List,Create,Detail} + api.js + store.js
│   ├── finance/                     pages/{InvoicesList,InvoiceApproval,VendorInvoiceUpload}
│   ├── payments/                    pages/{List,Create,Detail} + api.js + store.js
│   ├── masters/                     pages/{Inventory,ItemsList,VendorsList,Categories,Companies,Projects,Departments} + drawers + per-master {api.js, store.js}
│   ├── notifications/               pages/Inbox.jsx + components/{NotificationsDropdown, ProfileMenu} + store.js
│   ├── reports/                     pages/ReportBuilder.jsx + components/{Charts, DateRangeFilter, Reports}
│   ├── approval-rules/              components/RuleDrawer + store.js + api.js
│   ├── vendor-portal/               useVendorIdentity.js + pages/{VendorQuotationRequests, VendorQuotations, VendorPOList, VendorInvoices, VendorApplicationStatus}
│   ├── po-documents/                api.js + store.js
│   └── ui/                          store.js (sidebar collapsed, mobileNavOpen)
├── pages/                           route destinations NOT tied to a feature (Landing, NotFound, PublicInvoice, TermsCondition, Forbidden)
├── hooks/
│   ├── useTheme.jsx
│   ├── useToast.jsx                 global toast context — wrapped by app/providers
│   ├── useCan.js                    useCan("pr.approve") — legacy fallback to data/permissions.js
│   ├── useNotifications.jsx, usePageTitle.js
├── data/                            constants.js, roles.js, permissions.js
├── utils/                           sessionToken.js, rbac.js, format.js (fmtINR, fmtCompactINR, isEmpty, formatDate)
├── assets/, test/, main.jsx, index.css
```

---

## Live route map

```
/                                 → Navigate to /login
/login                            → Login (real /api/login + demo-account quick-login cards)
/forgot-password                  → ForgotPassword
/reset-password/:token?           → ResetPassword
/vendor-login                     → VendorRegistrationPage (login screen)
/vendor-register                  → VendorRegistrationPage (3-step register)
/vendor-registration[/:step]      → redirects to /vendor-register

/app                              → UserHome
/app/purchase-requests[/new, /:id]
/app/purchase-orders[/new, /:id]
/app/quotations[/new, /:id]
/app/grn[/new, /:id]
/app/inventory                    real, derived from GRNs server-side
/app/invoices[/:id/approve]
/app/payments[/new, /:number]
/app/reports
/app/notifications
/app/profile

/vendor                           VendorHome
/vendor/quotation-requests        list (filtered to vendor)
/vendor/quotations                vendor's submitted quotes
/vendor/quotations/submit/:id     submit / revise quote
/vendor/purchase-orders[/:id]     PO list + detail (with scrub)
/vendor/invoices[/upload]         invoice list + upload (creates real app_invoice row)
/vendor/profile, /vendor/application-status, /vendor/notifications

/admin                            AdminHome (Control Center: hero strip + "Needs your attention" + quick configure + system health)
/admin/{purchase-requests,purchase-orders,quotations,grn}[/:id]    reuse same pages
/admin/{inventory,invoices,payments[/:number],items,vendors,categories,companies,projects,departments}    masters (all redesigned to the standard List archetype)
/admin/users                      Users (avatar card-row layout)
/admin/roles                      Roles & Permissions (left rail + permission panel + sticky save bar)
/admin/approvals                  Approval Rules (PR / PO / Payment tabs + sentence-style rule cards)
/admin/settings                   Settings (Company / Branding / Integrations [locked] / Access Control / My Profile)
/admin/reports
/admin/notifications

/403                              Forbidden
```

---

## Theme tokens

> The **canonical design system** is in [`DESIGN.md`](./DESIGN.md). This section is just a quick pointer.

Defined in `src/index.css`:

1. Raw CSS vars on `:root` (light) and `[data-theme="dark"]` (dark) — swap at runtime.
2. `@theme inline` maps them into Tailwind utilities.

### Semantic token names (use these — never hex)

| Group | Tokens |
|---|---|
| Brand (red light / coral dark) | `bg-primary`, `bg-primary-hover`, `bg-primary-soft`, `bg-primary-deep`, `text-primary-foreground` |
| Surfaces | `bg-bg`, `bg-surface`, `bg-surface-alt`, `bg-surface-container`, `bg-surface-container-low`, `bg-surface-container-lowest`, `border-border`, `border-outline-variant` |
| Text | `text-text`, `text-text-muted`, `text-text-subtle` |
| Status | `bg-success` / `bg-success-soft` / `text-success` — same for `warning`, `danger`, `info` |

### Body background

Light: warm bone canvas (`#fafaf7`) with apricot corner-glow gradients (`background-attachment: fixed`).
Dark: near-black (`#0a0a0e`) with warm orange corner bleed.

### `.glass-card`

Translucent surface, backdrop blur, hairline border, layered shadow with apricot bottom-right blush. Light + dark variants tuned independently. Use for dashboard KPI cards, feature cards, master grid items.

### Theme toggle

`hooks/useTheme.jsx` (`ThemeProvider`, `useTheme()`) + reusable button at `components/ui/ThemeToggle.jsx`. Persists to `localStorage["scm-theme"]`, respects `prefers-color-scheme` on first load, sets `data-theme="dark"` on `<html>`.

### Don't retheme the chrome from settings

The Sidebar wordmark **"Suppliers First"** and the Factory icon brand mark are **hardcoded**. The `legal_name` / `logo_path` / `primary_color` in `/admin/settings → Branding` drive **PDFs and emails only** — not the live UI. Branding tab subtitle states this explicitly.

---

## Conventions

### Code organisation

- **Feature-first.** Anything domain-specific (forms, pages, API, store, hooks) lives under `features/<domain>/`. Cross-cutting UI lives in `components/`.
- **Files**: JSX files use `.jsx`. Hooks are `.jsx` if they render JSX, `.js` otherwise.
- **Branding = "Suppliers First"** in user-facing copy. Internal folder/DB names retained (`scm-frontend/`, `meka_scm`, `scm-auth` localStorage key, `App\Models\App*` namespaces).

### Styling

- **Semantic tokens only.** If you're about to write `bg-red-600`, use `bg-primary`. Missing tokens → add to `index.css` and document in `DESIGN.md`.
- **Icons are Lucide.** When converting Stitch designs, map `material-symbols-outlined` glyphs to the nearest Lucide icon.
- **Currency = ₹** (rupees). `$` anywhere is a leftover and should be fixed. Use `fmtINR` and `fmtCompactINR` from `utils/format.js`.
- **Standard page width**: `max-w-6xl` for app pages; `max-w-[1200px]` for wide admin pages; `max-w-[1400px]` for the role-permissions matrix.

### Loading states

Locked rules (per DESIGN.md):

1. **Page / list / dashboard initial fetch** → `<Skeleton>` mirroring real geometry. No layout shift on data arrival.
2. **Submit / save / refresh button** → `Loader2 animate-spin` inside the button.
3. **In-flight detail mutation (e.g. row delete)** → disable the row's actions + spinner replacing the icon.

Never show a centered full-page spinner on a page whose layout is known ahead of time.

### Data layer

- **Stores (Zustand)**: `features/<domain>/store.js`. Convention:
  - state: `items`, `loading`, `error`
  - `fetchAll()` — GET list, set items
  - `create(payload)` — POST, prepend to items, return record
  - domain mutations (e.g. `updateStatus`, `accept`, `award`, `submitQuote`) — PATCH/POST + update item in place via shared `_upsert(number, updated)` helper for deep-link safety
  - `remove(number)` — DELETE + filter items
- **Schema-shape rules (frontend ↔ backend)**:
  - PR/RFQ/PO/GRN items use `name` (required) + `code` / `hsn_code` / `uom` / `qty`. PO additionally needs `rate` and `gst`. NOT `description`/`quantity`/`unit_price`.
  - PR status mutation: `{ action: approve|reject|hold|cancel, comments }`. NOT `{ status }`.
  - RFQ submit: `prices` is a parallel **numeric array** sized to items (server-validated); `gst` is a parallel array of GST percentages.
  - GRN store requires `vendor` field separate from items; per-line `damaged` + `remark` columns.
  - **Login + `/me` responses are FLAT** (`{ user, token }` / `{ id, name, email, role, permissions }`). Every other endpoint wraps in `{ data: ... }`. Convention inconsistency, both sides handle it.

### Forms

Handle submit with `e.preventDefault()`, local `useState` for fields, validation inline. Submit calls the store action (which calls the API) and toasts on success/error.

### Toasts

Always use `useToast()` from `hooks/useToast.jsx`. Never render the legacy `components/feedback/Toast.jsx` directly in new code.

### RBAC pattern (established across PR / RFQ / PO / GRN / Payment)

1. Backend controller has constants or `canX($user)` helpers; for permission-driven gates, prefer `$user->can('foo.bar')` reading from `role_permissions`.
2. Frontend List page imports the same set; hides Create button for non-authorized roles.
3. `features/<domain>/pages/Create.jsx` does a `<Navigate to="/app/<domain>" replace />` role-gate **after all hooks have run** (rules-of-hooks).
4. Backend `index()` scopes the list (creator-only / vendor-only / org-wide) so URL-tampered access shows nothing.

### Key invariants

- **Vendor identity is always derived server-side** from `AppVendor::where('user_id', $user->id)->value('vendor_name')`. Never trust `vendor` name in request body from a vendor-role user.
- **Auto-fulfil chain**: GRN approval triggers PO `status=fulfilled` when accepted ≥ ordered. Damaged units excluded.
- **Deep-link prefill**: Create pages accept `?rfq=QT-…` / `?pr=PR-…` / `?po=PO-…` query params and auto-populate from the source document.
- **Terminal-state guard**: every status-mutating endpoint checks `if (in_array($record->status, [TERMINAL_STATES], true)) abort(409)`.
- **Vendor-response scrub**: vendor-role API responses strip internal evaluator state (`consents`, `chain_stage`, `approval_history`, etc.). Only `rates_locked` / `released` booleans surface.

---

## List page archetype

Every redesigned admin/master page (Users, Departments, Items, Vendors, Categories, Companies) follows the **same archetype**, codified in `DESIGN.md`:

```
[ PageHeader title  subtitle  actions(Refresh, Import?, +Create) ]
[ KpiStatCard × 3–4 — clickable filter buckets ]   ← horizontal scroll on mobile
[ Filter bar (search + secondary dropdown + Clear pill when active) ]
[ Card-row list — icon tile + identity + chips + status + hover actions ]
[ Showing N of M counter ]
```

Per-row anatomy:

```
[ icon-tile ]   [ MONO-CODE  Bold name  optional-chip ]                  [ status pill ]   [ ✏️ ]  [ 🗑️ ]
                 sub-line: meta · meta · meta                                              (hover-reveal)
```

**Conventions** (cross-page):

- KPI tile tones: `info` for total, `success` for healthy state, `neutral` for inactive, `warning` for compliance issue (Missing HSN / Missing GSTIN / Pending), `danger` for failure (Suspended / Rejected).
- Code chip is mono, info-tinted (`bg-info-soft text-info`).
- Whole row clickable to edit; hover-lift with `hover:border-primary hover:shadow-md`.
- Action buttons hover-reveal at `sm+`; full-width on mobile.
- Skeleton (`SkXyzCard`) **mirrors row geometry** for zero layout shift.
- **No `Loader2` for page loads** — always skeleton.
- Empty state uses shared `EmptyState` with role-aware contextual CTA.
- "Showing N of M" footer counter at the bottom.

---

## Common gotchas

### `localhost` vs `127.0.0.1` (Windows + IPv6)

The axios `baseURL` **must** be `http://127.0.0.1:8000/api`, not `http://localhost:8000/api`. On Windows, `localhost` resolves to both IPv6 (`::1`) and IPv4 (`127.0.0.1`) with IPv6 preferred — but `php artisan serve --host=127.0.0.1` only listens on IPv4. Browser waits 1–3 seconds per request for the IPv6 attempt to time out. Hardcoded in `src/api/client.js`.

### Vendor rename cascade

When a vendor renames itself via `PUT /me`, the linked `app_vendors.vendor_name` updates — but vendor names are also **snapshot in JSON columns** across:
- `app_rfqs.vendors[]` (invite list)
- `app_rfqs.responses[].vendor`
- `app_rfqs.awarded_vendor`
- `app_pos.vendor`
- `app_grns.vendor`

The `PUT /me` route handler walks all four tables in a transaction and rewrites the old name. **Don't add a new place that snapshots vendor name without updating that handler.**

### Vendor without AppVendor row

A vendor user with no matching `app_vendors.user_id` row will see empty lists everywhere because vendor-scoped queries find nothing. Always pair via seeder.

### Login throttle

`/api/login` has `throttle:5,1` (5 attempts per minute by IP). Smoke tests sleep 65s between batches. If you're testing manually and locked out, wait 60s. Same throttle on `/api/forgot-password` and `/api/reset-password`.

### `null` leaks in detail pages

Use the centralized `isEmpty()` helper. `formatDate("null")` returns `"—"`, not the literal string `"null"`.

### CORS preflight

Don't set `withCredentials: true` on axios — it triggers an unnecessary CORS preflight. Bearer token does all the auth; cookies are not used.

### Hooks-before-redirect

In any page that role-gates with `<Navigate />`, **all hooks must run before** the conditional return. Otherwise you'll hit the React rules-of-hooks error.

### Two admin UIs writing to one table

`/admin/roles` (Roles & Permissions matrix) and `/admin/settings → Access Control` both write to `role_permissions`. The Settings tab is a thin shortcut that toggles only the `grn.create` rows. Don't add code that writes to `app_company_settings.grn_creator_roles` directly — that column is read-only legacy; the matrix is the source of truth (see `SettingsController::syncGrnCreatePermission`).

### `permissions` array stale on existing sessions

When the role-permissions matrix is changed for a role, users who are already logged in still have the old `permissions` array in their `localStorage["scm-auth"]`. `AuthBootstrap` calls `fetchMe()` on app boot, so a hard refresh fixes it — but a tab that's already open won't auto-refresh. Tell the user to refresh.

### Settings → Branding doesn't retheme the live UI (intentional)

Per `DESIGN.md`, `primary_color` and `logo_path` are **only used for PDFs and email letterheads**. The live app shell (Sidebar wordmark + Factory icon + brand red) is fixed in `index.css`. **Don't add code that overrides `--brand-primary*` from settings at runtime.**

### Integrations tab is locked

`/admin/settings → Integrations` is a read-only roadmap. The transport code (SMTP send, Slack webhook POST, Tally bridge) hasn't been built yet, so the tab shows the planned integrations as static cards with a 🔒 Locked banner. Backend validator still accepts `integrations[].config` for forward-compat. Replace `IntegrationsTab` body with the live UI when transport code lands.

---

## Designs

Google Stitch exports (HTML + inline Tailwind) live in `designs/`.

- `designs/completed/` — login, vendor-reg steps
- `designs/remaining/` — converted to live components; some still reference the original HTML for reference

Stitch uses Material Design token names — `index.css` provides equivalents. Replace `material-symbols-outlined` with Lucide during conversion.

When converting a screen: read the one HTML file, reuse existing components (`AuthLayout`, `Field`, `Button`, `PageHeader`, `StatusPill`, `Drawer`, `Card`, `EmptyState`, `KpiStatCard`, `Skeleton`, etc.). Don't re-read the whole `designs/` folder.

For new admin/master pages, follow the [List page archetype](#list-page-archetype) and the patterns in `DESIGN.md`.
