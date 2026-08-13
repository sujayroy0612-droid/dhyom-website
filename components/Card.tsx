import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  imageAlt?: string;
  footer?: React.ReactNode;
}

export default function Card({
  title,
  subtitle,
  imageUrl,
  imageAlt,
  footer,
  children,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={[
        // Damson background — part of the 30% brand primary
        "bg-damson border border-[rgba(196,163,115,0.15)]",
        "rounded-[6px] overflow-hidden",
        "transition-all duration-300",
        "hover:border-[rgba(196,163,115,0.40)] hover:shadow-[0_8px_32px_rgba(15,5,8,0.5)]",
        className,
      ].join(" ")}
      {...props}
    >
      {imageUrl ? (
        <div className="aspect-[4/3] overflow-hidden bg-black-plum">
          <img
            src={imageUrl}
            alt={imageAlt ?? title ?? ""}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          />
        </div>
      ) : (
        /* Placeholder when no image provided */
        <div className="aspect-[4/3] bg-[#2a0c1c] flex items-center justify-center">
          <span className="font-display text-[0.6rem] tracking-[0.22em] uppercase text-[rgba(196,163,115,0.3)]">
            Image coming soon
          </span>
        </div>
      )}

      <div className="p-6">
        {title && (
          <h3 className="font-display text-lg text-ivory tracking-[0.05em] mb-1">
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="font-body text-sm font-light text-[rgba(245,237,224,0.55)] italic">
            {subtitle}
          </p>
        )}
        {children && <div className="mt-4">{children}</div>}
      </div>

      {footer && (
        <div className="px-6 pb-6 border-t border-[rgba(196,163,115,0.12)]">
          <div className="pt-4">{footer}</div>
        </div>
      )}
    </div>
  );
}
