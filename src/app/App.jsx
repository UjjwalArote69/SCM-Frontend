import { useEffect, useState } from "react";
import Providers from "./providers.jsx";
import AppRoutes from "./routes.jsx";
import { useAuthStore } from "../features/auth/store.js";
import AnimatedSplash from "../components/boot/AnimatedSplash.jsx";

// One-shot per browser tab: the splash plays on the very first paint of
// each tab/session. SPA navigations inside the app don't re-trigger it.
const SPLASH_FLAG = "scm-splash-shown";

/**
 * On mount: refresh the cached user from the server so a stale
 * (or tampered) localStorage can't outlive a page load.
 *
 * Signals to the parent when the bootstrap is done via `onReady` so
 * the splash can hand off as soon as we have a real user (or a confirmed
 * "no token" — both flows resolve `ready=true`).
 */
function AuthBootstrap({ children, onReady }) {
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    let cancelled = false;
    const finish = () => { if (!cancelled) onReady?.(); };
    if (token) {
      fetchMe().finally(finish);
    } else {
      finish();
    }
    return () => { cancelled = true; };
    // run once per mount — token can change later via login/logout
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return children;
}

export default function App() {
  // Show the splash on every fresh tab load. We persist a flag in
  // sessionStorage so a soft remount within the same tab doesn't re-play
  // it (defensive — we don't expect that today).
  const alreadyShown = typeof window !== "undefined"
    && sessionStorage.getItem(SPLASH_FLAG) === "1";
  const [splashVisible, setSplashVisible] = useState(!alreadyShown);
  const [bootReady, setBootReady] = useState(false);

  const handleSplashExited = () => {
    setSplashVisible(false);
    try { sessionStorage.setItem(SPLASH_FLAG, "1"); } catch { /* private mode */ }
  };

  return (
    <Providers>
      <AuthBootstrap onReady={() => setBootReady(true)}>
        <AppRoutes />
      </AuthBootstrap>
      {splashVisible && (
        <AnimatedSplash ready={bootReady} onExited={handleSplashExited} />
      )}
    </Providers>
  );
}
