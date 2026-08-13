import Link from "next/link";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  href?: string;
}

const sizeClasses: Record<Size, string> = {
  sm: "px-5 py-2 text-[0.65rem]",
  md: "px-8 py-3 text-[0.7rem]",
  lg: "px-12 py-4 text-[0.7rem]",
};

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-damson text-brass border border-[rgba(196,163,115,0.35)] " +
    "hover:bg-[#4e1a32] hover:border-[rgba(196,163,115,0.6)] " +
    "active:scale-[0.98]",
  secondary:
    "bg-transparent text-brass border border-[rgba(196,163,115,0.35)] " +
    "hover:bg-[rgba(196,163,115,0.06)] hover:border-[rgba(196,163,115,0.55)] " +
    "active:scale-[0.98]",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ href, variant = "primary", size = "md", className = "", children, ...props }, ref) => {
    const classes = [
      "inline-flex items-center justify-center",
      "font-display uppercase tracking-[0.22em]",
      "rounded-[3px] transition-all duration-200",
      "disabled:opacity-40 disabled:cursor-not-allowed",
      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass",
      sizeClasses[size],
      variantClasses[variant],
      className,
    ].join(" ");

    if (href) {
      return (
        <Link href={href} className={classes}>
          {children}
        </Link>
      );
    }

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
