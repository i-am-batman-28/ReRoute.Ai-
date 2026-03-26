import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/cn";

const variants = {
  primary:
    "bg-[color:var(--primary)] text-[color:var(--bg)] hover:bg-[color:var(--primary-strong)] focus-visible:ring-[color:var(--primary-soft)] disabled:opacity-50",
  secondary:
    "border border-[color:var(--stroke)] bg-[color:var(--surface-1)] text-[color:var(--fg)] hover:bg-[color:var(--surface-2)] focus-visible:ring-[color:var(--primary-soft)] disabled:opacity-50",
  ghost:
    "text-[color:var(--muted)] hover:bg-[color:var(--surface-1)] hover:text-[color:var(--fg)] focus-visible:ring-[color:var(--primary-soft)] disabled:opacity-50",
  danger:
    "bg-[color:var(--danger)] text-white hover:brightness-110 focus-visible:ring-[color:color-mix(in_oklab,var(--danger),transparent_65%)] disabled:opacity-50",
  dangerGhost:
    "border border-[color:color-mix(in_oklab,var(--danger),transparent_55%)] text-[color:var(--danger)] hover:bg-[color:color-mix(in_oklab,var(--danger),transparent_88%)] focus-visible:ring-[color:color-mix(in_oklab,var(--danger),transparent_70%)] disabled:opacity-50",
} as const;

export type ButtonVariant = keyof typeof variants;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
  leftIcon?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "secondary", loading, disabled, leftIcon, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-offset-[color:var(--bg)]",
        variants[variant],
        className,
      )}
      {...props}
    >
      {loading ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> : leftIcon}
      {children}
    </button>
  );
});
