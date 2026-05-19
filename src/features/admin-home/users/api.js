import client from "../../../api/client.js";

export const usersApi = {
  list: (params = {}) =>
    client.get("/admin/users", { params }).then((r) => r.data.data),
  get: (id) => client.get(`/admin/users/${id}`).then((r) => r.data.data),
  create: (payload) =>
    client.post("/admin/users", payload).then((r) => r.data.data),
  update: (id, payload) =>
    client.put(`/admin/users/${id}`, payload).then((r) => r.data.data),
  remove: (id) => client.delete(`/admin/users/${id}`).then((r) => r.data),

  // Per-user permission overrides — additive on top of role-wide and
  // role+dept grants. See UserPermissionController for the resolution
  // semantics.
  permissions: {
    get: (id) =>
      client.get(`/admin/users/${id}/permissions`).then((r) => r.data.data),
    update: (id, permissions) =>
      client
        .put(`/admin/users/${id}/permissions`, { permissions })
        .then((r) => r.data.data),
  },
};

export default usersApi;
