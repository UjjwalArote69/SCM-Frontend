import axios from "axios";

/**
 * Shared axios instance.
 *
 * Defaults to 127.0.0.1 (NOT "localhost") because the Laravel dev server
 * (`php artisan serve --host=127.0.0.1`) only listens on IPv4. On Windows,
 * "localhost" resolves to ::1 (IPv6) first; with no IPv6 listener the
 * browser eats a 1–3 s connection timeout per request before falling back
 * to IPv4. Hardcoding 127.0.0.1 skips that and login is instant.
 *
 * Override with VITE_API_URL in scm-frontend/.env.local
 */
export const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

const client = axios.create({
  baseURL: API_URL,
  timeout: 8000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

client.interceptors.request.use((config) => {
  const raw = localStorage.getItem("scm-auth");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const token = parsed?.state?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      /* ignore */
    }
  }
  return config;
});

export default client;
