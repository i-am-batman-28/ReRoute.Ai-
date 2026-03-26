import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/cn";

const variants = {
  primary:
    "bg-emerald-500 text-zinc-950 hover:bg-emerald-400 focus-visible:ring-emerald-400/50 disabled:opacity-50",
  secondary:
    "border border-zinc-700 bg-zinc-800/80 text-zinc-100 hover:bg-zinc-800 focus-visible:ring-zinc-500/40 disabled:opacity-50",
  ghost: "text-zinc-300 hover:bg-zinc-800/80 hover:text-zinc-100 focus-visible:ring-zinc-500/40 disabled:opacity-50",
  danger:
    "bg-red-500/90 text-white hover:bg-red-500 focus-visible:ring-red-400/50 disabled:opacity-50",
  dangerGhost:
    "border border-red-500/40 text-red-300 hover:bg-red-500/10 focus-visible:ring-red-400/40 disabled:opacity-50",
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
        "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-offset-zinc-950",
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
