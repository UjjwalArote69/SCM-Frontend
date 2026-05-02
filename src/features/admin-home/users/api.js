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
};

export default usersApi;
