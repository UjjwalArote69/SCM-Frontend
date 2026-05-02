import client from "../../api/client.js";

export const prApi = {
  list: (params = {}) => client.get("/prs", { params }).then((r) => r.data.data),
  get: (number) => client.get(`/prs/${number}`).then((r) => r.data.data),
  create: (payload) => client.post("/prs", payload).then((r) => r.data.data),
  updateStatus: (number, payload) =>
    client.post(`/prs/${number}/status`, payload).then((r) => r.data.data),
  assignRfqAuthor: (number, userId) =>
    client
      .post(`/prs/${number}/assign-rfq-author`, { user_id: userId })
      .then((r) => r.data.data),
  remove: (number) => client.delete(`/prs/${number}`).then((r) => r.data),
};

export const userApi = {
  listPurchaseOfficers: () =>
    client.get("/users/purchase-officers").then((r) => r.data.data),
};

export default prApi;
