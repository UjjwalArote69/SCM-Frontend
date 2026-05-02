import client from "../../api/client.js";

export const vendorFeedbackApi = {
  list: (params = {}) =>
    client.get("/vendor-feedback", { params }).then((r) => r.data.data),

  create: (payload) =>
    client.post("/vendor-feedback", payload).then((r) => r.data.data),

  remove: (id) =>
    client.delete(`/vendor-feedback/${id}`).then((r) => r.data),
};

export default vendorFeedbackApi;
