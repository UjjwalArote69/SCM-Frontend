import client from "../../api/client.js";

export const grnApi = {
  list: (params = {}) => client.get("/grns", { params }).then((r) => r.data.data),
  get: (number) => client.get(`/grns/${number}`).then((r) => r.data.data),
  create: (payload) => client.post("/grns", payload).then((r) => r.data.data),
  remove: (number) => client.delete(`/grns/${number}`).then((r) => r.data),
};

export default grnApi;
