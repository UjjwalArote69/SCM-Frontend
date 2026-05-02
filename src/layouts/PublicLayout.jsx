import { Boxes } from "lucide-react";
import { Link } from "react-router-dom";
import ThemeToggle from "../components/ui/ThemeToggle.jsx";

export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-6 md:px-8">
        <Link to="/" className="flex items-center gap-2">
          <Boxes className="h-6 w-6 text-primary" strokeWidth={2.25} />
          <span className="text-primary font-black tracking-tighter text-xl uppercase">
            SCM
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            to="/login"
            className="text-sm font-semibold text-primary hover:brightness-110 uppercase tracking-wide"
          >
            Sign in
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
