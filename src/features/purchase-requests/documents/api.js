import client from "../../../api/client.js";

/**
 * PR document API. Mirrors `po-documents` so a single React document UI can
 * be shared between PR and PO flows down the road.
 */
export const prDocumentsApi = {
  list: (prNumber) =>
    client
      .get("/pr-documents", { params: { pr_number: prNumber } })
      .then((r) => r.data?.data ?? []),

  /**
   * Upload one file against a PR. `file` is a File from <input type="file">.
   * Returns the created document record.
   */
  upload: ({ pr_number, file, doc_type = "attachment" }) => {
    const fd = new FormData();
    fd.append("pr_number", pr_number);
    fd.append("doc_type", doc_type);
    fd.append("file", file);
    return client
      .post("/pr-documents", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data?.data);
  },

  /**
   * Auth-gated download. Streams the binary as a blob and triggers a
   * client-side save. Resolves once the download is initiated.
   */
  download: async (id, filename) => {
    const res = await client.get(`/pr-documents/${id}/download`, {
      responseType: "blob",
    });
    const blob = new Blob([res.data], {
      type: res.headers["content-type"] || "application/octet-stream",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `attachment-${id}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  /** Auth-gated blob fetch for inline preview / thumbnails. */
  getBlob: async (id) => {
    const r = await client.get(`/pr-documents/${id}/download`, { responseType: "blob" });
    return r.data;
  },

  remove: (id) => client.delete(`/pr-documents/${id}`).then((r) => r.data),
};

export default prDocumentsApi;
