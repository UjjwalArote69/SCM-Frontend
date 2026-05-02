/**
 * Auth-area button. Primary = red gradient. Secondary = outlined.
 */
export default function Button({
  variant = "primary",
  className = "",
  children,
  ...rest
}) {
  const base =
    "w-full h-[40px] inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed";

  const variants = {
    primary: `text-primary-foreground shadow-sm hover:brightness-110 active:scale-[0.99]`,
    secondary:
      "border border-outline-variant bg-transparent text-text hover:bg-surface-container-low",
  };

  const style =
    variant === "primary"
      ? {
          background:
            "linear-gradient(135deg, var(--color-primary-hover) 0%, var(--color-primary) 100%)",
        }
      : undefined;

  return (
    <button
      type="button"
      style={style}
      className={`${base} ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
