import client from "../../../api/client.js";

export const rolePermissionsApi = {
  list: () => client.get("/roles-permissions").then((r) => r.data.data),
  update: (role, permissions) =>
    client.put(`/roles-permissions/${role}`, { permissions }).then((r) => r.data.data),
};

export default rolePermissionsApi;
