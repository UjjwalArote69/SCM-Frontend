# Suppliers First Backend Reference

Laravel Suppliers First app at `../` (parent directory). Read this only when a task touches backend contracts — routes, models, auth, state machines. For general frontend work, stick to CLAUDE.md.

## Decision

**Option C: Laravel retires Blade, becomes a pure JSON API.** Blade views in `../resources/views/` are reference-only and will be removed. Each controller action needs a JSON sibling. Currently *none* have been converted — frontend is on mocks.

---

## Roles

| role_id | Name | Notes |
|---|---|---|
| 1 | Admin | Full access, permission overrides |
| 2 | Manager/Employee | Department-scoped, creates PRs |
| 3 | CEO | Final approval stage |
| 4 | Vendor | External, separate portal |
| 5 | HOD | Stage 1 approval (PR/PO/Quote) |
| 6 | CFO | Stage 2 approval + invoice/payment |
| 7 | Warehouse | Creates GRNs |

Permission enforcement: `CheckForRole` middleware + `role_module_associations` / `user_module_associations` tables. Dynamic sidebar hydrated per user into `Session::get('menus')` at login. **Frontend should fetch menu tree from `/api/v1/menus` per user.**

---

## Core entities (truncated field lists — full schema in `../database/migrations/`)

### Users
`users`: id, name, email, password, role_id, department_id, project_id, business_head, functional_head, director, is_active, work_location.

### Vendors (6-stage onboarding)
`vendors`: user_id, vendor_code, vendor_name, category_id, sub_categories_id, address, gst, pan, `is_vendor_approved` (0/1), `is_active`, `vendor_add_status` (0–5).

Stage tracking: `vendor_add_status` progresses 1→5 through the public wizard; admin sets `is_approved=1, is_active=1` to finalize.

Helpers: `is_vendor_approved($user_id)`, `vendor_is_active($user_id)`.

### Purchase Request
`purchase_requests`: pr_number (`PR-{BU_SHORT}-{DDMMYYYY}-{ID}`), `approval_status` (0=HOD pending, 1=CFO pending, 2=CEO pending), `status` (requested/approved/hold/rejected/cancel), `current_status` (processing/completed/partially_completed), customer, circle_id, project, requested_by, business_unit, department_id, prepared_by, document1.

`purchase_request_items`: pr_id, item_code, hsn_code, qty, uom, description, status.
`purchase_request_logs`: pr_id, user_id, message (audit trail).

### Quotation / RFQ
`quotations`: quotation_no (`QT/{DD/MM/YYYY}/{ID}`), pr_id, vendor_category_id, vendor_sub_category_id, `status` (requested/approvel_for_po/approved), `approvel_status` (0/1/2), end_date, creator_by.

`quotation_items`: quotation_id, pr_id, item_code, qty, uom.
`vendor_quotations`: quotation_id, vendor_user_id (invitations).
`vendor_quotes`: quotation_id, vendor_id, `status` (pending/submitted/approved), `is_accepted`.
`vendor_quote_items`: vendor_quote_id, rate, qty_quoted, gst, total_amount.

### Purchase Order
`purchase_orders`: po_number (`{BU}-{VENDOR}-{DDMMYYYY}-PO-{ID}`), quotation_id, po_type (1=PO, 2=WO), vendor_id, business_unit_id, bill_to_* fields, delivery_* fields, payment_terms_id + text, delivery_terms_id + text, po_amount, po_gst_amount, advance, currency_id, `status`, `po_approval_status` (0/1/2), `is_vendor_accepted_by`, vendor_accepted_date, `item_recieved`, `is_invoice_uploaded`, `invoice_status` (pending/approved), `payment_status` (pending/approved/payment_done), payment_date, payment_mode, transaction_reference_no, payment_attachment.

`purchase_order_items`, `purchase_order_logs`.

### GRN (Goods Receipt)
`grns`: po_id, grn_number (`GRN-{DDMMYYYY}-{ID}`), grn_file.
`grn_items`: grn_id, po_item_id, qty, status (accepted/rejected), remark.

### Invoice & Payment
`invoices`: po_id, invoice_no, vendor_id, amount, gst_amount, total_amount, currency_id, invoice_date, due_date, status.
`proforma_invoices`: similar, for pre-invoice.
Payment is NOT a separate table — fields live on the PO row (payment_date, mode, ref, attachment).

### Masters
items, categories, units, business_units, projects, verticals, circles (regions), companies, customers, currencies, delivery_terms, payment_terms, certificates, countries/states/cities/zipcodes, app_settings, activities (notification feed).

### Permissions
modules, sub_modules, role_module_associations, user_module_associations.

---

## State machines (render these correctly in UI)

### PR approval
```
created (approval_status=0, status=requested)
  → HOD approve → (approval_status=1)
  → CFO approve → (approval_status=2)
  → CEO approve → (status=approved, current_status=completed)
At any stage: reject/hold/cancel → status=rejected/hold/cancel (terminal)
current_status derived from items: all done=completed, some=partially_completed, else=processing
```

