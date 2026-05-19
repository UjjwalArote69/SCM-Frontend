# Suppliers First Frontend — Design System

The canonical visual language for this app. **Treat the values in this file as the design contract** — anything in `/admin/settings → Branding` is metadata used for PDFs, emails, and documents only; it does not retheme the live UI. The chrome (sidebar, topbar, buttons, links) reads from `src/index.css`. If a change is needed, edit `src/index.css` *and* update this file.

> Tooling note: Tailwind v4 wires these via `@theme inline { --color-* : var(--brand-*) }` in `src/index.css:10`. Use the semantic Tailwind class (`bg-primary`, `text-text-muted`, `bg-success-soft`) — never raw hex.

---

## Brand identity

| | |
|---|---|
| **Product name** | Suppliers First |
| **Parent / legal entity** |  (legal name `Meka Industries Pvt Ltd` for PDF letterheads) |
| **Wordmark in chrome** | hardcoded `Suppliers First` (Sidebar.jsx) — never read from settings |
| **Brand mark in chrome** | `Factory` icon (Lucide) on a `bg-primary` rounded square — never read from settings |
| **Email + invoice from-name** | `Suppliers First` (used in PDF blade defaults across PR/PO/RFQ/GRN/Payment) |

**Why hardcoded?** The wordmark and mark are part of the product identity. Admins can change `legal_name` for PDFs/letterhead but the live app shell stays stable.

---

## Color tokens — light theme (default)

```
:root {                                  /* src/index.css:49–77 */
  /* Brand (warm red) */
  --brand-primary:           #dc2626
  --brand-primary-hover:     #b70011
  --brand-primary-deep:      #93000b
  --brand-primary-soft:      #fef2f2
  --brand-primary-foreground:#ffffff

  /* Surfaces — warm bone canvas, white cards */
  --surface-bg:                  #fafaf7
  --surface:                     #ffffff
  --surface-alt:                 #f3f3ee
  --surface-container:           #ededea
  --surface-container-low:       #f3f3ee
  --surface-container-lowest:    #ffffff
  --surface-border:              rgba(10,10,10,0.10)
  --surface-outline-variant:     rgba(10,10,10,0.06)

  /* Text — slate scale */
  --text:                        #0f172a
  --text-muted:                  #64748b
  --text-subtle:                 #94a3b8

  /* Status */
  --status-success: #16a34a    --status-success-soft: #dcfce7
  --status-warning: #d97706    --status-warning-soft: #fef3c7
  --status-danger:  #dc2626    --status-danger-soft:  #fee2e2
  --status-info:    #2563eb    --status-info-soft:    #dbeafe
}
```

### Body background — light

A warm bone canvas with apricot corner-glow gradients. **Fixed attachment** so it doesn't scroll with content.

```css
html:not([data-theme="dark"]) body {
  background-color: #fafaf7;
  background-image:
    radial-gradient(ellipse 70% 50% at 100%   0%, rgba(255,100,40,0.28), transparent 65%),
    radial-gradient(ellipse 55% 40% at   0% 100%, rgba(255,150,70,0.22), transparent 65%),
    radial-gradient(ellipse 60% 50% at 100% 100%, rgba(255,110,50,0.18), transparent 70%);
  background-attachment: fixed;
}
```

---

## Color tokens — dark theme (`[data-theme="dark"]`)

Crypto-dashboard aesthetic — near-pure-black canvas, warm orange corner bleed, glass cards.

```
[data-theme="dark"] {                    /* src/index.css:82–110 */
  /* Brand (saturated coral so it pops on black) */
  --brand-primary:           #ff5d3a
  --brand-primary-hover:     #ff7a5c
  --brand-primary-deep:      #c53d1f
  --brand-primary-soft:      rgba(255,93,58,0.12)
  --brand-primary-foreground:#ffffff

  /* Surfaces — near-black, layered greys */
  --surface-bg:                  #0a0a0e
  --surface:                     #14141a
  --surface-alt:                 #1a1a22
  --surface-container:           #1a1a22
  --surface-container-low:       #121218
  --surface-container-lowest:    #0d0d13
  --surface-border:              rgba(255,255,255,0.06)
  --surface-outline-variant:     rgba(255,255,255,0.04)

  /* Text — neutral whites */
  --text:                        #f3f4f6
  --text-muted:                  rgba(255,255,255,0.58)
  --text-subtle:                 rgba(255,255,255,0.32)

  /* Status — brighter to remain legible on dark */
  --status-success: #22c55e    --status-success-soft: rgba(34,197,94,0.14)
  --status-warning: #f59e0b    --status-warning-soft: rgba(245,158,11,0.14)
  --status-danger:  #f87171    --status-danger-soft:  rgba(248,113,113,0.14)
  --status-info:    #60a5fa    --status-info-soft:    rgba(96,165,250,0.14)
}
```

