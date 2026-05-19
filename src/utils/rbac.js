import { USER_PORTAL_ROLES, ROLES } from "../data/roles.js";
import { hasPermission } from "../data/permissions.js";

export function isUserRole(role) {
  return USER_PORTAL_ROLES.includes(role);
}

export function isVendor(role) {
  return role === ROLES.VENDOR;
}

export function isAdmin(role) {
  return role === ROLES.ADMIN;
}

export function can(role, action) {
  return hasPermission(role, action);
}
