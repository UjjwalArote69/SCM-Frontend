import client from "../../../api/client.js";

/**
 * Server returns:
 *   { permissions: [...], departments: [...],
 *     matrix: { role: { department_code: [code, ...] } } }
 *
 * department_code === "" means "applies to every user of this role"; a
 * non-empty code (e.g. "FIN") narrows the grant to users whose department
 * matches that code. The UI represents '' as a "Default" tab and lets the
 * admin add department-specific override slots.
 */
export const rolePermissionsApi = {
  list: () => client.get("/roles-permissions").then((r) => r.data.data),
  update: (role, deptCode, permissions) =>
    client
      .put(`/roles-permissions/${role}`, {
        department_code: deptCode ?? "",
        permissions,
      })
      .then((r) => r.data.data),
};

export default rolePermissionsApi;