### Quote
```
requested (approvel_status=0)
  → vendors submit VendorQuote (status=submitted)
  → HOD compares, accepts one (VendorQuote.is_accepted=1, status=approved)
  → approvel_for_po
  → convert to PO
```

### PO (three orthogonal tracks)
```
APPROVAL:   po_approval_status 0 → 1 → 2 → status=approved
VENDOR:     is_vendor_accepted_by 0 → 1 + vendor_accepted_date
GOODS:      item_recieved 0 → 1 (GRN created)
FINANCE:    is_invoice_uploaded 0 → 1; invoice_status pending → approved; payment_status pending → approved → payment_done
```

### Vendor onboarding (public)
```
vendor_add_status: 0 → 1 (Info) → 2 (Reference) → 3 (Bank) → 4 (Statutory) → 5 (Business)
                   → admin sets is_approved=1, is_active=1 → full portal access
```

---

## Procurement happy path (end-to-end)

1. **Employee creates PR** → `POST /api/v1/purchase-requests`
2. **HOD approves** → PR.approval_status=1, email to CFO
3. **CFO approves** → =2, email to CEO
4. **CEO approves** → status=approved
5. **Admin creates RFQ** from approved PR → `POST /api/v1/quotations` with vendor list
6. **Vendors submit quotes** → `POST /api/v1/vendor-quotes`
7. **HOD picks best** → VendorQuote.is_accepted=1, quotation.status=approvel_for_po
8. **Admin creates PO** from accepted VendorQuote
9. **HOD/CFO/CEO approve PO** (same three-stage chain)
10. **Admin emails PO** to vendor
11. **Vendor accepts** → is_vendor_accepted_by=1
12. **Vendor ships; warehouse receives** → GRN created, item_recieved=1
13. **Vendor uploads invoice** → is_invoice_uploaded=1
14. **CFO approves invoice** → invoice_status=approved
15. **Finance records payment** → payment_status=payment_done, sends email
16. Done.

Every transition also creates a row in `activities` (dashboard feed) and sends a transactional email.

---

## Email templates

In `../resources/views/dashboard/` (will stay server-side, not migrated):
- pr/pr-mail, pr/status-mail, pr/rejected-mail
- po/new-po-mail, po/po-mail, po/send-po-mail-vendor, po/vendor-po-accepted-mail
- quotation/emails/qt-mail, quotation/approvel-mail, quotation/rejected-mail
- invoice/invoice-mail, invoice/proforma-invoice-mail, finance/payment-mail

Mail from: `support@myschoolmanager.in` as "Suppliers First ". Synchronous (no queue).

---

## External integrations

- **DomPDF** (`barryvdh/laravel-dompdf`): PR/PO/Invoice PDFs
- **Maatwebsite Excel**: ItemsImport, ItemsExport, ReportExport, UsersExport
- **E-invoicing**: `invoice.xml` reference file exists; GST e-invoice compliance — not integrated yet
- **SMS**: `CronSMS` command (legacy, may be inactive) — reminder 7 days before payment due
- **Storage**: local disk; folders `/pr_document`, `/po_document`, `/grn_document`, `/invoice_document`, `/document`

---

## Helpers (app/Helpers/helpers.php)

Settings: `getSetting`, `get_setting_data`, `get_profile`.
User/Role: `getRole`, `getDepartment`.
Vendor: `is_vendor_approved`, `vendor_is_active`, `get_vendor_send_mail`.
Permissions: `getSubmoduleByModule`, `assignpermission`.
Status: `getPRCurrentStatus`, `getPOCurrentStatus`, `statusCreaterName`, `PoStatusCreaterName`.
Approval routing: `checkMailCondition`, `checkMailConditionPo`.
Quote: `get_quote`, `get_vendor_accepted`.
Activity: `activity($message, $link, $sender_id, $reciver_id, $status)`.
Currency: `getIndianCurrency(n)` → Indian-format words.
Generic: `getModelById`, `getTableById`, `setActive`, `setOpen`, `calculateTimeSpan`.

---

## API shape to propose (for the Laravel rewrite)

Base: `/api/v1/`. All auth via session cookie + CSRF (same-origin) or Sanctum tokens (if we split hosts).

- `/auth/login`, `/auth/logout`, `/auth/forgot`, `/auth/reset`, `/auth/me`
- `/menus` (dynamic sidebar for current user)
- `/dashboard` (widgets + activity feed)
- `/purchase-requests` (GET list/filters, POST create, GET/:id, PUT/:id, POST/:id/status, GET/:id/history)
- `/quotations`, `/vendor-quotes` (similar shape)
- `/purchase-orders` + `/:id/accept`, `/:id/grn`, `/:id/invoice`, `/:id/payment`
- `/grns`
- `/invoices`, `/payments`
- `/masters/{items|vendors|categories|companies|…}` (CRUD)
- `/users`, `/roles`, `/permissions`
- `/reports/{type}` with filter query
- `/vendors/register/{1..5}` (public, no auth)

Use standard REST verbs. Return `{ data, meta: { pagination } }` for lists, `{ data }` for singles, `{ errors }` for 422s.
