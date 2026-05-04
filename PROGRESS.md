# SCM — Progress Log

Running changelog of what's been built, session by session, plus the current implementation snapshot. **CLAUDE.md** is the static reference (stack, conventions, routes); this file is the moving picture.

---

## Session — 2026-05-04

Loading-state visual overhaul (spinners → skeletons across the whole app), one interactive dashboard widget, and a deep mobile-responsive pass on the three PR pages.

### ✅ Skeleton loading primitive + rollout

Replaced the centered `<Loader2 animate-spin>` pattern on every data-driven page with theme-aware skeleton placeholders that mirror the real layout, so the page no longer reflows when data arrives.

- **`src/components/feedback/Skeleton.jsx`** (NEW) — minimal primitive: `<Skeleton className="h-4 w-32" />` with `bg-surface-container animate-pulse rounded` base styles. Composition over presets — pass any `className` for sizing/shape.
- **Decision**: keep button-level spinners (`Loader2 animate-spin`) on submit / save / refresh actions where the user is mid-interaction. Skeletons there would feel broken. Skeleton swaps are **page/list/dashboard** loading only.

**Rolled out across 16 surfaces** (each loading state matches its real geometry — card padding, table column widths, KPI tile shape — so there's zero layout shift on data arrival):

| Surface | What's skeletoned |
| --- | --- |
| `/app` UserHome | 3-card hero (token / spend / token), pipeline strip, chart + vendors, activity + approvals — full dashboard skeleton |
| `/admin` AdminHome | 8 KPI tiles (per-store loading), Pending PR Approvals rows, Pending Vendors rows |
| `/vendor` VendorHome | 4 KPI tile values + descriptions, activity feed rows with colored left bar |
| `/app/purchase-requests` | 5 stat cards + 6 row cards |
| `/app/purchase-orders` | 5 stat cards + 6 row cards (incl. amount column on lg+) |
| `/app/quotations` | 5 stat cards + 6 row cards |
| `/app/payments` | 4 money KPI cards + 6 table rows (mobile card variant + desktop row variant) |
| `/app/grn` | Real table header + 6 skeleton rows |
| `/admin/users` | 4 stat cards + 6 table rows (6 cols) |
| `/admin/items` | 6 table rows (8 cols) |
| `/admin/vendors` | 6 table rows (7 cols) |
| `/admin/departments` | 4 stat cards + 6 table rows (7 cols) |
| `/vendor/quotation-requests` | Real table header + 6 skeleton rows (7 cols) |
| `/vendor/quotations` | Real table header + 6 skeleton rows (7 cols) |
| `/vendor/purchase-orders` | 4 KPI cards (now visible during initial load) + table header + 6 skeleton rows |
| `/vendor/invoices` | "Ready to invoice" header + 5 skeleton rows |
| `/vendor/application-status` | Single-card placeholder mirroring approved/pending shape |

**Pattern locked for future pages**: derive `initialLoading = loading && items.length === 0`, render `<SkRow />` array inside the existing `<thead>` / row container. Keep filter bars, tabs, and search interactive while loading — only swap data-driven content.

### ✅ Spend Snapshot dashboard widget — fully interactive

Was a passive visual; now a real drill-in surface. Three interaction modes:

1. **Hover any segment** → it grows + thickens (stroke + 4), other segments dim to 30% opacity, and a tooltip appears above the gauge with the slice label, formatted value (`fmtCompact` ₹ for POs, `N RFQs` for the awarded-but-unconverted slice), and percentage of total.
2. **Click any segment or legend chip** → `useNavigate` to `/app/purchase-orders` for the PO-tier slices (pending / accepted / rejected / fulfilled), or `/app/quotations` for the awarded-RFQ "Open" slice.
3. **Legend strip** below the gauge replaces the hardcoded "+7.52% More than last week" text with five color-coded clickable chips. Hovering a chip cross-highlights the matching gauge segment (and vice versa).

**`RainbowGauge`** signature extended: now accepts `activeKey`, `onSliceEnter`, `onSliceLeave`, `onSliceClick`. Each segment path gains `cursor: pointer`, `onMouseEnter/Leave`, `onClick`, and animates `stroke-width` / `opacity` on hover. Non-interactive call sites (none currently, but the prop is optional) stay rendering the same as before.

**Dropped `betterPct: 7.52`** hardcoded constant from the `balance` memo. The dashboard now has **zero** hardcoded values — every visible number comes from the four Zustand stores.

### ✅ PR pages — comprehensive mobile-responsive pass

User reported the three PR pages weren't properly responsive on mobile. Did a full pass across all three.

**`pages/List.jsx`**:
- Page-level `space-y-6` → `space-y-4 sm:space-y-6`
- H1 down to `20px` on phones (was 22px → 28px); subtitle "Track and approve…" hidden on mobile
- "New Purchase Request" button hidden on mobile — the bottom-right FAB already handles creation
- PR rows: `pl-4 pr-3 py-4` → `pl-3 pr-3 py-3 sm:pl-5 sm:pr-4 sm:py-4`; icon avatar 40px on mobile (44px on sm+)
- PR row PR# in `text-[12px]` on mobile (was 13); date moved into the meta line on phones (single-line PR#, multi-info on second/third row)
- Title font `text-[13px] sm:text-[14px]`; status column drops fixed `min-w-[120px]` on mobile
- Sub-text below status pill (Cancelled/Rejected/Awaiting…) hidden on mobile — pill is enough
- Inline more-actions button hidden on mobile (was opacity-0 + hover-reveal anyway)
- Same compact treatment applied to the Drafts card (saved-time text moved into meta line on mobile, "Tap to resume" hint hidden)

**`pages/Create.jsx`**:
- Header now stacks vertically on mobile: title above the "Draft saved" pill (`flex-col sm:flex-row`)
- Title `text-[20px] sm:text-[28px]` (was 24); back-link margin tightened
- Restore-banner buttons (Dismiss / Discard draft) stretch full-width with `py-2` for 44px touch targets on mobile
- Main grid gap `gap-4 sm:gap-6`; inner column `space-y-4 sm:space-y-5`
- `SectionHeader` tightened to `mb-4 sm:mb-5 gap-2 sm:gap-3`; title truncates so an action button doesn't push it
- Items section: count text "X lines · Y qty" hidden on mobile, **Add Item** button stays `whitespace-nowrap`
- Per-item card padding `p-4` → `p-3 sm:p-4`

**`pages/Detail.jsx`**:
- Breadcrumb shortens "Purchase Requests" → "PRs" on mobile, with `text-[11px] sm:text-[12px]`
- Hero card: `mb-4 sm:mb-6`, `p-3 sm:p-6`, gap `gap-3 sm:gap-6`
- PR# h1 `text-[20px] sm:text-[28px]` (was 24); title text `text-[13px] sm:text-[14px]`
- Facts strip gaps tightened (`gap-x-3 gap-y-2.5`)
- **`ApprovalSummary`** chain (HOD/CFO/CEO chips): now `overflow-x-auto` so it scrolls if it overflows on narrow phones; "Approvals:" label hidden on mobile (each chip already labels itself); chip gap `gap-1.5 sm:gap-2`
- Action bar `px-3 sm:px-6`; main content grid `gap-4 sm:gap-6`; right sidebar `space-y-4 sm:space-y-6`
- Request Details + Items sections drop to `p-3 sm:p-6`; meta-grid gap-y `gap-y-4 sm:gap-y-6`
- **`ApprovalTree` step layout** rewritten for mobile: full role title ("Head of Department") hidden inline on mobile and rendered as a second line below "HOD" instead — keeps the "In Review" badge from getting squished. Step gap `gap-3 sm:gap-4`, between-step `pb-5 sm:pb-6`
- `RequesterStatusPanel` padding `p-4 sm:p-6`, heading `text-base sm:text-lg`, inner card `p-4 sm:p-5 gap-3 sm:gap-4`

Viewport meta tag (`width=device-width, initial-scale=1.0`) confirmed already in `index.html`.

---

## Session — 2026-05-02

Polish + onboarding-flow split day. Mostly small surgical changes to vendor onboarding, plus two architectural conversations (multi-tenancy, fine-grained RBAC) that were scoped but **not** implemented yet.

### ✅ Vendor login & registration on separate routes

Previously a single `/vendor-registration` route handled both screens via internal state. Split into two real URLs so the address bar reflects the user's intent and links can deep-link straight to either screen.

- `routes.jsx` — added `/vendor-login` and `/vendor-register`. Legacy `/vendor-registration` and `/vendor-registration/:step` now redirect to `/vendor-register` so old links still work.
- `VendorRegistrationPage.jsx` — initial `screen` state derived from `useLocation().pathname` (`/vendor-login` → "login", anything else → "register"). The in-page "Sign in" / "Create account" links now also call `navigate()` so the URL stays in sync.
- `reset()` and the email-already-registered branch both navigate to `/vendor-login` after `setScreen("login")`.
- `Login.jsx` (the internal-user login page) — "Register as Vendor" button now points at `/vendor-register`.

### ✅ Vendor onboarding SidePanel rebalance

User flagged the left panel as "very bad — not even properly placed": brand glued to the top, tagline glued to the bottom, gigantic void in the middle (`justify-between` with only two children).

Rebuilt as a proper editorial three-zone layout:

- **Top**: brand mark
- **Middle (vertically centered)**: small red `VENDOR PORTAL` eyebrow → bold display headline `Built on tide & steel.` (was previously a separate italic line, promoted to the H1) → italic supporting line `Become a Meka Group vendor.` → 45-year paragraph → 3-step "what to expect" list with small numbered red dots (`Verify in minutes` / `Tell us about your business` / `Start receiving RFQs once approved`)
- **Bottom**: hairline rule + `MEKA GROUP` wordmark + `procurement@meka.in` contact

Restrained red — only the eyebrow and tiny step numerals carry the accent. Matches the dashboard / PR aesthetic.

### ✅ Onboarding page — desktop fits viewport, mobile scrolls naturally

Followed up with two layout requests on `Page` (the shared shell for register/login/otp/details):

1. "Remove the scrollbar" — outer container changed to `lg:h-screen lg:overflow-hidden` so desktop is clamped to one viewport, with the right column scrolling internally only if needed (`lg:overflow-y-auto`). Tightened vertical rhythm (`py-6 sm:py-8`, `mt-6` instead of `mt-8`, slightly smaller H1) so the form fits comfortably.
2. "Mobile is bad — make it responsive without changing UI" — switched outer container to `min-h-screen lg:h-screen lg:overflow-hidden` and main padding to `py-8 sm:py-10 lg:py-8`. On mobile the page grows naturally with content (no fixed-height clipping); on desktop the no-scrollbar behavior is preserved.

### 💬 Architectural conversations (no code yet)

Two design discussions that we explicitly deferred to later sessions:

- **Vendor data model** — confirmed the current hybrid (one `users` table for identity + `app_vendors` for business profile, joined via `app_vendors.user_id`) is the right answer. Not merging vendors into `users`, not splitting auth out either.
- **Multi-tenancy / super-admin** — sketched the row-level tenancy approach (a `tenants` table, `tenant_id` FK on every customer-scoped table, a `super_admin` role with its own `/super-admin` console for managing tenants/billing/feature flags, while existing `admin` becomes the per-tenant company admin). Real refactor cost — touches every controller, every seeder, the auth flow. **Set aside for later.**
- **Fine-grained RBAC (admin-editable permissions)** — sketched phase 1: migrate `src/data/permissions.js` into three DB tables (`permissions`, `roles`, `role_permissions`), swap every `in_array($role, BACKOFFICE_ROLES)` check for `$user->can('pr.approve')`, ship the existing `/admin/roles` page as a real matrix UI. Phase 2 adds scope qualifiers (own/dept/all), phase 3 adds per-user overrides. **Stopped before implementation — to be picked up next session.**

---

## Session — 2026-05-01

Big visual-polish + features day. Several rounds of "make it look better" feedback shaped the final designs.

### ✅ Dashboards — UserHome / AdminHome / VendorHome

- **Hero header card** — initially built as a red primary→primary-deep gradient banner with avatar/name/role; user pushed back ("don't use harsh colors, no red banner") so swapped to a neutral `bg-surface-container-lowest border` card with a primary-soft icon tile for the avatar/initial. Date pill is a soft surface chip; role pill uses muted `bg-primary-soft`.
- **KPI cards** — colored top accent bar (4px h-1, status-toned), `shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200`, ArrowRight reveal on hover. Pulled the same hover-lift into the shared `components/ui/KpiCard.jsx`.
- **Procurement Pipeline strip** (UserHome only) — new horizontal widget showing PRs / RFQs / POs / GRNs counts + pending alert per stage. Mirrors KPI style with chevron-on-hover.
- **Quick Actions** — replaced solid red buttons with icon-card rows that highlight with primary border + soft tint on hover.
- **AdminHome dark slate gradient banner** also removed in the same "no harsh colors" pass; replaced with the same neutral card.

### ✅ Activity feed redesign (UserHome + VendorHome)

Old vertical timeline (left rail with bare circle ringed icons) → modern row-based feed:

- Each event is a full-width clickable row linking to the document
- 4 px colored left bar (status tone)
- 40 × 40 rounded-xl icon tile with colored background
- **Doc-type chip** (`PR` / `RFQ` / `PO` / `GRN`) extracted from the ref — coloured by type
- Action verb cleaned (prefix stripped since chip carries it)
- Time right-aligned, ChevronRight on hover

### ✅ Sidebar + Topbar — three iterations before landing

Cycled through designs based on feedback:

1. **Red gradient header sidebar** + user mini-card → user said "don't keep employee info in sidebar and topbar both, and don't use black theme"
2. **Always-dark slate sidebar** (`#0f172a`) → ditto, "don't use dark"
3. **Final**: light themed sidebar respecting `bg-surface` (no user info anywhere), clean topbar carries the user identity

**Sidebar**:
- `bg-surface border-r border-border` (theme-respecting)
- Brand strip aligned with topbar height (`h-14`): primary-coloured Factory icon tile + "Meka SCM" wordmark
- NavItems: `bg-primary-soft text-primary font-semibold` rounded-lg active state (no left border, no full red fill)
- Section labels with horizontal rule
- No user info — sidebar is pure navigation

**Topbar**:
- 56 px tall (`h-14`), removed the redundant Dashboard/Reports tabs
- Left: hamburger (mobile) + dynamically-derived **page title** from `useLocation` (e.g. `/app/purchase-orders` → "Purchase Orders")
- Center: compact search bar with focus border highlight
- Right: theme toggle + notifications dot + name/role/avatar cluster (only place user identity appears)
- Avatar shows uploaded profile picture if present, otherwise initials

### ✅ List page parity — Quotations + PO list now mirror PR list

Replaced the `<PageHeader>` + `<table>` pattern with the PR list's full design:

- 5 StatCard tiles with click-to-filter and active ring (Total + 4 statuses, horizontal-scroll on mobile)
- `FilterBar` panel with search + date-range select + "More filters" placeholder
- Custom row-card layout with **colored left strip** (status-tinted), mobile-card / desktop-row split
- Inline `StatusPill` component (icon + label) replacing generic `StatusPill` from data/
- "Showing X of Y" footer count
- Mobile FAB for create (canWrite gated)

PO-specific adaptations: 5-tone palette (warning/info/success/danger), active-spend banner above the filter bar, Amount column with `fmtINR` formatting, "Vendor · BU" + "Amount · Source PR" columns.

### ✅ Profile page (`/app/profile`) — redesign + responsiveness

- **Bug fix**: `<Field>` component referenced at lines 337/345 was undefined (should have been `<VendorField>`) — would crash for vendor users. Fixed.
- **Two-pane settings layout** at `xl+`: sticky 300px profile summary card on the left + stacked Account / Security / (Business Details for vendors) sections on the right
- Below `xl`: stacks single-column inside `max-w-5xl`
- **Mobile fixes**: section padding `p-6` → `p-4 sm:p-6`, grid breakpoints `md:` → `sm:`, buttons stack with `w-full sm:w-auto`, vendor card heading uses `flex-wrap` so the status badge can wrap
- **SectionHeading** component extracted with primary-soft icon tile, title + subtitle, optional trailing slot (Show/Hide on Security, status badge on Business)
- Initially had a red gradient strip header on the summary card; user requested no harsh colors → replaced with clean card layout

### ✅ Profile picture upload — end-to-end

**Backend** (`2026_05_01_500000_add_avatar_path_to_users_table.php`):
- New `avatar_path` nullable string column on users
- `php artisan storage:link` ran — files at `storage/app/public/avatars/*` web-accessible at `/storage/avatars/*`
- New helper `scm_user_payload()` in `routes/api.php` — single source of truth for user JSON shape (used by `/login`, `/me`, `PUT /me`, both avatar routes)
- `POST /api/me/avatar` — multipart upload, validates `image|mimes:jpg,jpeg,png,webp|max:2048`, deletes old file before saving new
- `DELETE /api/me/avatar` — removes file + clears `avatar_path`
- Both return updated user with `avatar_url`

**Frontend**:
- `authApi.uploadAvatar(file)` + `authApi.removeAvatar()` in `features/auth/api.js`
- Profile summary card avatar tile is now an interactive button — click to open native file picker, hover shows `Camera` overlay, spinner during upload
- Client-side validation: 2 MB max, type allowlist (`jpg/png/webp`)
- Show uploaded photo via `<img>` if `avatar_url` exists, fallback to initial letter
- Topbar avatar circle in top-right also renders the photo

### ✅ Hover-float propagated to interactive cards across the app

`shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200` now applied uniformly to:

- Dashboard KPI cards (UserHome / AdminHome / VendorHome) ✓ already had it
- **5 StatCard tiles** on PR / Quotations / PO / Payments list pages (was `hover:shadow-sm`)
- **Master card grids** in Projects.jsx and Companies.jsx (was just `hover:border-primary`)
- Shared `components/ui/KpiCard.jsx`

List page **rows** intentionally kept with `hover:bg-surface-container-low` (not lift) — lifting rows in a dense list would feel jarring.

### ✅ PR document upload — full feature, end-to-end

The "Coming soon" attachments placeholder on Create PR is now wired.

**Backend** (mirrors `PoDocumentController` architecture for portability):
- Migration `2026_05_01_600000_create_app_pr_documents_table.php`
- `App\Models\AppPrDocument` — exposes `download_url` and `uploaded_at`, hides raw `file_path`
- `Api\PrDocumentController` with PR-specific permissions:
  - View: any in-org user (vendors blocked — PRs are pre-RFQ)
  - Upload: admin, requester (while PR non-terminal), or back-office
  - Delete: admin or original uploader only
- 5 routes: `GET/POST /pr-documents`, `GET/DELETE /pr-documents/{id}`, `GET /pr-documents/{id}/download`
- Files on **private** local disk under `storage/app/private/pr-documents/{pr_number}/...`
- Validation: `pdf,jpg,jpeg,png,doc,docx,xls,xlsx,csv` up to 10 MB

**Frontend**:
- `prDocumentsApi` (`features/purchase-requests/documents/api.js`) with `list / upload / download / remove`
- Real **dropzone** in Create PR — drag-drop + click-to-pick, multi-file, dedupe by name+size
- Client-side validation with toast errors per rejected file
- File list shows type-aware icon (image / spreadsheet / generic), original name, size, MIME subtype, remove button
- **Submit flow**: POST `/prs` first → for each File POST `/pr-documents` with the new `pr_number` → toast reflects exact result ("submitted with N attachments" / "M of N uploaded, K failed")
- Right-rail summary card now shows attachments count

### ✅ Vendor registration — radical simplification + UI redesign

Was 6 steps (Vendor Info / References / Bank / Statutory / Business / Status) — overwhelming. Reduced to **3 focused steps** with optional fields (bank, references, certificates, business profile) deferred to "fill from your profile after sign-in".

**Step structure** (`VENDOR_REG_STEPS = ["Account", "Business", "Done"]`):

1. **Account** — Company name, work email, password (with strength meter + confirm). 4 fields, one screen.
2. **Business** — Contact name, phone, GST, PAN, full address. **All required** with regex validation (GST = 15 alphanumeric, PAN = `ABCDE1234F` pattern).
3. **Done** — Success page with summary card + "you can sign in now" hint.

User initially said "all fields are important" → added `validateStep2()` to the store + field-level error surfacing in Step 2 component (red border + AlertCircle icon + danger text per field). Submit gated until all pass.

**Visual redesign** (after "make it look better as UI/UX"):
- **Split-screen layout** at `lg+`: 420 px sticky brand panel on the left + form column on the right
- Brand panel: logo + "Become a verified supplier" headline + value props + **vertical step indicator** (connected line, 8×8 numbered circles, label + 1-line desc per step) + sign-in link + theme toggle pinned at bottom
- Mobile: compact top header + horizontal stepper with active label below
- **Inputs**: `rounded-xl` with icons inside (left-4), `focus:ring-primary/15` softer focus, `bg-bg` on `bg-surface-container-low` cards for subtle depth
- **Section cards** group related fields with primary-soft icon tile + title + subtitle
- Inline action bar at the bottom (no fixed footer): "Step X of 3" + Back/Continue buttons with arrow icons
- Step 3 success uses `bg-success-soft` rounded-2xl tile + Sparkles overlay top-right

Old step files (`Step1VendorInfo.jsx` … `Step6Status.jsx`) left on disk but unused — can be deleted.

### ✅ List page hover/responsiveness polish — small fixes

- All StatCards on the four list pages (PR / RFQ / PO / Payments) now match the dashboard KPI hover float
- Master card grids (Projects, Companies) lifted on hover

---

## Session — 2026-04-30

### ✅ Theme palette — fixed cool/warm hue clash in light mode

Surfaces were cool-blue (`#f9f9ff`, `#f1f3ff`, `#e9edff`) but `--text-muted` and `--text-subtle` were warm **brown** (`#5c403c`, `#916f6b`) — readable but visibly mismatched, especially on the sidebar where the blue tint was strongest. Replaced text greys with Tailwind's cool **slate** scale so everything sits on one tonal axis.

`src/index.css` light theme:
- `--text-muted`: `#5c403c` brown → `#64748b` slate-500
- `--text-subtle`: `#916f6b` brown → `#94a3b8` slate-400
- `--surface-outline-variant`: `#e6bdb8` warm-pink → `#c7cee0` cool-grey
- Surface blues kept verbatim (`#f1f3ff` sidebar etc.) — those were intentional and the user wanted them back.

Dark theme already used neutral greys — untouched.

### ✅ PR Detail (`/app/purchase-requests/:number`) — small UX polish

Two informational additions, one bug fix. No layout/structure changes.

- **Status chip gains an icon** — `Clock` for pending, `CheckCircle2` for approved, `XCircle` for rejected/cancelled. Recognition at a glance; no chrome.
- **"Created N days ago"** pill next to the status chip. Helps approvers see how long a PR has been waiting.
- **Bug fix**: `STATUS_TONE.pending` was using `bg-info-soft` (blue) — wrong, pending should be amber. Now `bg-warning-soft text-warning border-warning/30`.
- New `daysSince(value)` helper local to `Detail.jsx`.

> An earlier pass added gradient heros, dot-pattern overlays, rainbow accent strips, pulsing "Live" indicators, an SVG circular progress ring, and per-section accent colours. Rolled back — it read as decoration without information.

### ✅ CLAUDE.md — added "Quick start" section at the top

Server-start commands were buried under "Local setup & commands". Hoisted a copy-paste-ready block to the top of CLAUDE.md so future sessions can boot the stack in one read instead of rediscovering paths each time:
- Backend: `cd "C:/.../backupmeka" && C:/xampp/php/php.exe artisan serve --host=127.0.0.1 --port=8000` (run in background; verify with `curl /api/me` → 401 = up)
- Frontend: `npm run dev` (from `scm-frontend/`, run in background)
- MySQL ping/start commands
- Smoke test commands

### ✅ Permissions — wider allow scope for the parent `backupmeka` folder

`scm-frontend/.claude/settings.local.json` — added `Read/Edit/Write` allow rules for `C:\Users\ujjwa\OneDrive\Desktop\Ujjwal\Work\SCM\backupmeka\**` (both backslash and forward-slash variants for Windows path-matching) plus an `additionalDirectories` entry, so file operations across both the React frontend and the Laravel backend skip the prompt.



Previously a single `PROC` department covered both strategic sourcing and tactical PO issuance. Real org structure separates them — split now reflected in the data:

- **`PROC` — Procurement** (strategic): RFQs, vendor management, contracts. HOD = Marcus Torres (`marcus@meka.in`).
- **`PURCH` — Purchase** (tactical, NEW): PO issuance, order tracking, day-to-day spend. HOD = `purchase.hod@scm.com`.

**Changes**:
- `DemoDepartmentsSeeder` adds `PURCH` ("Purchase") with description "Tactical buying — PO issuance, order tracking, day-to-day spend". `PROC` description sharpened to "Strategic sourcing — RFQs, vendor management, contracts".
- `DemoUsersSeeder`:
  - New account `purchase.hod@scm.com` → role=hod, dept=PURCH (Purchase HOD).
  - `purchase@scm.com` (the purchase officer) moved from PROC → PURCH (where it semantically belongs).
  - Marcus stays at PROC as the Procurement HOD.
- `formatUserRole()` (`src/data/roles.js`) extended: Purchase Officer in PURCH renders as "Purchase Officer" (or "Purchase" short); Purchase Officer in PROC still renders as "Procurement Officer".

**Demo accounts** — four distinct HODs by department, all four pillars of the consensus flow are now login-able:

| Email | Department | Role |
| --- | --- | --- |
| `marcus@meka.in` | PROC (Procurement) | HOD |
| `purchase.hod@scm.com` | PURCH (Purchase) | HOD |
| `finance.hod@scm.com` | FIN (Finance) | HOD |
| `hod@scm.com` | IT | HOD |

**Verified by curl** — `POST /api/login` for `purchase.hod@scm.com` returns `{ "department": { "code": "PURCH", "name": "Purchase" } }`.

### ✅ RFQ create/delete now allows Procurement + Purchase HODs (department-aware)

Earlier the gate was a flat `["admin","purchase_officer"]` allowlist — too narrow for the new department model. **Procurement HOD** (Marcus) and **Purchase HOD** (`purchase.hod@scm.com`) couldn't create RFQs even though they own the sourcing function. IT HOD or Finance HOD still can't (correct).

**Backend** (`RfqController`):
- Replaced the `WRITE_ROLES` constant with a `canWriteRfq($user)` helper. Allows:
  - `role === 'admin'`
  - `role === 'purchase_officer'`
  - `role === 'hod'` AND `department.code` ∈ `['PROC', 'PURCH']`
- `loadMissing('department')` so the check works whether the user was loaded with the relation or not.
- 403 message updated to "Only the Procurement / Purchase department can issue an RFQ."

**Frontend** — same shape mirrored in `List.jsx`, `CreateRFQ.jsx`, and `Comparison.jsx` (Delete button).

**Smoke verified** by curl:
| Login | Create RFQ | Status |
| --- | --- | --- |
| `purchase.hod@scm.com` (Purchase HOD) | ✅ | 201 |
| `marcus@meka.in` (Procurement HOD) | ✅ | 201 |
| `hod@scm.com` (IT HOD) | ❌ | 403 |

### ✅ Award flow — three-party consensus + CFO/CEO approval + gated award (FLOW.md §3 fully implemented)

This was the marquee feature from FLOW.md. The award is no longer a single-click for any backoffice role — it's gated by a 3-HOD consensus and a CFO → CEO approval chain, with the final award button only firing on the Purchase HOD's screen.

**Schema** — migration `2026_04_29_140000_add_consensus_chain_to_app_rfqs.php`:
- `app_rfqs.chain_stage` (string, default `open`) — tracks the RFQ's lifecycle through `open → compared → consensus → cfo → ceo → done`.
- `app_rfqs.consents` (JSON nullable) — holds each HOD's vote and the agreed vendor:
  ```
  { respective_dept_code: "ENG",
    respective: { user_id, user_name, dept_code, vendor, at } | null,
    finance:    { … } | null,
    purchase:   { … } | null,
    agreed_vendor: "Acme" | null,
    approval_history: [ { stage, action, by_user_id, by_user_name, by_role, comment, at }, … ] }
  ```

**Backend** (`RfqController`):
- `store()` now resolves the linked PR's department → seeds `consents.respective_dept_code`. RFQ starts at `chain_stage='open'`; advances to `'consensus'` when the first vendor response arrives.
- New `agree(Request, $number)` endpoint — `POST /rfqs/{n}/agree { vendor }`. Caller must be `role='hod'`; their `department.code` decides which slot(s) they fill (`PURCH/PROC` → purchase, `FIN` → finance, code matching `respective_dept_code` → respective). Same user can fill multiple slots in one vote (e.g. originating dept IS Finance). When all required slots agree on the same vendor, `agreed_vendor` is set and `chain_stage` advances to `'cfo'`.
- New `withdrawAgreement(Request, $number)` — clears the caller's vote(s) and rolls `chain_stage` back to `'consensus'`.
- New `updateStatus(Request, $number)` — `POST /rfqs/{n}/status { action: approve|hold|reject, comments }`. Mirrors PR's chain. Approve advances `cfo → ceo → done`; hold/reject sends back to consensus and clears the agreed vendor.
- `award()` now requires `chain_stage === 'done'` AND user is **Purchase HOD** (`role='hod' AND department.code='PURCH'`) or admin. Vendor must match `consents.agreed_vendor` unless admin override.
- New routes in `routes/api.php`: `/agree`, `/withdraw-agreement`, `/status`.

**Frontend**:
- `src/features/quotations/api.js` + `store.js` — `agree`, `withdrawAgreement`, `updateStatus` actions.
- `src/features/quotations/components/AwardFlowPanel.jsx` (NEW) — sticky sidebar that lives next to the vendor cards. Shows:
  - **Phase 1 — Consensus**: 3 HOD slots (Respective / Finance / Purchase), each filled with the voter's name + vendor when they vote. Eligible HODs see a "Cast Your Vote" button that opens a vendor picker; once they've voted they get Change / Withdraw controls. "All three agree on X" success banner when consensus is reached.
  - **Phase 2 — Financial Approval**: stepper rows for CFO Review and CEO Review with per-stage state (Approved / In Review / Waiting). The user whose role matches the active stage sees Approve / Hold / Reject buttons inline. Hold/Reject prompts for a comment.
  - **Phase 3 — Award unlock**: green "Award button unlocked" indicator once `chain_stage='done'`.
  - **History accordion**: full append-only audit trail of every vote and approval action with author + timestamp + comment.
- `src/features/quotations/pages/Comparison.jsx`:
  - 2-column layout — main column is the existing vendor cards, sidebar is `AwardFlowPanel`.
  - Vendor card "Award" button now requires (`chain_stage='done'` AND user is Purchase HOD) AND it's the agreed vendor. Other vendors show an "Awaiting Purchase HOD" italic note when they're the consensus pick but the user isn't the firer.

**End-to-end smoke verified** via Laravel bootstrap (a real PR/RFQ created, three HOD votes, CFO + CEO approve, IT HOD blocked from awarding, Purchase HOD awards):
```
1) PR created: PR-SMOKE-…
2) RFQ created: QT-SMOKE-… stage=consensus
3) IT HOD votes Acme — slots=["respective"] stage=consensus
4) Finance HOD votes Acme — slots=["finance"] stage=consensus
5) Purchase HOD votes Acme — slots=["purchase"] stage=cfo agreed=Acme Industries
6) After consensus, RFQ chain_stage=cfo
7) CFO approves → stage=ceo
8) CEO approves → stage=done
9) IT HOD tries award → 403 not Purchase HOD
10) Purchase HOD awards Acme → status=awarded
```

### 🐞 Award flow bug-bash — 6 issues found & fixed

After the initial implementation, ran a 13-case smoke test and found 3 backend + 3 frontend bugs:

**Backend (`RfqController::updateStatus`)**:
1. **Hold rolled chain back to consensus** — CFO clicks "Hold" → chain_stage became `consensus` instead of staying at `cfo`. Forced HODs to re-vote, defeated the point of "hold".
2. **Hold cleared `agreed_vendor`** — same root cause; held RFQ lost its consensus state.
3. **Reject didn't terminate** — CFO/CEO reject also rolled back to consensus instead of closing the RFQ.

**Fix**: split hold and reject semantics. **Hold** is now a no-op on chain_stage (stays at the current stage so the same approver can come back and approve/reject). **Reject** sets `status='closed'` (terminal) so further votes/actions return 409.

**Frontend (`AwardFlowPanel::ApprovalRow`)**:

4. **No "On Hold" visual indicator** — held stages just showed an italic comment with no badge; users couldn't tell hold from approved at a glance.
5. **Action buttons stayed visible after RFQ closed** — clicking them returned 409, but UX confused users.
6. **Admin couldn't act on stages** — `myTurn = user.role === stage` blocked admin even though backend allows admin override.

**Fix**: new `state` enum on the row (approved / rejected / hold / active / waiting), distinct icon backgrounds, "ON HOLD" prefix on the comment chip, action buttons hidden when `rfq.status` is closed/awarded, admin can act on any active/hold stage. Stage banner now reflects `Awarded` / `Rejected / Closed` instead of misleading "Awaiting CFO".

**13/13 smoke tests passing** after the fixes:
- Disagreement + vote-change consensus
- CFO hold preserves stage + agreed_vendor
- CFO can re-decide after hold (approve advances normally)
- No comment leak (hold comment stays at hold's stage)
- CEO hold + approve mirrors CFO
- Award gates: only Purchase HOD, only after `done`, only the agreed vendor
- Reject is terminal → blocks further voting/action
- Withdraw rolls back to consensus + clears agreed_vendor
- Non-HOD voters get 403, wrong-dept HODs get 403

### 🐞 Frontend follow-up bugs — store upsert, gate simplification, onChange sync

User reported "the chain of CFO and CEO doesn't start after all three HODs agree". Backend was correct (verified via real HTTP smoke), but the frontend wasn't reflecting the new state on deep-linked detail pages. Three issues:

1. **Store actions silently no-op'd on deep-linked RFQs.** `agree`, `withdrawAgreement`, and `updateStatus` did `s.items.map((r) => r.number === number ? updated : r)` — but if the RFQ was loaded via `rfqApi.get` (deep link, not from list), it wasn't in `items`, so `.map` was a no-op. The page kept reading stale `fetched` state.
   - **Fix**: shared `_upsert(number, updated)` helper that prepends to `items` when the RFQ isn't already cached. All three actions go through it now.

2. **Hold-state derivation could hide the action buttons.** `canActHere` was gated by a derived `state === 'active' || state === 'hold'`. If `lastEntry?.action` was anything unexpected, state could fall through to `'waiting'` and the buttons would silently disappear.
   - **Fix**: simplified to `current === stage` (direct chain_stage check). As long as the RFQ isn't closed and the chain is currently AT this stage, the buttons render. State is still derived for the visual badge but no longer gates interactivity.

3. **Belt-and-suspenders sync for `fetched`.** Even with the store fix, if Zustand's selector somehow lagged, the page's local `fetched` state could be stale. Added an `onChange` callback wired from `Comparison.jsx` (`setFetched`) → `AwardFlowPanel` → `ConsensusPhase`. After every vote / withdraw / status action, the parent's `fetched` is updated directly with the API response, guaranteeing fresh state on the next render regardless of cache behavior.

**End-to-end verified** with real HTTP smoke (10-step flow): create PR → create RFQ → vendor submits → 3 HODs vote → CFO approves → CEO approves → Purchase HOD awards. Every transition correct, every UI state correct after browser hard-refresh.

### ✅ PO creation widened to Purchase/Procurement HODs

Same hangover as the earlier RFQ gate. `PoController::WRITE_ROLES = ['admin', 'purchase_officer']` was a flat allowlist that locked out the **Purchase HOD** (`role=hod, dept.code=PURCH`) — the very person who heads the Purchase department. The "Create PO →" CTA on awarded RFQs showed "Awaiting PO from the purchase officer" instead of letting the HOD act.

**Backend** (`app/Http/Controllers/Api/PoController.php`):
- New `canWritePo($user)` helper (mirrors `RfqController::canWriteRfq`):
  - `role='admin'` ✓
  - `role='purchase_officer'` ✓
  - `role='hod' AND department.code ∈ ['PURCH', 'PROC']` ✓ (NEW)
  - everyone else → 403
- 403 message updated to "Only the Purchase department (officer or HOD) can issue a PO."

**Frontend** — same gate mirrored in three files:
- `src/features/purchase-orders/pages/List.jsx` — "+ New PO" button gate via `canWritePo(user)`
- `src/features/purchase-orders/pages/Create.jsx` — redirect gate widened
- `src/features/quotations/pages/Comparison.jsx` — `canCreatePO` prop on the awarded-RFQ banner now includes Purchase / Procurement HOD

**Verified by smoke**:
| Login | PO create | Status |
| --- | --- | --- |
| `admin@scm.com` | ✓ | 201 |
| `purchase@scm.com` (purchase_officer) | ✓ | 201 |
| `purchase.hod@scm.com` (Purchase HOD) | ✓ | 201 (was 403) |
| `marcus@meka.in` (Procurement HOD) | ✓ | 201 (was 403) |
| `hod@scm.com` (IT HOD) | ❌ | 403 |
| `finance.hod@scm.com` (Finance HOD) | ❌ | 403 |
| `cfo@scm.com` / `manager@scm.com` / `employee@scm.com` | ❌ | 403 |

### ✅ Mobile responsiveness — sidebar, topbar, layouts, PR pages

Off-canvas drawer pattern instead of the broken "always-on" sidebar that ate half the mobile viewport.

**`features/ui/store.js`** — added `mobileNavOpen` (transient, not persisted via `partialize`) plus `openMobileNav` / `closeMobileNav` / `toggleMobileNav`.

**`components/nav/Sidebar.jsx`** — fully reworked:
- On `<md`, fixed off-canvas drawer that slides in via `translate-x` with a dimmed backdrop (tap to close).
- Auto-closes on route change (`useLocation` effect).
- Body scroll locked while open.
- Close button (mirrors topbar hamburger).
- Desktop behavior (collapse-to-`w-16`) untouched.

**`components/nav/Topbar.jsx`** — added `Menu` hamburger (mobile-only) wired to `openMobileNav`. Tightened spacing (`px-3 sm:px-4 md:px-6`); Help icon hidden under `sm`.

**Layouts** (`UserLayout`, `AdminLayout`, `VendorLayout`) — `p-6 md:p-8` → `p-4 sm:p-6 md:p-8`.

**PR pages — proper mobile-app polish (second pass)**:
- **List**: refresh + export collapse to icon-only on mobile; "New PR" moves to a **floating action button** (bottom-right). KPI strip becomes a horizontal-scroll snap row of compact cards. Rows render as full-tap cards with status pill, requester, dept, date, approval badges, and trailing chevron — no horizontal scroll.
- **Create**: `inputCls` bumped to `py-3` on mobile (44px touch target). Right summary sidebar hidden on mobile (the sticky bottom bar already conveys readiness). `Card` component padding made responsive globally (`p-4 sm:p-6`).
- **Detail**: items table replaced with **mobile cards** (item + code/HSN + qty/UOM, expandable specs via `<details>`). Hero quick-facts strip is a 2-col grid on mobile, free-flowing on `sm+`. Action bar: Print/PDF/Email become icon-only on mobile; **Update Status button** stretches full-width and stacks below.

### ✅ Demo email convention — `<role>.<dept>@scm.com`

Login cards used to show `employee@scm.com` / `hod@scm.com` etc. — no way to tell from the email which department a test account belongs to. Renamed dept-scoped accounts to `<role>.<dept>@scm.com`; org-wide roles (admin / ceo / director / customer / vendor) keep the plain `<role>@scm.com` form.

**Mappings**:

| Old | New |
|---|---|
| `manager@scm.com` | `manager.eng@scm.com` |
| `hod@scm.com` | `hod.it@scm.com` |
| `finance.hod@scm.com` | `hod.fin@scm.com` |
| `purchase.hod@scm.com` | `hod.purch@scm.com` |
| `cfo@scm.com` | `cfo.fin@scm.com` |
| `accountant@scm.com` | `accountant.fin@scm.com` |
| `purchase@scm.com` | `purchase.purch@scm.com` |
| _(new)_ | `employee.it@scm.com` |

**Coverage expanded**: added one **HOD per department** (ENG, MFG, OPS, SALES, HR, LEGAL, QA, RND) and one **employee per department** (PROC, PURCH, FIN, ENG, MFG, OPS, SALES, HR, LEGAL, QA, RND). Total: 12 dept HODs (PROC = `marcus@meka.in`) + 12 dept employees, all seeded with verified `department.code` round-trip.

**`headSync`** in `DemoUsersSeeder` — every department now has its `head_name` populated.

**Login page rebuild**: `DEMO_GROUPS` replaces flat `DEMO_ACCOUNTS`. Three sections — **Org & roles**, **Department HODs**, **Department employees** — with section headers and a `max-h-[420px] overflow-y-auto` container so the panel stays compact even with 33 cards.

**Smoke tests** + **CLAUDE.md** updated to reference the new email scheme.

**DB cleanup**: 8 stale duplicates from the rename dance dropped (`manager@scm.com`, `employee@scm.com`, `hod@scm.com`, `cfo@scm.com`, `accountant@scm.com`, `purchase@scm.com`, `finance.hod@scm.com`, `purchase.hod@scm.com`) — confirmed no PR/vendor FK references before delete.

### ✅ FLOW.md item 6 — Purchase HOD = approve+read only; assigns RFQ/PO authoring to a subordinate

Two-phase ship: lock down first, then add the assignment primitive.

**Phase 6A — Backend lockdown**:
- `RfqController::canWriteRfq()` — HOD branch + `WRITE_HOD_DEPT_CODES` constant **removed**. Only `admin` + `purchase_officer` can write RFQs.
- `PoController::canWritePo()` — same shape, same change.
- 403 messages updated to *"Only a purchase officer can issue an RFQ. Ask your Purchase HOD to assign one."*
- Frontend mirrors in `quotations/{List, CreateRFQ}.jsx` and `purchase-orders/{List, Create}.jsx`.
- `CLAUDE.md` permissions table updated.
- **Verified live**: Purchase HOD `POST /rfqs` → 403; `purchase.purch@scm.com` → 201.

**Phase 6B — Assignment primitive**:
- **Migration** `2026_04_30_000000_add_assignment_columns.php` — `app_prs.assigned_rfq_author_id`, `app_rfqs.assigned_po_author_id` (nullable FK to users with `nullOnDelete`).
- **Models** `AppPr::assignedRfqAuthor()`, `AppRfq::assignedPoAuthor()` belongsTo `User`. Eager-loaded on index/show so the API surface includes `assigned_rfq_author` / `assigned_po_author`.
- **Endpoints**:
  - `POST /prs/{n}/assign-rfq-author` — Purchase HOD / admin only; PR must be `approved/done`; target must be `purchase_officer`.
  - `POST /rfqs/{n}/assign-po-author` — same shape; RFQ must be `awarded`.
  - `GET /users/purchase-officers` — for the dropdown; HOD-PURCH + admin only.
- `PrController::index()` — purchase officers also see PRs where `assigned_rfq_author_id = me` (so an officer can find PRs they didn't create).
- **Frontend**:
  - `components/feedback/AssignAuthorModal.jsx` (NEW, reusable) — bottom-sheet on mobile, centered dialog on desktop; loads officers, preselects current assignee.
  - **PR Detail**: "Assign RFQ author" button (Purchase HOD/admin, PR must be approved). Hero meta strip shows info chip "RFQ author: {name}" or warning chip "Awaiting RFQ author".
  - **RFQ Comparison `StatusBanner`**: extended for awarded RFQs — shows "PO author: {name}" or "Awaiting PO author"; "Assign / Reassign" button for Purchase HOD/admin; "Create PO" link narrowed to admin + `purchase_officer` (matches backend).

### ✅ FLOW.md item 7 — Vendor rate lock during consensus

`RfqController::submitQuote()` returns **409** if any of `consents.respective` / `consents.finance` / `consents.purchase` is populated. Lock releases only when **every** voting HOD withdraws (lock is OR across slots — partial withdrawals don't release).

**Frontend** `quotations/pages/SubmitQuote.jsx` — reads new `rates_locked` boolean from API; renders a neutral amber banner *"Rates locked — evaluation in progress. The buyer has begun reviewing quotes."* Disables the submit form. **No leak** of who voted or which vendor they picked (see vendor-portal scrub below).

**Verified live**:
- Purchase HOD votes via `/agree` → `chain_stage='consensus'`, `consents.purchase` populated.
- Vendor `POST /submit` → **409** with the lock message.
- Purchase HOD calls `/withdraw-agreement` → slot cleared.
- Vendor `POST /submit` → **200**, quote accepted.

### ✅ FLOW.md item 8 — PO approval chain

POs go through a **5-stage internal approval** before the vendor can act:
`purchase_hod → finance_hod → respective_hod → cfo → ceo → done`.
The `respective_hod` stage is skipped automatically when `respective_dept_code` is null (ad-hoc PO with no PR ancestry).

**Migration** `2026_04_30_120000_add_po_approval_chain.php` — adds `chain_stage` (default `purchase_hod`), `respective_dept_code`, `approval_history` (json), `last_comment` to `app_pos`. Legacy POs backfilled to `done` so demo data still works.

**`PoController::store()`** — sets initial chain stage; resolves `respective_dept_code` from the source RFQ's `consents.respective_dept_code` (which itself was resolved from the source PR at RFQ-create time).

**`PoController::updateStatus()`** (NEW) — gates by stage role (`purchase_hod` → PURCH HOD; `finance_hod` → FIN HOD; `respective_hod` → matching dept HOD; `cfo` → CFO; `ceo` → CEO; admin overrides). Approve advances via `nextStage()`; reject closes PO as rejected; hold parks. Appends to `approval_history`.

**`PoController::vendorAction()`** — now 409s if `chain_stage !== 'done'` so the vendor can't accept/reject mid-approval.

**Frontend**:
- `purchase-orders/store.js` — `updateStatus` action with upsert.
- **`components/feedback/ChainStatusModal.jsx`** (NEW, reusable) — generic title / stage / actions; default actions `approve / hold / reject` with comment validation. Replaces the PR-specific `UpdateStatusModal` for any future chain UI.
- **PO Detail** — chain banner with horizontal step rail (PURCHASE → FINANCE → RESPECTIVE → CFO → CEO); "Update Status" button visible to the role at the current stage; vendor Accept/Reject disabled with tooltip until `chainDone`.

### ✅ Vendor portal scrub — no internal approval state leaks

While building items 7 & 8 it became obvious vendors were seeing internal evaluator state in the API response (`consents.respective.user_name`, `consents.purchase.vendor`, `chain_stage='cfo'` etc.) even though the UI didn't render it. Fixed at the API layer so curl-sniffing doesn't help either.

**`RfqController::scrubForVendor()`** — adds a `rates_locked` boolean, hides `consents`, `chain_stage`, `assigned_po_author_id`, `assignedPoAuthor`. Applied in `index()`, `show()`, and `submitQuote()`'s response.

**`PoController::scrubForVendor()`** — adds a `released` boolean (true iff `chain_stage='done'`), hides `chain_stage`, `respective_dept_code`, `approval_history`, `last_comment`. Applied in `index()`, `show()`, and `vendorAction()`'s response. The 409 lock message also neutralized: *"This PO is still awaiting buyer approval and cannot be acted on yet."*

**Frontend follow-up**: PO Detail chain banner gated to `!isVendorView` (vendors get a neutral "Awaiting buyer approval" notice instead). SubmitQuote rate-lock banner stripped of per-slot voter/vendor list.

**Verified live**:
- Vendor `GET /pos/PO-…` keys: only `id, number, pr_number, vendor, business_unit, po_date, expected_delivery, items, subtotal, tax, total, status, notes, created_at, updated_at, released`. No `chain_stage`, no `respective_dept_code`, no `approval_history`.
- Vendor `GET /rfqs/QT-…` — no `consents`, no `chain_stage`, no `assigned_po_author*`. Only `rates_locked: true/false`.

### ✅ FLOW.md item 10 — Vendor payments (Finance dept)

After a PO is accepted/fulfilled, Finance creates a payment record.

**Migration** `2026_05_01_000000_create_app_payments_table.php` — `app_payments` table: `id`, `number` (PAY-YYYY-NNNN), `po_number` (soft FK), `vendor` (snapshot), `amount`, `status`, `payment_method`, `reference_no`, `paid_at`, `notes`, `created_by`, timestamps.

**Backend `PaymentController`** — `index`, `store`, `show`, `markPaid`, `destroy`. Gates: create = Finance HOD / Accountant / Admin (PO must be `accepted` or `fulfilled`); markPaid = Finance HOD / Admin; delete = Admin only. Routes registered.

**View access updated mid-session per user request**: dropped the `ORG_VIEW_ROLES` allowlist and Finance-HOD-only branch. Now **every in-org role** can see all payments (transparency by design — same pattern as RFQ list visibility). Vendors stay scoped to only their own. Mutation gates unchanged.

**Frontend**:
- `features/payments/{api.js, store.js}` — full CRUD + `markPaid`.
- `features/payments/pages/{List, Create, Detail}` — see UX overhaul section below for current state.
- Routing: `/app/payments`, `/app/payments/new`, `/app/payments/:number` (and `/admin/payments` mirror).
- Sidebar: new **"Payments"** entry under Finance for both user and admin layouts.
- **PO Detail deep-link**: when PO is `accepted` and viewer is Finance/Accountant/Admin, the green "vendor accepted" banner now exposes a **"Create Payment →"** button → `/app/payments/new?po=<number>`.

### ✅ FLOW.md item 11 — Cost-tiered payment approval chain

Layered on top of item 10. Chain by amount:
- **< ₹50,000** → `cleared_to_pay` immediately (Finance HOD clears directly).
- **₹50k – < ₹5L** → `pending_cfo` → `cleared_to_pay`.
- **≥ ₹5L** → `pending_cfo` → `pending_ceo` → `cleared_to_pay`.

**Migration** `2026_05_01_100000_add_payment_chain_stage.php` — adds `chain_stage` (default `cleared_to_pay`), `approval_history` (json) to `app_payments`. Legacy rows backfilled so existing payments still work.

**`PaymentController`** — constants `TIER_2_THRESHOLD = 50_000`, `TIER_3_THRESHOLD = 500_000`. Helpers `initialChainStage(amount)` and `nextStage(current, amount)`. `store()` derives initial stage. New **`updateStatus()`** endpoint — CFO acts on `pending_cfo`, CEO on `pending_ceo`, admin overrides; appends to `approval_history`. **`markPaid()`** now 409s if `chain_stage !== 'cleared_to_pay'`.

**Verified live**:
- ₹40,000 → `chain_stage='cleared_to_pay'` (tier 1).
- ₹100,000 → `chain_stage='pending_cfo'`; CFO approve → `cleared_to_pay`.
- ₹600,000 → `chain_stage='pending_cfo'`; CFO approve → `pending_ceo`; CEO approve → `cleared_to_pay`.
- Mark-paid on `pending_cfo` payment → **409** *"Payment is awaiting approval (pending_cfo) and cannot be released yet."*

### ✅ Payments UI/UX overhaul

**Detail page**:
- **Richer hero meta strip** — vendor / method / reference / created / paid-on in a 3-column grid with icons (Building2, CreditCard, Hash, Calendar, CheckCircle2). Method auto-prettified (`bank_transfer` → `Bank Transfer`).
- **Polished chain stepper** — circles 40px (up from 32), each shows the role short-label (`CFO` / `CEO` / `CLEAR`) with a sub-label (`Chief Financial Officer`, etc.). Active step pulses (`animate-pulse`).
- **NEW: Activity timeline** — renders `payment.approval_history` as a vertical stepper. Each event shows action (Approved / Rejected / Held / Marked as paid) in its own color, the stage it acted on, who did it (name + role), timestamp, and any comment in a styled blockquote. Two-column layout on `lg+` (Activity 2/3, Notes 1/3).

**List page**:
- **Money-focused KPIs** — replaced count-only cards with **Outstanding** (sum ₹ pending, compact format `₹6.7L`), **Paid this month** (sum since the 1st), **Awaiting approval** (count), **Cleared to pay** (count). Action-counts are clickable filter shortcuts.
- **Filter chips** — `All / Awaiting approval / Cleared to pay / Pending / Paid` as a horizontal scrollable rail; each shows its count.
- **Tier badge on every row** — `T1` (green) / `T2` (blue) / `T3` (amber).
- **Stage column on desktop** — pending rows show "Awaiting CFO" / "Awaiting CEO" / "Cleared to pay"; paid rows show "Paid Apr 30, 2026".
- New `fmtCompactINR` utility (`₹1.5k` / `₹2.3L` / `₹1.2Cr`).

### ✅ FLOW.md item 13 — PO supporting documents (vendor uploads)

Backend done (frontend follow-up pending). Designed for **stack-portability** so a future Node.js backend can replace Laravel without breaking the React contract.

**Audit of legacy upload patterns first** — the old Blade UI bypassed Laravel's `Storage` facade entirely, dropped files in `public/po_document/` / `public/document/` / etc., used filename pattern `{original}_{timestamp}.{ext}`, no server-side mime/size validation, no auth gate on the served URLs. Verdict: **don't replicate.** Multi-tenant SCM tool can't ship world-readable invoice PDFs.

**Portability principles locked first** (so the contract drives both stacks):
- Frontend never sees `file_path`. Only opaque IDs and a server-generated `download_url` on every doc record.
- Wire formats are all standard: `multipart/form-data` upload, JSON metadata, streamed binary download with `Content-Type` + `Content-Disposition`.
- Bearer auth on every call (including downloads — frontend will fetch as blob and trigger client-side save).
- Standard `422 { message, errors }` shape for validation; same for `403 { message }`.
- Storage abstraction is a one-line swap (`Storage::disk('local')` ↔ `Storage::disk('s3')`).

**Migration** `2026_05_01_200000_create_app_po_documents_table.php` — `app_po_documents` table:
- `id`, `po_number` (soft FK), `doc_type` (`e_way_bill` / `invoice` / `delivery_note`)
- `file_path` (server-side, hidden from JSON), `original_name`, `mime_type`, `size_bytes`
- `uploaded_by` (FK users, `nullOnDelete`), timestamps
- Indexes on `po_number` + `doc_type`

**Model `AppPoDocument`** — `$hidden = ['file_path', 'created_at', 'updated_at']`. Two computed accessors via `$appends`:
- `uploaded_at` — ISO-8601 alias for `created_at` (matches contract field name)
- `download_url` — `/api/po-documents/{id}/download` (computed server-side; same code works on any backend)

**Controller `PoDocumentController`** — 5 actions:
- `index` — vendor scoped to own POs by `vendor_name` match; in-org users see all (transparency mirrors RFQ list policy)
- `store` — multipart upload; validates `mimes:pdf,jpg,jpeg,png` + `max:10240` (10 MB) + `doc_type` enum; auth: vendor for own PO + admin override; stores via `Storage::disk('local')->store('po-documents/{po_number}', $file)` → lands on private disk with hashed filename; returns the full doc row in contract shape
- `show` — same scoping as index; 404 if vendor tries to view a doc on another vendor's PO
- `download` — auth-gated `Storage::download()` with `Content-Type` + `Content-Disposition`. Returns 410 Gone if the binary is missing on disk (DB row exists but file vanished)
- `destroy` — admin or original uploader only; deletes both the DB row and the binary

**Routes** — 5 endpoints registered under `/api/po-documents`.

**Forced JSON for `/api/*`** — added `$exceptions->shouldRenderJsonWhen($request->is('api/*'))` in `bootstrap/app.php` so validation errors never redirect to a web page (multipart curl was getting a 302 HTML redirect because the request lacked `Accept: application/json`). Every `/api` error now returns proper JSON.

**Verified live**:
| Scenario | Result |
| --- | --- |
| Vendor uploads PDF for their PO | **201** + contract-shape JSON |
| File on disk: `storage/app/private/po-documents/PO-2026-8930/{hashedName}.pdf` | ✅ private, never web-accessible |
| Vendor lists own docs | **200** with all 9 contract keys |
| Vendor downloads — `Content-Type: application/pdf`, 116 bytes | ✅ binary streams correctly |
| Other vendor (Acme) tries `show` / `download` | **404** *Not found* |
| Unauthenticated `download` | **401** *Unauthenticated* |
| `.txt` upload | **422** JSON: *"The file must be a file of type: pdf, jpg, jpeg, png."* |
| Missing `po_number` | **422** JSON: *"The po number field is required."* |
| Vendor deletes own doc | **200** `{"ok":true}` + binary removed from disk |

**Frontend integration TBD** — `/vendor/invoices/upload` page is still mock-only.

### ✅ Creator can delete their own PR after rejection

Existing rule: creator could delete only while PR was at HOD stage (still pending). User asked to extend: once HOD/CFO/CEO has rejected, the creator should be able to clear the dead record from their list.

**Backend** `PrController::destroy` — gate widened to:
- admin (always)
- creator IFF `(status='pending' AND chain_stage='hod')` OR `status='rejected'`

403 message updated to *"Only the admin, or the creator (while still with HOD, or after rejection), can delete."*

**Frontend** `purchase-requests/pages/Detail.jsx`:
- Imported `useNavigate` + `Trash2`; pulled `remove` from store.
- New gate `canDeleteRejected = isCreator && status === 'rejected'`.
- New **Delete PR** button — red (`text-danger`, `bg-danger-soft/40`, `border-danger/30`) — appears in the action bar next to Update Status / Assign. Confirms via `window.confirm`, calls store `remove`, toasts, navigates back to `/app/purchase-requests`.

**Verified live**:
- IT HOD rejects `PR-2026-1056` → `status='rejected'`, `chain_stage='done'`.
- HR HOD attempt → **403** with the new message.
- Creator (`employee.it@scm.com`) → **200** `{"ok":true}`, record gone.

### 🧪 Trademark format experiments on PR list (reverted to original)

Three list-page templates explored for the proposed "SCM trademark":

- **v1 — Standard List** — KPI strip with 5 unified `KpiCard`s (icon-square + 10pt uppercase label + 2xl black tabular value), bordered toolbar with search + filter chip rail, mobile cards / desktop wide-row split, mobile FAB.
- **v2 — Quiet Intelligence** — borderless surfaces, large flat title + tiny breadcrumb, hero "what matters now" panel with subtle primary-soft → transparent gradient, underline tabs (Linear/GitHub style) instead of pill chips, dot-style status indicators, denser rows (`py-3`).
- **v3 — Gallery** — cards-as-grid (1/2/3 cols by breakpoint), top status color band per card, gradient body tinted by status tone, **SVG approval progress ring** in footer (1/3 → 2/3 → 3/3, ✕ for rejected, dashed for cancelled), time-since badges (`2d ago`), hover lift (`-translate-y-0.5`).

User reviewed all three and **reverted the PR list to the original** (mobile-app polished version that existed before the trademark experiments started). The three template variants remain useful as reference if the design direction is revisited; nothing else in the app was touched.

---

## Session — 2026-04-29

### ✅ Step 0 — `users.department_id` (foundational)

Added department association to users so we can distinguish Procurement HOD / Finance HOD / IT HOD / etc.

- **Migration** `2026_04_29_000000_add_department_id_to_users_table.php` — nullable FK on `users.department_id` referencing `app_departments.id`, `nullOnDelete()`.
- **`User` model** — `department_id` added to `$fillable`; legacy `role()` belongsTo (broken — `role` is a string column) removed; `department()` rewired to `AppDepartment`. Added `isHodOf(string $deptCode)` helper.
- **`/api/login` + `/api/me`** — response now includes `department: { id, code, name } | null`.
- **`UserAdminController`** — accepts `department_id` on `store()` + `update()`, returns it from `index()` / `show()` / `update()`, supports `?department_id=` filter on list.
- **`DemoUsersSeeder`** — every demo user assigned to a sensible department; new account `finance.hod@scm.com` (Finance HOD); `hod@scm.com` is now the IT HOD; Marcus stays as Procurement HOD. Three distinct HODs by department make the upcoming consensus flow testable.

**Verified** — `/api/login` for `finance.hod@scm.com` returns `{ "department": { "id": 3, "code": "FIN", "name": "Finance" } }`.

### ✅ Step 0.5 — Frontend wiring for department

- **`src/data/roles.js`** — new `formatUserRole(user, { short })` helper. HODs render as "{Department} HOD" ("Procurement HOD", "Finance HOD", "IT HOD"); Purchase Officer in PROC simplifies to "Procurement Officer"; other roles get "{Department} {Role}". Falls back to plain role label when no department.
- **`src/components/nav/Topbar.jsx`** — identity chip now uses `formatUserRole`; HODs see "Procurement HOD" instead of generic "HOD".
- **`src/features/masters/departments/api.js`** (new) — frontend client for `/api/departments`.
- **`src/features/admin-home/components/EditUserDrawer.jsx`** — Department select between Role and Password. Loads departments on mount. Sends `department_id` (or null) to `/admin/users` on create/update. Warning hint when role=hod but no department selected.
- **`src/features/admin-home/pages/UsersList.jsx`** — new Department column with code+name chip, new Department filter dropdown ("All / No department / each dept").

Auth store needed no changes — it persists the whole `user` object verbatim, so the new `department` field flows through automatically. Production build passes (`npm run build` clean).

### ✅ Departments admin CRUD (replaces mocked page)

**Backend** (`app/Http/Controllers/Api/DepartmentController.php`):
- Mutations (`store` / `update` / `destroy`) gated to **admin only** (read still open).
- `index()` + `show()` + `store()` + `update()` now include `users_count` via `withCount('users')`.
- `destroy()` returns **409** with the linked-user count when users still belong to the department; pass `?force=1` to override (FK is `nullOnDelete`, so users get orphaned, not deleted).
- `store()` normalises the code to uppercase.

**Model** — `AppDepartment::users()` hasMany relation added.

**Frontend**:
- `src/features/masters/departments/store.js` (new) — Zustand store mirroring the existing items / vendors patterns.
- `src/features/masters/departments/EditDepartmentDrawer.jsx` (new) — real save logic, code locked after create (`Lock` icon + helper text), name/head/description/active fields, server-error flatten.
- `src/features/masters/pages/Departments.jsx` — **completely rewritten** off the mocked array. Stats row (Total / Active / Inactive / With members), search + active filter, real users-count column with bold-when-non-zero treatment, warning-icon delete button when members are linked (asks twice via `confirm()` and passes `?force=1`), `EmptyState` for empty / no-match.
- Page refreshes via `fetchAll()` on drawer close so user-count chips stay accurate after edits flow back from the Users master.

**Try it** — `/admin/departments` as `admin@scm.com`. Create a "Test Dept" → it appears in the Users invite drawer immediately. Try to delete `Procurement` (has 2 members) → confirm dialog warns about orphaning. Logs in as a non-admin and POSTing to `/api/departments` returns 403.

### ✅ Procurement catalog (Phase A) — search-as-you-type + specifications

A user can now type "laptop" on a PR, click the result, and **item code + HSN + UOM auto-populate** from the catalog. Specifications are captured per line in a structured + free-text panel.

**Backend**:
- Migration `2026_04_29_100000_add_spec_hints_to_app_items.php` — JSON column `app_items.spec_hints` (e.g. `{"CPU":"e.g. Intel i7","RAM":"e.g. 16GB"}`).
- `AppItem` casts `spec_hints` as array.
- `ItemController` validates `spec_hints` on store/update.
- **`DemoCatalogSeeder`** — 84 curated procurement items across 9 categories (IT Equipment 15, Office Supplies 12, Industrial/MRO 10, Raw Material 7, Electrical 10, PPE/Safety 10, Furniture 5, Hardware/Tools 8, Housekeeping 7) with **real CBIC HSN codes** (8471 laptops, 8482 bearings, 7228 steel, 8536 MCBs, 6506 helmets, …) and spec_hints for items that need them.
- `PrController::store()` validator extended: `items.*.specs` (array, key→string) + `items.*.specs_text` (string ≤2000) — both nullable, persist into the existing JSON `items` column.

**Frontend**:
- **`src/components/forms/ItemPicker.jsx`** (new) — debounced autocomplete combobox. Hits `GET /api/items?q=…&active=true`, dropdown shows name + category + HSN + UOM + code, keyboard nav (↑/↓/Enter/Esc), graceful fallback for "no match — typed text becomes a custom item".
- **`src/features/purchase-requests/pages/Create.jsx`** — name input replaced with `ItemPicker`. On pick, code/hsn_code/uom/description/spec_hints auto-fan-out and the specs panel auto-expands. New "Specs" toggle button per line shows count badge when fields are filled. Specs panel renders structured fields keyed off `spec_hints` plus a free-text "Additional notes" textarea.
- **`src/features/purchase-requests/pages/Detail.jsx`** — added a sub-row under each item showing structured specs (label/value grid) + free-text notes when present.
- "from catalog" sparkle chip appears on items picked from the catalog (code starts with `MK-`).

**Try it**:
1. Go to `/app/purchase-requests/new` as `anna@meka.in`.
2. In Item Name, type "laptop" → dropdown shows MK-IT-0001 with HSN 8471. Click it.
3. Code, HSN, UOM, Description auto-fill. The Specs panel expands automatically because the catalog item has 6 hints (CPU, RAM, Storage, Screen, OS, Brand preference) — fill what you need.
4. Submit → open the resulting PR Detail → specs render in the items table as a structured "Specifications" sub-row.
5. Try a non-catalog item like "custom widget" — typed text stays as the name with no code/HSN, free-text spec field still works.

**Catalog growth path**: Admin can add more items via the existing `/admin/items` page; new items immediately searchable. Replace seed with the full ~12k CBIC HSN dump anytime without code changes.

### 🐞 Approval-tree comment leak — fixed

**Bug** — a comment written by HOD when putting a PR on hold appeared at the CFO step too after HOD then approved. Source: a single `app_prs.last_comment` column was being read by every active step in the timeline, with no per-stage attribution.

**Fix — proper per-stage audit trail**:
- New migration `2026_04_29_120000_add_approval_history_to_app_prs.php` adds a JSON column `app_prs.approval_history`. Each entry: `{ stage, action, by_user_id, by_user_name, by_role, comment, at }`.
- `AppPr` model casts it as array.
- `PrController::updateStatus()` captures the stage **before** advancing, then appends a history row for every approve/reject/hold/cancel action. `last_comment` now gets cleared on approve (so legacy code using it stays correct) and is otherwise kept for backward compat only.
- Frontend `Detail.jsx` `ApprovalTree` was reading `pr.last_comment` for any active or rejected step. Rewritten to derive each step's comment from `lastEntryAtStage(role)` — i.e. the latest history entry whose `stage` matches that role. No cross-stage leak possible. Old PRs (no history) fall back to `last_comment` only on the active step.
- Comment chip now also shows the actor name and role (e.g. "— HOD User (HOD)") and a yellow "On hold:" prefix when the entry's action was a hold.

**End-to-end verified**: HOD holds with comment → HOD approves → CFO loads detail → comment shows only on HOD step, CFO step is clean. `approval_history` after the test:
```
[hod] hold by hod: Need clarification on quantity
[hod] approve by hod: (no comment)
```

### ✅ Items master CRUD — admin-editable code + HSN + spec hints

Earlier the item-code field was locked after create. Admin can now rename codes and edit HSN per row.

**Backend** (`app/Http/Controllers/Api/ItemController.php`):
- Mutations (`store` / `update` / `destroy`) gated to **admin only**.
- `update()` now accepts `code` with `Rule::unique('app_items','code')->ignore($item->id)` so codes can be renamed without colliding.
- Code normalised to uppercase on store/update.
- Index search broadened to also match `hsn_code`.
- Verified by curl: rename `MK-IT-0001` → `LAPTOP-001` → back. Non-admin (`purchase@scm.com`) PUT returns 403.

**Frontend**:
- `EditItemDrawer.jsx` — fully rewritten:
  - **Code field unlocked** even when editing. Shows a yellow info banner explaining: *"Existing PRs/POs/GRNs that referenced [old code] keep that snapshot — only future selections will use the new code."*
  - HSN field stays editable (was already, made the field font-mono for clarity).
  - Categories list synced to the 9 real catalog categories (uses a `<datalist>` so admin can also type a new one).
  - **Spec-hints editor** — add/edit/delete key/hint pairs that drive the requester-side spec panel.
  - Currency labels show ₹.
  - Sticky footer for the action buttons.
- `ItemsList.jsx`:
  - New **HSN column**.
  - Currency `$` → ₹.
  - Code rendered in `font-mono` for readability.
- `items/store.js` — `update(oldCode, payload)` already replaces by old code → handles rename naturally.

**Try it** as `admin@scm.com` at `/admin/items`:
1. Click any row to edit.
2. Change "Item Code" — yellow info banner explains the historical-snapshot behaviour.
3. Edit HSN code freely.
4. Click "Add field" under Specification Fields → add `Color` → `e.g. Yellow / White` for a Safety Helmet.
5. Save. Open `/app/purchase-requests/new` and pick "Safety Helmet" → the spec panel now includes a Color field with that placeholder.

---

## Current implementation snapshot — 2026-04-30

### ✅ API-wired, RBAC-enforced, production-ready

- **Auth** — Laravel login/logout with bearer token, `throttle:5,1` on `/api/login`, `PUT /api/me` for self-update, `AuthBootstrap` self-heals tampered localStorage. `RoleGate` wraps every `/app`, `/vendor`, `/admin` route. **24 dept-scoped demo accounts** following `<role>.<dept>@scm.com` convention.
- **Purchase Requests** — full HOD → CFO → CEO chain. Role-gated `updateStatus`, terminal-state guards, scoped index, `approval_history` audit trail. Frontend: timeline, KPI stats, print/PDF, mobile-app polish (FAB, horizontal KPI strip, card-style rows). **Assignment system**: Purchase HOD can assign a `purchase_officer` as the RFQ author once approved.
- **Quotations / RFQs** — Create/delete now narrowed to **`admin` + `purchase_officer` only** (item 6). `BACKOFFICE_ROLES` retained for award/close + consensus voting. Three-party consensus + CFO/CEO chain + Purchase-HOD-only award all wired (FLOW.md §3 fully implemented). **Vendor rate lock during consensus** (item 7) + **vendor-portal scrub** of approval internals.
- **Purchase Orders** — Create narrowed to **`admin` + `purchase_officer` only**. **5-stage internal approval chain** (`purchase_hod → finance_hod → respective_hod → cfo → ceo → done` — item 8) before vendor can act. PO Detail shows step rail; vendor Accept/Reject locked until `chain_stage='done'`. **Assignment system**: Purchase HOD can assign a `purchase_officer` as the PO author once RFQ is awarded.
- **Payments** (NEW today — items 10 & 11) — Finance dept module. **Cost-tiered approval chain** by amount: `<₹50k` clears immediately; `₹50k–<₹5L` needs CFO; `≥₹5L` needs CFO + CEO. Visible to every in-org role (transparency); vendors scoped to own. Mark-paid gated to `cleared_to_pay`. Full audit trail in `approval_history`. UI: money-focused KPIs (Outstanding / Paid this month), filter chips, tier badges, Activity timeline.
- **PO documents** (NEW today — item 13, **backend only**) — `app_po_documents` table + 5 endpoints under `/api/po-documents`. Files land on the private `local` disk (`storage/app/private/po-documents/{po_number}/{hashedName}`) — never web-accessible. Auth-gated streaming download. Designed for stack-portability (frontend never sees `file_path`; only opaque IDs and a server-generated `download_url`). Vendor scoped to own POs; admin override on uploads. **Frontend integration pending.**
- **GRN** — RBAC (warehouse roles create; admin deletes). PO must be `accepted/fulfilled`. Auto-fulfill on aggregate received = ordered.
- **Items / Vendors / Departments / Users masters** — full CRUD as before.
- **Profile** — shared user/vendor component.
- **Dashboards** — UserHome + VendorHome + AdminHome fully dynamic.
- **Vendor portal** — RFQ list, quote submission, PO list/detail with internal-state scrub. Defense-in-depth: API responses for vendor callers strip `consents`, `chain_stage`, `approval_history`, `respective_dept_code` etc. Only `rates_locked` / `released` booleans surface.
- **Sidebar + Topbar** — role-driven labels; mobile off-canvas drawer with backdrop, auto-close on route change, body scroll lock. Hamburger on mobile, condensed layout.

### ✅ Security posture

Defense-in-depth: route guards (`<RoleGate>`) → axios interceptor bearer → Laravel `ApiToken` middleware → controller RBAC → terminal-state guards → chain-stage guards → vendor-response scrub → login throttle. Reusable `ChainStatusModal` + `AssignAuthorModal` components.

### 🟡 UI exists, backend not wired yet

- **Finance — Invoices** (vendor invoice upload, proforma, delivery challan, purchase return) — UI scaffolds only; no controllers / no real upload yet (item 13 still open).
- **Inventory / StockReceive** — mock.
- **Roles & Permissions / Approval Rules / Settings** — UI-only.
- **Reports** — empty state / mock chart.
- **Notifications** — client-side seed (Zustand persist), no server events.
- **Masters: Categories / Companies / Projects** — mock pages.

### 🟡 Partial — backend done, frontend pending

- **Vendor portal upload of E-Way Bill / invoice / delivery note** (FLOW.md items 12 & 13) — full backend shipped today (`app_po_documents` + 5 endpoints, private disk, portable contract). Frontend `/vendor/invoices/upload` is still the old mock — needs a real upload widget + integration with the new `/api/po-documents` endpoints.

### 🔴 Not started

- **PO PDF download** (FLOW.md item 9) — currently only browser print. Real PDF generation TBD.
- File upload wiring for **vendor profile assets** (logo, GST/PAN PDFs) — separate from item 13. Legacy strings on `app_vendors` still point at `public/vendor_logo` etc.
- 2FA / MFA for privileged roles.
- Audit log UI (data is being captured in `approval_history` JSON columns; no aggregate viewer yet).
- Notifications (server-side events for assignments, approvals, rejections).

### ⚠️ Aspirational (documented in FLOW.md) — current state

| Feature | Status |
| --- | --- |
| ~~PO creation gated to `purchase_officer` only~~ | ✅ **Done** — admin + `purchase_officer` only. |
| Post-CEO Purchase-HOD allocation step | ⏭️ **Effectively covered** by item 6's assignment system (PR Detail "Assign RFQ author" appears once PR is approved). No separate review stage. |
| ~~RFQ create/delete = Purchase dept only~~ | ✅ **Done** — admin + `purchase_officer` only. |
| ~~Three-party consensus before award~~ | ✅ **Done** — `agree()` / `withdrawAgreement()` + 3 slots in `consents`. |
| ~~CFO/CEO approval tree on award~~ | ✅ **Done** — `chain_stage` machine `compared → consensus → cfo → ceo → done`. |
| ~~Award button only post-CEO, only Purchase HOD~~ | ✅ **Done** — `award()` requires `chain_stage='done'` AND PURCH HOD (or admin). |
| ~~Vendor rate lock during consensus~~ | ✅ **Done (item 7)** — `submitQuote` 409s when any HOD vote populated. |
| ~~PO 5-stage approval chain~~ | ✅ **Done (item 8)** — Purchase HOD → Finance HOD → Respective HOD → CFO → CEO. |
| ~~Payments (Finance dept)~~ | ✅ **Done (item 10)** — `app_payments` table, full CRUD, mark-paid. |
| ~~Cost-tiered payment approval~~ | ✅ **Done (item 11)** — <₹50k direct; ₹50k–5L CFO; ≥₹5L CFO+CEO. |
| Internal communication on RFQs | 🟡 Comments captured per-action via `approval_history`; no standalone messaging thread. |
| PO downloadable as PDF (item 9) | ❌ Browser print only. |
| Vendor uploads E-Way Bill / invoice / delivery note (items 12–13) | 🟡 **Backend done (2026-04-30)** — `app_po_documents` + 5 endpoints, private disk, portable contract. Frontend integration pending. |

> **Note:** PR creation stays open to any authenticated user — anyone can raise a need. The narrowing applies at RFQ + PO creation (item 6), and at every approval gate downstream.

---

## Session — 2026-04-25

Test-driven hardening + UI consistency pass. Day was framed by two smoke tests (`test/api-smoke.mjs` + `test/vendor-smoke.mjs`) that exposed real bugs across the vendor surface, then a UX rewrite of every list/detail screen the user actually lives in.

### 🚨 Backend security fixes (vendor surface)

`test/vendor-smoke.mjs` (34 cases) caught **3 critical authorization holes** + 1 data-consistency bug:

1. **`/api/vendors` data leak** — any authenticated vendor could list every other vendor's email/GST/PAN/bank/IFSC. Fixed in `VendorController::index()`: vendor role is now scoped to its own AppVendor row; non-back-office roles get 403.
2. **`POST /api/vendors`** had no role check — any vendor could create vendor master records. Added `WRITE_ROLES = ['admin']` gate.
3. **`PUT /api/vendors/{code}`** had no role check — any vendor could mutate other vendors (suspend competitors, change their bank info). Same admin-only gate; vendor self-updates already flow through `PUT /me`.
4. **Vendor rename orphans existing RFQs.** Backend scopes RFQs by `whereJsonContains('vendors', $vendorName)`. When a vendor renamed via `PUT /me`, the linked `app_vendors.vendor_name` was synced but the JSON snapshot in `app_rfqs.vendors[]` / `responses[].vendor` / `awarded_vendor` and `app_pos.vendor` / `app_grns.vendor` columns weren't. Added a transactional cascade in the `PUT /me` route handler that walks all four tables and replaces the old name. Verified by smoke test.

`destroy()` was also unprotected — added admin-only gate while there.

### 🐞 Frontend bugs found via static audit

- **`AcceptPOModal.jsx`** collected "delivery date" + "comments" in the UI but the API only accepts a bearer token — fields were dumped on close. Stripped the decorative inputs; kept the terms checkbox; added `busy` prop wired to a spinner.
- **`VendorInvoiceUpload.jsx`** was fully mocked: hardcoded PO options, submit toasted "submitted for approval" with no API call. Wired the PO selector to real `usePOStore` (filtered to invoiceable POs), added file size/type validation, replaced the lying toast with an honest "Preview only" banner.
- **`SubmitQuote.jsx`** didn't pre-fill prior submission on revise — vendors had to retype rates/GST/ETA when editing an existing quote. Now seeds from `responses[]` matching `vendorName`.
- **`PO Detail.jsx`** `BACKOFFICE_ROLES` set was missing manager/hod/cfo/ceo — the "Email" button was hidden from those roles. Synced to backend constant.
- **`useVendorIdentity` cache wasn't keyed by email** — logging out as one vendor and into another within the same session left the previous vendor's name cached, so the new vendor's "already quoted" / "awarded to me" badges showed false-positives. Re-keyed the Zustand store by `forEmail`; refetches on email change; resets on logout.

### 🆕 New shared identity hook

`src/features/vendor-portal/useVendorIdentity.js` resolves `user.email → app_vendors.vendor_name` once per session, caches by email. Replaces brittle `user.name` heuristic in 4 pages (VendorHome, VendorPOList, VendorQuotationRequests, VendorQuotations, VendorApplicationStatus, SubmitQuote).

### 🎨 UI primitives

`src/components/ui/`:
- **`Card.jsx`** + `<SectionTitle>` — standard surface container, padding="sm/md/lg/none"
- **`EmptyState.jsx`** — icon + title + description + optional CTA (supports `to` link OR `onClick`)
- **`KpiCard.jsx`** — reusable KPI tile with tone chip, big number, sub-text, hover arrow, loading spinner

Used across vendor portal + quotations + PO list pages. Same visual language everywhere.

### Page rewrites / improvements

- **AdminHome (`/admin`)** — was hardcoded `42 / 23 / 512 / 28 / 5` fake numbers. Now 8 KPI tiles driven by live counts (PRs, POs, RFQs, GRNs, Vendors, Items, Users, Roles), pending PR queue, pending vendor card, system links, greeting with admin's first name.
- **VendorHome / VendorPOList / VendorQuotations / VendorQuotationRequests** — refactored to use new `KpiCard` + `EmptyState`. Standardised `max-w-6xl` (was a mix of 1200/1400/7xl). Currency `$` → `₹` in PO list.
- **VendorApplicationStatus** — was hardcoded "Oct 10, 2023" mock dates. Now reads real vendor record: shows correct banner (approved / pending / suspended), actual `created_at` / `updated_at`, vendor code + name.
- **PR Detail approval timeline** — replaced absolute-positioned dual-rail design with per-step flex column where the connector lives inside each `<li>` and auto-aligns via flex-grow. No more misaligned rails or magic-number heights. Connector colour reflects step state (success/danger/muted). Comment bubble only on active or rejected step.
- **Quotations List (`/app/quotations`)** — KPI strip with click-to-filter (Open / Comparing / Awarded / Closed), visible filter-clear chip, smart "Responded" cell colour-coded by completion ratio, `EmptyState` empty/no-match states.
- **Quotations Comparison (`/app/quotations/:id`)** — **completely rewritten** for many-vendor scenarios. Replaced 100-column horizontal table with vertical vendor cards sorted by lowest grand total. Each card shows rank badge ("BEST PRICE" / "2nd" / "3rd" / "#N"), grand total, delta vs cheapest, ETA, items priced count, comment chip. Click to expand → per-line breakdown. Sort by total/ETA/vendor + vendor search. "Awaiting response from N vendors" tag pills section. Awarded card gets green ring. Awarded banner now has a "Create PO →" CTA that deep-links into the PO Create form.
- **PO List (`/app/purchase-orders`)** — KPI tiles with click-filter (Pending/Accepted/Fulfilled/Rejected) showing active spend total, currency `$` → `₹`, dropped decorative `MoreVertical` "Quick actions coming soon" stub, dropped row-number column, `EmptyState`.
- **PO Detail (`/app/purchase-orders/:id`)** — replaced misleading static "Fulfilment" checklist (always showed GRN/Invoice/Paid as un-checked) with live `FulfilmentTracker` component that reads the GRN store to compute actual received-vs-ordered ("Partial — 5 of 10" / "Fully received (2 GRNs)"). Same visual pattern as the PR approval timeline. Marks Invoiced/Paid as "Coming soon" instead of fake-pending. Removed redundant "Issued Status" cell (StatusPill already in header).
- **PO Create (`/app/purchase-orders/new`)** — page was overflowing on x-axis on laptop screens. The 9-column items table had `min-w-[900px]` which forced horizontal scroll for the entire form. Replaced with **per-item card layout**: each line item is its own card with a responsive `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` field grid that wraps cleanly at any width. Added per-line totals strip (Taxable / GST / Line total) below each card. Numbered pill on each card. `max-w-6xl` to match the rest of the app.
- **GRN Create (`/app/grn/new`)** — was fully mocked (hardcoded items, hardcoded PO number, submit toasted "submitted" with no API call). Rewrote: PO selector loads via `usePOStore` filtered to `accepted`/`fulfilled`, prefills vendor + items, per-item input clamped to remaining qty (after summing prior GRNs against same PO), "Receive all remaining" button, role gate matching backend `WAREHOUSE_ROLES`, deep-link `?po=…` support, validation + server error flatten.

### 🗑️ Removed

- **Payments feature, completely.** Deleted `src/features/finance/pages/{Payments,ProcessPayment}.jsx` + `src/features/finance/components/PaymentForm.jsx`. Stripped 4 routes from `routes.jsx`, both Payments entries from `navConfig.js`, the `Wallet` icon import (now unused), and the "Process Payment" link from the Invoices list.
- **Dead vendor portal stubs**: `VendorApplicationStatusPage.jsx`, `VendorPOViewPage.jsx`, `VendorProfilePage.jsx`, `VendorQuotationSubmitPage.jsx` (all 0 bytes, unused), and `VendorProfile.jsx` (mocked, route uses shared `ProfilePage`).

### ⚡ Performance fix — login was slow (root cause)

Login felt sluggish (multi-second). Root cause was the axios `baseURL` defaulting to `http://localhost:8000/api`. On Windows, `localhost` resolves to **both** IPv6 (`::1`) and IPv4 (`127.0.0.1`) with IPv6 preferred — but `php artisan serve --host=127.0.0.1` only listens on IPv4. The browser was waiting 1–3 seconds per request for the IPv6 attempt to time out before falling back. Fixed: hardcoded `http://127.0.0.1:8000/api` as the default in `src/api/client.js`. Every API call (login, dashboards, lists) is now instant.

### Test infrastructure

Two end-to-end smoke tests committed to `scm-frontend/test/`:

| File | Coverage | Result |
|---|---|---|
| `api-smoke.mjs` | Auth (16) + PR (9) + RFQ (9) + PO (5) + GRN (5) — full RBAC + terminal-state guards + auto-fulfill | **44/44 passing** |
| `vendor-smoke.mjs` | Vendor logins + `/vendors` scoping + RFQ scoping + quote submission negatives + PO scoping + rename-cascade + write-attempt blocks | **34/34 passing** after fixes |

Tests pace login attempts to avoid the `throttle:5,1` rate limit (sleep 65s between batches). Run with `node test/api-smoke.mjs` / `node test/vendor-smoke.mjs`.

### Schema-shape audit (frontend ↔ backend)

Confirmed every `api.js` payload matches the corresponding controller's validator:
- **PR/RFQ/PO/GRN items** all use `name` (required) + `code` / `hsn_code` / `uom` / `qty`. PO additionally needs `rate` and `gst`. NOT `description`/`quantity`/`unit_price`.
- **PR status mutation**: `{ action: approve|reject|hold|cancel, comments }`. NOT `{ status }`.
- **RFQ submit**: `prices` is a parallel **numeric array** sized to items (size-validated server-side); `gst` is a parallel array of GST percentages; not an array of objects.
- **GRN store** requires `vendor` field (separate from items).
- **Login + `/me` responses** are FLAT (`{ user, token }` / `{ id, name, email, role }`) — not wrapped in `{ data: ... }`. Every other endpoint wraps in `data`. Convention inconsistency, both sides handle it.

### Demo-data cleanup

- Deleted leftover **"Pwn Co"** vendor (test pollution from when there was a security hole that let any vendor `POST /vendors`).
- **Reinstated "Global SCM Vendor"** to `approved` (had been suspended during a security smoke test before the fix landed).
- Back-filled all open RFQs to include "Global SCM Vendor" in their invite list (so the vendor user `vendor@scm.com` actually sees RFQs in the portal).

---

## Session — 2026-04-24 (big day)

Turned a mostly-scaffolded app into a production-grade procurement pipeline with real RBAC, scoping, and 93/93 passing QA tests.

### Backend hardening (all controllers)

- **Auth**: `throttle:5,1` on `/api/login`. `PUT /api/me` self-update (name + password, current-password required). Kept existing `ApiToken` middleware.
- **PrController**: role-matched `updateStatus` (HOD/CFO/CEO must match `chain_stage`, admin always, creator can cancel own pending). Terminal-state guard (409). `index` scoped to creator for non-approver roles. `destroy` admin-only OR creator while still at HOD stage.
- **RfqController**: `BACKOFFICE_ROLES` = admin/purchase_officer/manager/hod/cfo/ceo for create/award/close (delete admin-only). Added `POST /rfqs/{n}/close`. Vendor identity derived server-side from `app_vendors.user_id` — no spoofing. Must-be-invited guard on submit/award. Prices `size:$itemCount` validation. Auto-advance to `compared` on first response. Items: `code`, `hsn_code`, `description`, `uom`. Responses: `gst[]` + `comment` + `submitted_at`.
- **PoController**: same BACKOFFICE gate + admin-only delete. Accept/reject gated to assigned vendor (via `AppVendor::where('user_id', …)`) or admin. Terminal-state guard. Rich items with per-line GST. Added `rfq_number` traceability.
- **GrnController**: WAREHOUSE_ROLES for create (employee included). PO must exist & be `accepted`/`fulfilled`. Auto-fulfill PO when aggregate received ≥ ordered across all GRNs.
- **UserAdminController (new)**: admin-only CRUD on `/api/admin/users`. Self-delete (422) and vendor-user delete (422) both blocked.
- **DepartmentController (new)**: full CRUD for `app_departments`, seeded with 12 standard departments.
- **ItemController (new)**: full CRUD for `app_items`.
- **VendorController**: expanded with every field from legacy `add-vendor.blade.php` (GST, PAN, bank, MSME, udhyam, nature of business). Cascaded user creation on vendor create so login works immediately. Public `POST /api/vendor-register` route for self-sign-up.

### New DB tables / migrations

- `app_items`
- `app_vendors` (full field set) + `user_id` FK
- `app_departments`
- `app_prs.customer / project / region / delivery_location / site_name` columns added

### Frontend work

- **Routing**: RoleGate re-enabled via `wrap()` helper in `routes.jsx`. `/app/profile` now renders a shared `ProfilePage` (not the vendor one).
- **Role-aware UI**: List pages hide Create buttons for non-authorized roles. CreateRFQ / Create PO / Users / Departments pages redirect unauthorized roles to `/403` or the respective list.
- **PR Detail**: numbered approval tree with role icons (HOD/CFO/CEO = Users/Banknote/Crown), progress rail, print CSS with letterhead + signature block. Fixed stuck-submit-button bug. Info-control: employees see only neutral "Pending review" — no per-stage attribution.
- **PR List**: KPI stats row (Total / Pending / Approved / Rejected / Cancelled), filter by clicking stat, polished rows with PR title inline.
- **RFQ**: `CreateRFQ` has PR selector that prefills items, vendor dropdown from `/api/vendors` (approved only), inline validation. `Comparison` shows tax-inclusive totals, Close without award for back-office, admin Delete. `SubmitQuote` has per-line GST dropdowns (0/5/12/18/28) + comment + taxable/GST/total math in ₹.
- **PO**: `Create.jsx` has source-document banner (awarded RFQ or approved PR), deep-link `?rfq=…` auto-prefill that locks the form. Detail page overhauled with status banners and role-aware actions.
- **Vendors List**: one-click approve/suspend/reinstate buttons on each row. Pending-vendors banner at top when any exist.
- **Users master**: new `/admin/users` with stats row, role filter, invite drawer supporting all 10 internal roles.
- **Profile**: shared page for `/app/profile` and `/vendor/profile`. Edit name + password; vendor also sees linked business card.
- **Dashboards**: UserHome + VendorHome fully dynamic (real KPIs, activity feed, approvals queue).
- **Sidebar + Topbar**: role-driven labels; fixed "AD" fallback by reading from auth store directly.
- **RefreshButton component** on every dynamic list.

### Seeder wiring

- `DemoUsersSeeder` now creates one user per role (`<role>@scm.com`) AND seeds linked `app_vendors` rows for `vendor@acme.com` → "Acme Industries" and `vendor@scm.com` → "Global SCM Vendor". Without this linkage, vendor-scoped list queries returned empty.

### Bug fixes

- Stale localStorage role tampering self-heals on page reload (`AuthBootstrap` → `fetchMe`).
- `Create.jsx` (PR) stuck-button after failed validation — disabled flag now keyed to `submitting` only.
- `null`-leak into rendered cells — centralized `isEmpty()` helper on Detail pages.
- Vendor spoofing on RFQ submit — backend derives identity from token.
- `formatDate("null")` returning literal string — now returns `"—"`.
- Axios `withCredentials: true` removed — was triggering CORS preflight unnecessarily.

### QA

- 93/93 tests pass across PR (23), RFQ (36), PO (34) with every role × operation combination. GRN (10/10) and Users (7/7) verified separately.
