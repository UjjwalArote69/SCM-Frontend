/**
 * Shared enums / dropdown option lists.
 *
 * Some of these reflect values that actually exist in the fresh backend
 * (as string columns on app_prs/app_pos/app_rfqs/app_grns/app_vendors).
 * Others are UI-side dropdown placeholders for master-data that doesn't
 * yet have its own backend table (departments, work locations, business
 * units, etc.). When those tables are added to Laravel, replace the
 * hardcoded arrays here with `fetchAll()` calls from their stores.
 */

// ---------- Statuses backed by real DB columns ----------

/** app_prs.status */
export const PR_STATUSES = ["pending", "approved", "rejected", "cancelled"];

/** app_prs.chain_stage */
export const PR_CHAIN_STAGES = ["hod", "cfo", "ceo", "done"];

/** app_pos.status */
export const PO_STATUSES = ["pending", "accepted", "rejected", "fulfilled"];

/** app_rfqs.status */
export const RFQ_STATUSES = ["open", "compared", "awarded", "closed"];

/** app_grns.status (auto-derived from items) */
export const GRN_STATUSES = ["partial", "full"];

/** app_vendors.approval_status */
export const VENDOR_APPROVAL_STATUSES = ["pending", "approved", "suspended"];

/** app_vendors.vendor_status — legal entity type, from the admin drawer + legacy blade */
export const VENDOR_LEGAL_STATUSES = [
  "individual",
  "huf",
  "partnership",
  "firm",
  "company",
  "trust",
  "aop",
  "boi",
];

/** app_vendors.udhyam */
export const UDHYAM_OPTIONS = ["yes", "no"];

// ---------- Enums without a DB table yet (UI placeholders) ----------

/**
 * Departments. Legacy blade references `department_id` 0..4 but the
 * departments table doesn't exist in the fresh schema. These strings are
 * placeholder options; add a `departments` table + endpoint to drive this
 * from the backend later.
 */
export const DEPARTMENTS = [
  "Administration",
  "Procurement",
  "Finance",
  "Engineering",
  "Manufacturing",
  "Operations",
  "Sales",
  "IT",
  "HR",
  "Legal",
  "Quality",
  "R&D",
];

/**
 * Business Units. Legacy has a `business_units` table; fresh backend
 * stores a free-text string on app_prs/app_pos. These options match the
 *  layout.
 */
export const BUSINESS_UNITS = [
  "HQ",
  "Manufacturing",
  "Distribution",
  "Services",
  "Retail",
];

/**
 * Work locations / circles. No DB backing yet — free text placeholder.
 */
export const WORK_LOCATIONS = [
  "Bangalore HQ",
  "Mumbai Office",
  "Delhi NCR",
  "Chennai Plant",
  "Pune Warehouse",
  "Hyderabad Branch",
  "Kolkata Office",
];

/** Priorities used on PR creation. */
export const PRIORITIES = ["low", "standard", "high", "urgent"];

// ---------- Label helpers ----------

export const STATUS_TONES = {
  // Generic approval-style
  pending: "warning",
  approved: "success",
  rejected: "danger",
  cancelled: "neutral",
  suspended: "danger",
  // PO
  accepted: "success",
  fulfilled: "success",
  // RFQ
  open: "info",
  compared: "info",
  awarded: "success",
  closed: "neutral",
  // GRN
  partial: "warning",
  full: "success",
  // Chain stages
  hod: "info",
  cfo: "info",
  ceo: "info",
  done: "success",
};

export function toneForStatus(status, fallback = "neutral") {
  return STATUS_TONES[status] ?? fallback;
}

export function capitalize(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
