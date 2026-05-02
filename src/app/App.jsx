import { useEffect } from "react";
import Providers from "./providers.jsx";
import AppRoutes from "./routes.jsx";
import { useAuthStore } from "../features/auth/store.js";

/**
 * On mount: refresh the cached user from the server so a stale
 * (or tampered) localStorage can't outlive a page load.
 */
function AuthBootstrap({ children }) {
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (token) fetchMe();
    // run once per mount — token can change later via login/logout
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return children;
}

export default function App() {
  return (
    <Providers>
      <AuthBootstrap>
        <AppRoutes />
      </AuthBootstrap>
    </Providers>
  );
}
