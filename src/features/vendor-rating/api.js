import client from "../../api/client.js";

export const vendorRatingApi = {
  list: (vendorName) =>
    client
      .get("/vendor-ratings", { params: { vendor_name: vendorName } })
      .then((r) => r.data),

  me: (vendorName) =>
    client
      .get("/vendor-ratings/me", { params: { vendor_name: vendorName } })
      .then((r) => r.data.data),

  upsert: (payload) =>
    client.post("/vendor-ratings", payload).then((r) => r.data.data),

  remove: (id) =>
    client.delete(`/vendor-ratings/${id}`).then((r) => r.data),
};

export default vendorRatingApi;
