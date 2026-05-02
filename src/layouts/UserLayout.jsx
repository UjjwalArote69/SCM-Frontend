import Sidebar from "../components/nav/Sidebar.jsx";
import Topbar from "../components/nav/Topbar.jsx";
import { useUIStore } from "../features/ui/store.js";

export default function UserLayout({ children }) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  return (
    <div className="min-h-screen bg-bg text-text">
      <Sidebar audience="user" />
      <div
        className={`flex flex-col min-h-screen transition-[margin] duration-200 ${
          collapsed ? "md:ml-16" : "md:ml-64"
        }`}
      >
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
