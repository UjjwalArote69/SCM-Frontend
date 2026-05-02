import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../hooks/useTheme.jsx";

export default function ThemeToggle({ className = "", variant = "default" }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const base =
    "inline-flex items-center justify-center h-9 w-9 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

  const styles =
    variant === "inverse"
      ? "text-white/85 hover:bg-white/10"
      : "text-text-muted hover:text-primary hover:bg-surface-container-low border border-border";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className={`${base} ${styles} ${className}`}
    >
      {isDark ? (
        <Sun className="h-4 w-4" strokeWidth={2} />
      ) : (
        <Moon className="h-4 w-4" strokeWidth={2} />
      )}
    </button>
  );
}