### Body background — dark

Same triple-radial-gradient pattern with low-alpha warm bleed so cards still register against the canvas.

### Chrome shield (`.scm-chrome`)

Sidebar and Topbar wrappers carry the `scm-chrome` class. In dark mode this **forces a solid dark background** so the warm body gradient doesn't bleed through and turn navigation muddy brown.

```css
[data-theme="dark"] .scm-chrome { background-color: rgba(13,13,19,0.94) !important; }
```

---

## Typography

| Property | Value |
|---|---|
| **Font family** | `Montserrat`, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif |
| **Loaded via** | Google Fonts — `index.html` |
| **Smoothing** | `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;` |
| **Weights used** | 400 body · 500 medium · 600 semibold · 700 bold · 900 black (display headings) |

### Established type scale

| Use | Class | Approx |
|---|---|---|
| Page H1 | `text-[20px] sm:text-[28px] font-bold tracking-tight` | 20–28 px |
| Section H2 | `text-xl font-bold` | 20 px |
| Card title | `text-base font-bold` | 16 px |
| Body | `text-sm` | 14 px |
| Meta / muted | `text-xs text-text-muted` | 12 px |
| Eyebrow / chip label | `text-[10px] uppercase tracking-widest font-semibold` | 10 px |
| Mono (codes / IDs) | `font-mono` | matches body size |

### Currency

Always **₹** (Indian Rupee). Use `fmtINR` and `fmtCompactINR` helpers from `utils/format.js`. Anywhere `$` or `USD` appears in user-facing copy, it's a leftover and should be fixed.

---

## Iconography

- **Library**: `lucide-react`. Stroke `2` default (`2.25` for emphasized icons).
- **Sizes**: `h-3 w-3` (chips), `h-4 w-4` (buttons / inline), `h-5 w-5` (cards), `h-6 w-6` (page headers), `h-10 w-10 rounded-lg` (icon tiles).
- **Color**: tone-matched — `text-primary` for accents, `text-success/warning/danger/info` for status, `text-text-muted` for neutral.
- **Stitch HTML imports**: convert `material-symbols-outlined` glyphs to the nearest Lucide icon during port. Don't ship Material icons.

---

## Layout

| Surface | Container width | Padding |
|---|---|---|
| App pages (PR/PO/RFQ/GRN/etc.) | `max-w-6xl mx-auto` | `p-4 sm:p-6 md:p-8` |
| Settings / wide admin pages | `max-w-[1200px] mx-auto` | same |
| Roles & Permissions matrix | `max-w-[1400px] mx-auto` | same |
| Dialogs / drawers | `max-w-md` (drawer) / `max-w-lg` (dialog) | `p-5` |
| Topbar | `h-14` | `px-3 sm:px-4 md:px-6` |
| Sidebar | `w-64` (`w-16` collapsed) | `mx-3 px-3 py-2.5` per nav item |

### Breakpoints (Tailwind defaults)

`sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280 · `2xl` 1536. The mobile pattern uses an off-canvas sidebar drawer below `md` (see Sidebar.jsx).

### Spacing rhythm

`space-y-4 sm:space-y-6` for stacked sections, `gap-3 sm:gap-4` for tile rows, `space-y-2` for tight lists (KPI strip, card-rows).

---

## Cornerstones — components that define the look

Reuse these. Don't reinvent them per page.

### `glass-card` (CSS class, src/index.css:167)

The marquee surface — translucent with backdrop blur, hairline border, layered shadow, subtle apricot corner glow on `::after`. Light + dark variants tuned independently.

```css
.glass-card {
  backdrop-filter: blur(14px) saturate(1.1);
  background: rgba(255,255,255,0.82);
  border: 1px solid rgba(10,10,10,0.08);
  box-shadow: 0 1px 2px rgba(20,10,5,0.04),
              0 4px 12px -4px rgba(180,90,30,0.10),
              0 18px 40px -18px rgba(180,60,20,0.18),
              0 1px 0 rgba(255,255,255,0.85) inset;
}
```

Used for: dashboard KPI cards, feature cards, master grid items.

### Hover lift

Interactive cards use `shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200`. Applied to KpiCards, master grids, and card-row pages.

**Not** applied to dense list rows — for those use `hover:bg-surface-container-low` (lifting rows in a long list reads as jarring).

### `KpiStatCard` (`components/data/KpiStatCard.jsx`)

Top of every list page — clickable filter tile. Idle state is a `glass-card` with soft tone-tinted icon. Active state is fully tone-tinted (border + ring + filled icon + "FILTER" chip). **Use this** for any clickable KPI; do not roll your own.

Tones: `neutral · info · warning · success · danger` (mapping below).

### `StatusPill` (`components/data/StatusPill.jsx`)

Small rounded-full status badge. Tones match `KpiStatCard`. Always pair with a Lucide icon for states beyond text labels.

### `EmptyState` (`components/ui/EmptyState.jsx`)

Empty / no-match panel: dashed border, centered icon (1.5 stroke), title + description + optional CTA `{ to | onClick, label }`. Always reach for this — never write a one-off "no data" block.

### `Skeleton` (`components/feedback/Skeleton.jsx`)

`<Skeleton className="h-4 w-32" />` — composition over presets. Use for **page/list/dashboard initial-load only**. Don't use for button-level "saving" states (those keep `Loader2 animate-spin`).

### `PageHeader` (`components/data/PageHeader.jsx`)

Title + subtitle + actions slot. Used at the top of every page — consistency cue for the whole product.

---

## Tone → meaning

Status tones are semantic and tied to entity state across the whole app. Don't mix them.

| Tone | Use | Light hex | Dark hex |
|---|---|---|---|
| `success` | approved · done · accepted · in stock · paid | `#16a34a` | `#22c55e` |
| `warning` | pending · partial · awaiting approval · low stock | `#d97706` | `#f59e0b` |
| `danger` | rejected · cancelled · damaged · admin role | `#dc2626` | `#f87171` |
| `info` | viewing · informational · neutral active state | `#2563eb` | `#60a5fa` |
| `neutral` | inactive · closed · others bucket | `text-muted` | `rgba(255,255,255,0.58)` |

