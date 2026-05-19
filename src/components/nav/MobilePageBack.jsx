import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * Mobile-only back button — renders INSIDE the page content area at the top
 * left, on every audience layout. Hidden on desktop (md+) where the sidebar
 * is already the navigational anchor, and hidden on root/home pages where
 * there's nothing semantically "up" from here.
 *
 * Defends against deep-link entry: if window.history is empty (user opened
 * the URL in a fresh tab), navigate(-1) would exit the app — fall back to
 * the audience home instead so users don't get bounced out.
 */
const ROOT_PATHS = new Set(["/", "/app", "/admin", "/vendor", "/login"]);

export default function MobilePageBack() {
  const location = useLocation();
  const navigate = useNavigate();

  if (ROOT_PATHS.has(location.pathname)) return null;

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    const home = location.pathname.startsWith("/admin")
      ? "/admin"
      : location.pathname.startsWith("/vendor")
        ? "/vendor"
        : "/app";
    navigate(home, { replace: true });
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className="md:hidden inline-flex items-center gap-1.5 mb-3 text-[12.5px] font-semibold text-text-muted hover:text-primary px-2.5 py-1.5 -ml-2.5 rounded-full hover:bg-surface-container-low transition-colors active:scale-95"
      aria-label="Go back"
    >
      <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
      Back
    </button>
  );
}
