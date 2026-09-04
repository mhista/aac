import Link from "next/link";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "on-inverse";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-3 rounded-pill font-medium transition-colors duration-hover ease-entrance min-h-[44px] disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--color-action-primary)] text-white hover:bg-[var(--color-action-primary-hover)] active:bg-[var(--color-action-primary-active)]",
  secondary:
    "border border-[var(--color-action-secondary-border)] text-[var(--color-action-secondary-text)] hover:bg-[var(--color-action-secondary-hover-surface)]",
  ghost:
    "text-[var(--color-action-ghost-text)] hover:bg-[var(--color-action-ghost-hover-surface)]",
  "on-inverse":
    "bg-white text-[var(--color-action-on-inverse-text)] hover:bg-[var(--color-violet-100)]",
};

const sizes: Record<Size, string> = {
  sm: "px-4 py-2 text-caption",
  md: "px-6 py-3 text-body",
  lg: "px-8 py-4 text-body-l",
};

export function Button({
  href,
  variant = "primary",
  size = "md",
  arrow = false,
  className,
  children,
  ...rest
}: {
  href?: string;
  variant?: Variant;
  size?: Size;
  arrow?: boolean;
  className?: string;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = clsx(base, variants[variant], sizes[size], className);
  const content = (
    <>
      {children}
      {arrow && (
        <span aria-hidden="true" className="transition-transform duration-hover ease-entrance group-hover:translate-x-1">
          →
        </span>
      )}
    </>
  );

  if (href) {
    const external = href.startsWith("http") || href.startsWith("mailto:");
    if (external) {
      return (
        <a href={href} className={clsx(cls, "group")} rel="noopener noreferrer">
          {content}
        </a>
      );
    }
    return (
      <Link href={href} className={clsx(cls, "group")}>
        {content}
      </Link>
    );
  }

  return (
    <button className={clsx(cls, "group")} {...rest}>
      {content}
    </button>
  );
}
