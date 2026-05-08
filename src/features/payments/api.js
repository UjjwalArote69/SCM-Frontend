import client from "../../api/client.js";

export const paymentApi = {
  list: (params = {}) =>
    client.get("/payments", { params }).then((r) => r.data.data),
  get: (number) => client.get(`/payments/${number}`).then((r) => r.data.data),
  create: (payload) =>
    client.post("/payments", payload).then((r) => r.data.data),
  updateStatus: (number, payload) =>
    client
      .post(`/payments/${number}/status`, payload)
      .then((r) => r.data.data),
  markPaid: (number, payload = {}) =>
    client
      .post(`/payments/${number}/mark-paid`, payload)
      .then((r) => r.data.data),
  remove: (number) => client.delete(`/payments/${number}`).then((r) => r.data),

  /** Stream payment voucher as PDF; returns a Blob. */
  downloadPdf: (number) =>
    client
      .get(`/payments/${number}/pdf`, { responseType: "blob", params: { download: 1 } })
      .then((r) => r.data),
};

export default paymentApi;
