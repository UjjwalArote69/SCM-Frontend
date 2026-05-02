import client from "../../api/client.js";

export const poApi = {
  list: (params = {}) => client.get("/pos", { params }).then((r) => r.data.data),
  get: (number) => client.get(`/pos/${number}`).then((r) => r.data.data),
  create: (payload) => client.post("/pos", payload).then((r) => r.data.data),
  updateStatus: (number, payload) =>
    client.post(`/pos/${number}/status`, payload).then((r) => r.data.data),
  accept: (number) => client.post(`/pos/${number}/accept`).then((r) => r.data.data),
  reject: (number) => client.post(`/pos/${number}/reject`).then((r) => r.data.data),
  remove: (number) => client.delete(`/pos/${number}`).then((r) => r.data),
};

export default poApi;
