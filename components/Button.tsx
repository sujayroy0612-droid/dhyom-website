import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const sizeClasses: Record<Size, string> = {
  sm: "px-5 py-2 text-[0.65rem]",
  md: "px-8 py-3 text-[0.7rem]",
  lg: "px-12 py-4 text-[0.7rem]",
};

const variantClasses: Record<Variant, string> = {
  // Brass text on Damson — brass is accent ONLY, not a background
  primary:
    "bg-damson text-brass border border-[rgba(196,163,115,0.35)] " +
    "hover:bg-[#4e1a32] hover:border-[rgba(196,163,115,0.6)] " +
    "active:scale-[0.98]",
  // Transparent with brass border
  secondary:
    "bg-transparent text-brass border border-[rgba(196,163,115,0.35)] " +
    "hover:bg-[rgba(196,163,115,0.06)] hover:border-[rgba(196,163,115,0.55)] " +
    "active:scale-[0.98]",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", className = "", children, ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={[
          "inline-flex items-center justify-center",
          "font-display uppercase tracking-[0.22em]",
          "rounded-[3px] transition-all duration-200",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass",
          sizeClasses[size],
          variantClasses[variant],
          className,
        ].join(" ")}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
