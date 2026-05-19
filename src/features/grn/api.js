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

  // Vendor responds to replacement (items 25, 26, 28, 36, 38).
  //   action='accept'  → vendor agrees with site's date. payload: { action, commitment_note?, items? }
  //   action='counter' → vendor proposes a new date.     payload: { action, target_date, commitment_note?, items? }
  acceptReplacement: (number, payload) =>
    client.post(`/grns/${number}/accept-replacement`, payload).then((r) => r.data.data),

  // Site / PM responds to vendor's counter (item 38).
  //   action='accept'  → site agrees with vendor's date. payload: { action, note? }
  //   action='counter' → site proposes a new date back.  payload: { action, target_date, note? }
  siteRespondTargetDate: (number, payload) =>
    client.post(`/grns/${number}/site-respond-date`, payload).then((r) => r.data.data),

  // Vendor disputes the damage report entirely (item 25).
  // payload: { comment: string }
  rejectReplacement: (number, payload) =>
    client.post(`/grns/${number}/reject-replacement`, payload).then((r) => r.data.data),

  // Free-form voice / text note from vendor or admin. Body: { comment?, voice_note? }
  vendorNote: (number, payload) =>
    client.post(`/grns/${number}/vendor-note`, payload).then((r) => r.data.data),

  // Admin-only chain override — rewind / force_reject / force_approve.
  // Body: { to_stage, action, comment, voice_note? }
  adminChainOverride: (number, payload) =>
    client.post(`/grns/${number}/admin-chain-override`, payload).then((r) => r.data.data),

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
