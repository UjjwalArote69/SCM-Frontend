import client from "../../api/client.js";

export const authApi = {
  login: (email, password) =>
    client.post("/login", { email, password }).then((r) => r.data),

  logout: () => client.post("/logout").then((r) => r.data),

  me: () => client.get("/me").then((r) => r.data),

  updateMe: (payload) => client.put("/me", payload).then((r) => r.data),

  /**
   * Upload (or replace) the caller's profile picture.
   * `file` is a File from <input type="file">. Returns the updated user.
   */
  uploadAvatar: (file) => {
    const fd = new FormData();
    fd.append("avatar", file);
    return client
      .post("/me/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  /** Remove the caller's avatar (revert to initials). Returns the updated user. */
  removeAvatar: () => client.delete("/me/avatar").then((r) => r.data),
};

export default authApi;
