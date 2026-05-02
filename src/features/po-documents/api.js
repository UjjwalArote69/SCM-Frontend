import client from "../../api/client.js";

/**
 * Backend-portable contract — see PoDocumentController docblock. The frontend
 * never knows where files live (`/api/po-documents/{id}/download` is opaque)
 * so a future Node.js swap is a one-line change.
 */
export const poDocumentsApi = {
  list: (params = {}) =>
    client.get("/po-documents", { params }).then((r) => r.data.data),

  get: (id) => client.get(`/po-documents/${id}`).then((r) => r.data.data),

  /**
   * Multipart upload. Returns the new document record (contract shape).
   * `onProgress` receives 0..1 for progress UI.
   */
  upload: ({ po_number, doc_type, file }, onProgress) => {
    const fd = new FormData();
    fd.append("po_number", po_number);
    fd.append("doc_type", doc_type);
    fd.append("file", file);
    return client
      .post("/po-documents", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (!onProgress || !e.total) return;
          onProgress(e.loaded / e.total);
        },
      })
      .then((r) => r.data.data);
  },

  /**
   * Auth-gated streaming download. We fetch as a blob (so the bearer token
   * rides on the request), then trigger a clientside download.
   * This pattern is identical regardless of the backend stack.
   */
  download: async (id, filename = "document") => {
    const r = await client.get(`/po-documents/${id}/download`, {
      responseType: "blob",
    });
    const url = URL.createObjectURL(r.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  remove: (id) =>
    client.delete(`/po-documents/${id}`).then((r) => r.data),
};

export default poDocumentsApi;
