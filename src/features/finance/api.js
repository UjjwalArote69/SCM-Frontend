import client from "../../api/client.js";

export const invoiceApi = {
  list: (params = {}) =>
    client.get("/invoices", { params }).then((r) => r.data.data),
  get: (number) =>
    client.get(`/invoices/${number}`).then((r) => r.data.data),
  create: (payload) =>
    client.post("/invoices", payload).then((r) => r.data.data),
  updateStatus: (number, payload) =>
    client.post(`/invoices/${number}/status`, payload).then((r) => r.data.data),
  remove: (number) =>
    client.delete(`/invoices/${number}`).then((r) => r.data),
};

export default invoiceApi;