### Role tones (used on Users page avatars + role pills)

| Role | Tone |
|---|---|
| `admin` | danger |
| `ceo`, `cfo`, `director`, `hod` | warning |
| `manager`, `purchase_officer`, `accountant`, `project_manager` | info |
| `site_person`, `employee`, `customer`, `vendor` | neutral |

---

## Page archetypes

The app has three repeating page archetypes — keep new pages aligned with one of these patterns instead of inventing a layout.

### A. List page (PR / PO / RFQ / GRN / Payments / Users / Departments)

```
[ PageHeader title  subtitle  actions(Refresh, +Create) ]
[ KpiStatCard × 4–5 — clickable filter buckets         ]   ← horizontal scroll on mobile
[ Filter bar (search + dropdowns + clear)              ]
[ Card-row list ‹or› compact table                     ]   ← cards are preferred
[ Showing N of M counter                               ]
```

- Mobile FAB for "+Create" when the action is buried, e.g. PR list.
- Skeleton mirrors the real geometry (no layout shift on load).
- Cards stack vertically on mobile; chips wrap; action buttons hover-reveal on `sm+`.

### B. Detail page (PR / PO / RFQ / GRN / Payment Detail)

```
[ Breadcrumb ]
[ Hero card — number, title, status pill, days-since chip, action bar ]
[ Two-column grid: main content (2/3) + sidebar (1/3) on lg+; stacks on mobile ]
[ Approval / chain timeline ]
[ Items table → mobile-card on small screens ]
[ Activity log (approval_history) ]
```

### C. Master / settings page (Items / Vendors / Categories / Departments / Settings)

Either a card grid (Companies, Projects) or a card-row list (Users, Departments) with the same header + filter bar pattern as List pages. **Drawers** open for create/edit (`GenericMasterDrawer.jsx`) — not a separate route.

---

## Interactive states

| State | Style |
|---|---|
| Hover (card) | `shadow-sm → shadow-lg`, `-translate-y-0.5`, `border-primary` (interactive cards only) |
| Hover (row) | `bg-surface-container-low` (no lift) |
| Active filter | `KpiStatCard` active pattern: tone-tinted card + colored border + ring + filled icon tile + "FILTER" chip |
| Focus | `focus:border-primary focus:ring-0` on inputs (no Tailwind ring; use border color) |
| Disabled | `opacity-50 cursor-not-allowed` (or `disabled:opacity-30` for icons) |
| Saving / loading | Button-level `Loader2 animate-spin` icon. Page-level `<Skeleton>`. **Never both at once.** |

### Drafts → Save (Roles & Permissions pattern)

Edits hold in a draft until explicitly saved. Sticky save bar slides in at the bottom showing dirty-row count + Save / Discard. The matching pattern is the source of truth — re-use it before adding any new "auto-save on toggle" behavior.

---

## Loading-state rules (locked)

1. **Page / list / dashboard initial fetch** → `<Skeleton>` matching real geometry.
2. **Submit / save / refresh button** → `Loader2 animate-spin` inside the button.
3. **In-flight detail mutation (e.g. row delete)** → disable the row's actions + spinner replacing the icon.

