import client from "../../../api/client.js";

export const itemsApi = {
  list: (params = {}) =>
    client.get("/items", { params }).then((r) => r.data.data),
  get: (code) => client.get(`/items/${code}`).then((r) => r.data.data),
  create: (payload) => client.post("/items", payload).then((r) => r.data.data),
  update: (code, payload) =>
    client.put(`/items/${code}`, payload).then((r) => r.data.data),
  remove: (code) => client.delete(`/items/${code}`).then((r) => r.data),
};

export default itemsApi;
