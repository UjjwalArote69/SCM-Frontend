import client from "../../api/client.js";

export const grnApi = {
  list: (params = {}) => client.get("/grns", { params }).then((r) => r.data.data),
  get: (number) => client.get(`/grns/${number}`).then((r) => r.data.data),
  create: (payload) => client.post("/grns", payload).then((r) => r.data.data),
  remove: (number) => client.delete(`/grns/${number}`).then((r) => r.data),

  /** Stream GRN as PDF; returns a Blob the caller can pipe to a download. */
  downloadPdf: (number) =>
    client
      .get(`/grns/${number}/pdf`, { responseType: "blob", params: { download: 1 } })
      .then((r) => r.data),

  // PM approval action (FLOW.md item 20)
  updateStatus: (number, payload) =>
    client.post(`/grns/${number}/status`, payload).then((r) => r.data.data),

  // Vendor accepts replacement of damaged items (FLOW.md item 19)
  acceptReplacement: (number, payload) =>
    client.post(`/grns/${number}/accept-replacement`, payload).then((r) => r.data.data),

  // Documents — invoice / proforma / tax_invoice / damage_photo
  documents: {
    list: (grnNumber) =>
      client.get("/grn-documents", { params: { grn_number: grnNumber } }).then((r) => r.data.data),
    upload: (formData) =>
      client.post("/grn-documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }).then((r) => r.data.data),
    remove: (id) => client.delete(`/grn-documents/${id}`).then((r) => r.data),
    downloadUrl: (id) => `/api/grn-documents/${id}/download`,
    /** Auth-gated blob fetch (for preview / blob-URL download). */
    getBlob: async (id) => {
      const r = await client.get(`/grn-documents/${id}/download`, { responseType: "blob" });
      return r.data;
    },
  },
};

export default grnApi;
