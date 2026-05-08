import client from "../../../api/client.js";

export const projectsApi = {
  list: (params = {}) =>
    client.get("/projects", { params }).then((r) => r.data.data),
  create: (payload) =>
    client.post("/projects", payload).then((r) => r.data.data),
  update: (code, payload) =>
    client.put(`/projects/${code}`, payload).then((r) => r.data.data),
  remove: (code) => client.delete(`/projects/${code}`).then((r) => r.data),
};

export default projectsApi;
