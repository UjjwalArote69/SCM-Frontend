import client from "../../api/client.js";

export const rfqApi = {
  list: (params = {}) => client.get("/rfqs", { params }).then((r) => r.data.data),
  get: (number) => client.get(`/rfqs/${number}`).then((r) => r.data.data),
  create: (payload) => client.post("/rfqs", payload).then((r) => r.data.data),
  award: (number, vendor) =>
    client.post(`/rfqs/${number}/award`, { vendor }).then((r) => r.data.data),
  close: (number) =>
    client.post(`/rfqs/${number}/close`).then((r) => r.data.data),
  submit: (number, payload) =>
    client.post(`/rfqs/${number}/submit`, payload).then((r) => r.data.data),
  // Award flow (FLOW.md §3)
  agree: (number, vendor) =>
    client.post(`/rfqs/${number}/agree`, { vendor }).then((r) => r.data.data),
  withdrawAgreement: (number) =>
    client.post(`/rfqs/${number}/withdraw-agreement`).then((r) => r.data.data),
  updateStatus: (number, action, comments) =>
    client
      .post(`/rfqs/${number}/status`, { action, comments })
      .then((r) => r.data.data),
  assignPoAuthor: (number, userId) =>
    client
      .post(`/rfqs/${number}/assign-po-author`, { user_id: userId })
      .then((r) => r.data.data),
  remove: (number) => client.delete(`/rfqs/${number}`).then((r) => r.data),
};

export default rfqApi;
