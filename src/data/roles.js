/**
 * Role identity — single source of truth.
 *
 * Backend stores a string `role` column on `users`. Current DB values seen:
 *   admin, manager, employee, hod, vendor
 *
 * Additional roles referenced in legacy code / typical enterprise flows
 * (not yet present in users table but supported by the UI enum):
 *   cfo, ceo, director, accountant, purchase_officer, customer
 */

export const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  EMPLOYEE: "employee",
  HOD: "hod",
  CFO: "cfo",
  CEO: "ceo",
  DIRECTOR: "director",
  ACCOUNTANT: "accountant",
  PURCHASE_OFFICER: "purchase_officer",
  VENDOR: "vendor",
  CUSTOMER: "customer",
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: "Administrator",
  [ROLES.MANAGER]: "Manager",
  [ROLES.EMPLOYEE]: "Employee",
  [ROLES.HOD]: "Head of Department",
  [ROLES.CFO]: "CFO",
  [ROLES.CEO]: "CEO",
  [ROLES.DIRECTOR]: "Director",
  [ROLES.ACCOUNTANT]: "Accountant",
  [ROLES.PURCHASE_OFFICER]: "Purchase Officer",
  [ROLES.VENDOR]: "Vendor",
  [ROLES.CUSTOMER]: "Customer",
};

/** Short label used in the sidebar/top-bar workspace chip. */
export const ROLE_SHORT_LABELS = {
  [ROLES.ADMIN]: "Admin",
  [ROLES.MANAGER]: "Manager",
  [ROLES.EMPLOYEE]: "Employee",
  [ROLES.HOD]: "HOD",
  [ROLES.CFO]: "CFO",
  [ROLES.CEO]: "CEO",
  [ROLES.DIRECTOR]: "Director",
  [ROLES.ACCOUNTANT]: "Accountant",
  [ROLES.PURCHASE_OFFICER]: "Purchase",
  [ROLES.VENDOR]: "Vendor",
  [ROLES.CUSTOMER]: "Customer",
};

/** Where each role lands after login. */
export const ROLE_HOME = {
  [ROLES.ADMIN]: "/admin",
  [ROLES.MANAGER]: "/app",
  [ROLES.EMPLOYEE]: "/app",
  [ROLES.HOD]: "/app",
  [ROLES.CFO]: "/app",
  [ROLES.CEO]: "/app",
  [ROLES.DIRECTOR]: "/app",
  [ROLES.ACCOUNTANT]: "/app",
  [ROLES.PURCHASE_OFFICER]: "/app",
  [ROLES.VENDOR]: "/vendor",
  [ROLES.CUSTOMER]: "/app",
};

/** Which audience/layout each role renders inside. */
export const ROLE_AUDIENCE = {
  [ROLES.ADMIN]: "admin",
  [ROLES.MANAGER]: "user",
  [ROLES.EMPLOYEE]: "user",
  [ROLES.HOD]: "user",
  [ROLES.CFO]: "user",
  [ROLES.CEO]: "user",
  [ROLES.DIRECTOR]: "user",
  [ROLES.ACCOUNTANT]: "user",
  [ROLES.PURCHASE_OFFICER]: "user",
  [ROLES.VENDOR]: "vendor",
  [ROLES.CUSTOMER]: "user",
};

export const USER_PORTAL_ROLES = [
  ROLES.EMPLOYEE,
  ROLES.MANAGER,
  ROLES.HOD,
  ROLES.CFO,
  ROLES.CEO,
  ROLES.DIRECTOR,
  ROLES.ACCOUNTANT,
  ROLES.PURCHASE_OFFICER,
  ROLES.CUSTOMER,
];

/** Options list for dropdowns (e.g. admin user create/edit). */
export const ALL_ROLE_OPTIONS = Object.values(ROLES).map((r) => ({
  value: r,
  label: ROLE_LABELS[r],
}));

export function labelForRole(role, fallback = "User") {
  return ROLE_LABELS[role] ?? fallback;
}

export function shortLabelForRole(role, fallback = "User") {
  return ROLE_SHORT_LABELS[role] ?? fallback;
}

/**
 * Department-aware role label.
 *   HOD + dept   → "Procurement HOD"
 *   non-HOD + dept → "Engineering Manager", "Procurement Officer"
 *   no dept       → falls back to plain role label
 *
 * Pass `{ short: true }` for the topbar chip, which prefers the short
 * department name (code) when the full name is too long.
 */
export function formatUserRole(user, { short = false } = {}) {
  if (!user?.role) return "User";
  const role = user.role;
  const dept = user.department; // { id, code, name } or null

  if (role === ROLES.HOD && dept) {
    return `${dept.name} HOD`;
  }

  const baseLabel = short
    ? ROLE_SHORT_LABELS[role] ?? role
    : ROLE_LABELS[role] ?? role;

  if (!dept) return baseLabel;

  // Non-HOD with department: "Engineering Manager", "Manufacturing Employee", etc.
  // Purchase Officer in the Purchase dept reads as just "Purchase Officer"
  // (skip the redundant department prefix). Same for Procurement.
  if (role === ROLES.PURCHASE_OFFICER && (dept.code === "PURCH" || dept.code === "PROC")) {
    return short
      ? dept.code === "PURCH" ? "Purchase" : "Procurement"
      : dept.code === "PURCH" ? "Purchase Officer" : "Procurement Officer";
  }
  return short ? `${dept.code} ${baseLabel}` : `${dept.name} ${baseLabel}`;
}
