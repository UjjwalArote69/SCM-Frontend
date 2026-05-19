import Sidebar from "../components/nav/Sidebar.jsx";
import Topbar from "../components/nav/Topbar.jsx";
import MobilePageBack from "../components/nav/MobilePageBack.jsx";
import { useUIStore } from "../features/ui/store.js";
import { useAuthStore } from "../features/auth/store.js";
import { isSimpleUser } from "../components/nav/navConfig.js";

export default function UserLayout({ children }) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const user = useAuthStore((s) => s.user);
  const simple = isSimpleUser(user);

  // Simple users (employee / site_person): no sidebar at all — desktop or
  // mobile. Their workflow has exactly one section so a sidebar is just
  // wasted chrome. Navigation lives in the topbar's inline pill nav +
  // the avatar dropdown; the landing page itself holds the rich UX.
  if (simple) {
    return (
      <div className="min-h-screen text-text overflow-x-hidden">
        <div className="flex flex-col min-h-screen">
          <Topbar mode="simple" />
          {/* px-4 matches the negative-margin pattern the KPI strips use
              (`-mx-4`) so horizontal-scroll strips bleed cleanly to the
              edge without pushing the page width. overflow-x-hidden on
              the root is a safety net for any rogue child. */}
          <main className="flex-1 overflow-x-hidden px-4 py-4 sm:p-6 md:p-10">
            <MobilePageBack />
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-text">
      <Sidebar audience="user" />
      <div
        className={`flex flex-col min-h-screen transition-[margin] duration-200 ${
          collapsed ? "md:ml-16" : "md:ml-64"
        }`}
      >
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <MobilePageBack />
          {children}
        </main>
      </div>
    </div>
  );
}
