import client from "../../../api/client.js";

export const settingsApi = {
  get: () => client.get("/settings").then((r) => r.data.data),
  update: (payload) => client.put("/settings", payload).then((r) => r.data.data),
  uploadLogo: (file) => {
    const fd = new FormData();
    fd.append("logo", file);
    return client
      .post("/settings/logo", fd, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => r.data.data);
  },
  deleteLogo: () => client.delete("/settings/logo").then((r) => r.data.data),
};

export default settingsApi;
