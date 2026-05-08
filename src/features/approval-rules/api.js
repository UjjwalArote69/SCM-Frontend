import client from "../../api/client.js";

export const approvalRulesApi = {
  list: (params = {}) =>
    client.get("/approval-rules", { params }).then((r) => r.data.data),
  get: (id) => client.get(`/approval-rules/${id}`).then((r) => r.data.data),
  create: (payload) =>
    client.post("/approval-rules", payload).then((r) => r.data.data),
  update: (id, payload) =>
    client.put(`/approval-rules/${id}`, payload).then((r) => r.data.data),
  remove: (id) => client.delete(`/approval-rules/${id}`).then((r) => r.data),
  preview: (payload) =>
    client.post("/approval-rules/preview", payload).then((r) => r.data.data),
};

export default approvalRulesApi;