Never show a centered full-page spinner on a page that has its layout known ahead of time.

---

## Print / PDF

`@page A4 portrait` with `14mm/14mm/16mm/14mm` margins. Print CSS in `src/index.css:282–417`:
- Strips dark theme (`color: #111`, `background: #fff`).
- Hides nav/sidebar/topbar.
- Resets margins/padding/colors on cards so the document reads as a clean letterhead.
- Tables get `border-collapse`, alternating-row striping, uppercase 8.5pt thead.
- Status badges flatten to `border: 1px solid #666` plain labels.

Server-side PDFs (`PrintLetterhead`/`PrintFooter` blade templates) **mirror this aesthetic**: same DejaVu Sans (PDF-friendly Montserrat fallback), same address-block conventions, signature row, footer. The on-screen Print and the server PDF should be visually interchangeable — that's the whole point of having two paths.

---

## What `/admin/settings → Branding` actually controls

| Setting | Drives |
|---|---|
| `legal_name` | PDF letterhead "from" line; email body templates |
| `address` | PDF letterhead block |
| `gstin` / `pan` | PDF letterhead block |
| `logo_path` | PDF letterhead image (top-left of every doc) |
| `primary_color` | PDF accent (header rule, totals row tint) — **NOT the live app** |
| `email_footer` | Email body footer |

**It does not retheme the running app.** Pickers in the Branding tab are persisted to `app_company_settings` and consumed by the Blade templates in `resources/views/pdf/*.blade.php`. The live UI's color is fixed by `--brand-primary` in `index.css`.

---

## Mobile patterns

- **Off-canvas sidebar drawer** below `md` — translates in with a backdrop, auto-closes on route change, locks body scroll. Implemented in `components/nav/Sidebar.jsx`.
- **Topbar** — `h-14`, hamburger on mobile, condensed brand mark + page title.
- **KPI strip** — horizontal scroll snap (`overflow-x-auto snap-x snap-mandatory`) with `min-w-[140px]` cards on small screens; collapses to `sm:grid-cols-N` from `sm` up.
- **List rows** — flex-col on mobile, flex-row on `sm+`. Action buttons self-align right at the end of the row, opacity-0 → group-hover:opacity-100 on `sm+`.
- **FAB** — bottom-right floating "+ Create" on dense list pages where the header CTA is hidden on mobile.
- **Touch targets** — minimum `py-3` on inputs and `p-2` on icon buttons (44 px).

---

## Audiences — `/app`, `/vendor`, `/admin`

Three layouts on one frontend. Each layout draws its own sidebar nav (`navConfig.js`) but **the visual language is identical** across all three. Don't introduce per-audience theming — RoleGate handles access; the chrome stays consistent so users with multiple roles can switch between portals without mental whiplash.

---

## What NOT to do

- **Don't write raw hex.** If a token is missing, add it to `index.css` and document it here.
- **Don't read `--brand-*` from settings at runtime.** That's a feature/business value, not a design value.
- **Don't replace skeletons with spinners** on initial loads (or vice versa for buttons).
- **Don't introduce Material icons.** Lucide only.
- **Don't add hover-lift to dense table rows.** Use `bg-surface-container-low` on rows.
- **Don't use `localhost`** — Windows IPv6 timeout. Always `127.0.0.1`. (Operational, but related — the design relies on snappy interactions.)
- **Don't add new currency symbols.** ₹ everywhere.

---

## Where to look in the code

| Want to change | Edit |
|---|---|
| Brand color / surfaces / status / dark mode | `src/index.css` (CSS vars on `:root` and `[data-theme="dark"]`) |
| Glass-morphism card recipe | `src/index.css` `.glass-card` block |
| Body gradient | `src/index.css` `html:not([data-theme="dark"]) body` |
| Sidebar wordmark / brand mark | `src/components/nav/Sidebar.jsx` (hardcoded — don't read from settings) |
| Topbar | `src/components/nav/Topbar.jsx` |
| Theme toggle behavior | `src/hooks/useTheme.jsx` |
| Print / PDF on-screen styles | `src/index.css` `@media print` + `@page` blocks |
| PDF letterhead / footer template | `resources/views/pdf/*.blade.php` (server side) |
| KPI tile | `src/components/data/KpiStatCard.jsx` |
| Status pill | `src/components/data/StatusPill.jsx` |
| Empty state | `src/components/ui/EmptyState.jsx` |
| Skeleton | `src/components/feedback/Skeleton.jsx` |
| Page header | `src/components/data/PageHeader.jsx` |

---

## Changelog discipline

Any change to this file is a design-system change. Note it in `PROGRESS.md` under the corresponding session, and call it out in the PR description so reviewers know to look beyond the diff.
