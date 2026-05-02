import client from "../../../api/client.js";

export const departmentsApi = {
  list: () => client.get("/departments").then((r) => r.data.data),
  get: (code) => client.get(`/departments/${code}`).then((r) => r.data.data),
  create: (payload) =>
    client.post("/departments", payload).then((r) => r.data.data),
  update: (code, payload) =>
    client.put(`/departments/${code}`, payload).then((r) => r.data.data),
  remove: (code, { force = false } = {}) =>
    client
      .delete(`/departments/${code}`, { params: force ? { force: 1 } : {} })
      .then((r) => r.data),
};

export default departmentsApi;
