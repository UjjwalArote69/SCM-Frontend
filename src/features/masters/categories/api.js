import client from "../../../api/client.js";

export const categoriesApi = {
  list: (params = {}) =>
    client.get("/categories", { params }).then((r) => r.data.data),
  create: (payload) =>
    client.post("/categories", payload).then((r) => r.data.data),
  update: (id, payload) =>
    client.put(`/categories/${id}`, payload).then((r) => r.data.data),
  remove: (id) => client.delete(`/categories/${id}`).then((r) => r.data),
};

export default categoriesApi;
