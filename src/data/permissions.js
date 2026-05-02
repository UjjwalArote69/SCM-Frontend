/**
 * Role → allowed actions matrix.
 * Action names are verbs on resources: "pr.create", "po.approve", etc.
 * Populate as each feature lands. Used by hooks/useCan and utils/rbac.
 */

import { ROLES } from "./roles.js";

export const PERMISSIONS = {
  [ROLES.EMPLOYEE]: new Set([
    "pr.create",
    "pr.view.own",
    "quote.view",
    "po.view.own",
    "grn.view.own",
    "profile.edit",
  ]),
  [ROLES.MANAGER]: new Set([
    "pr.create",
    "pr.view.team",
    "pr.approve.l1",
    "quote.create",
    "quote.view",
    "po.view.team",
    "grn.view.team",
    "reports.view",
    "profile.edit",
  ]),
  [ROLES.HOD]: new Set([
    "pr.create",
    "pr.view.department",
    "pr.approve.l2",
    "po.approve",
    "quote.approve",
    "grn.view.department",
    "reports.view",
    "profile.edit",
  ]),
  [ROLES.VENDOR]: new Set([
    "vendor.po.view",
    "vendor.po.accept",
    "vendor.quote.submit",
    "vendor.invoice.upload",
    "profile.edit",
  ]),
  [ROLES.ADMIN]: new Set(["*"]),
};

export function hasPermission(role, action) {
  const allowed = PERMISSIONS[role];
  if (!allowed) return false;
  return allowed.has("*") || allowed.has(action);
}
