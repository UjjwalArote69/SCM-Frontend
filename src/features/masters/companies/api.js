import client from "../../../api/client.js";

export const companiesApi = {
  list: (params = {}) =>
    client.get("/companies", { params }).then((r) => r.data.data),
  create: (payload) =>
    client.post("/companies", payload).then((r) => r.data.data),
  update: (code, payload) =>
    client.put(`/companies/${code}`, payload).then((r) => r.data.data),
  remove: (code) => client.delete(`/companies/${code}`).then((r) => r.data),
};

export default companiesApi;
