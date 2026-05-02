import client from "../../../api/client.js";

export const vendorsApi = {
  list: (params = {}) =>
    client.get("/vendors", { params }).then((r) => r.data.data),
  get: (code) => client.get(`/vendors/${code}`).then((r) => r.data.data),
  create: (payload) => client.post("/vendors", payload).then((r) => r.data.data),
  update: (code, payload) =>
    client.put(`/vendors/${code}`, payload).then((r) => r.data.data),
  remove: (code) => client.delete(`/vendors/${code}`).then((r) => r.data),
};

export default vendorsApi;
