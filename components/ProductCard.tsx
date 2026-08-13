import Button from "@/components/Button";

export interface Product {
  id: string;
  name: string;
  label: string;         // e.g. "Incense Sticks · Sandalwood"
  price: number;
  description?: string;  // one-line brand-voice copy from DB
  imageUrl?: string;
}

export default function ProductCard({
  name,
  label,
  price,
  description,
  imageUrl,
}: Product) {
  return (
    <div className="group bg-damson border border-[rgba(196,163,115,0.15)] rounded-[6px] overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(196,163,115,0.42)] hover:shadow-[0_16px_48px_rgba(15,5,8,0.55)]">

      {/* Image */}
      <div className="aspect-square bg-[#270b1b] flex items-center justify-center overflow-hidden flex-shrink-0">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <span
            aria-hidden="true"
            className="font-display text-[0.52rem] tracking-[0.22em] uppercase text-[rgba(196,163,115,0.20)]"
          >
            Image coming soon
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col gap-3 flex-1">

        {/* Label + Name */}
        <div className="flex flex-col gap-1.5">
          <p className="font-display text-[0.53rem] tracking-[0.24em] uppercase text-[rgba(196,163,115,0.52)]">
            {label}
          </p>
          <h3
            className="font-display text-ivory leading-snug"
            style={{ fontSize: "0.95rem", letterSpacing: "0.04em" }}
          >
            {name}
          </h3>
        </div>

        {/* Description — shows only when provided */}
        {description && (
          <p className="font-body font-light italic text-[rgba(245,237,224,0.42)] text-[0.88rem] leading-relaxed">
            {description}
          </p>
        )}

        {/* Price + CTA — pinned to bottom */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-[rgba(196,163,115,0.10)]">
          <span
            className="font-display text-brass"
            style={{ fontSize: "1.0rem", letterSpacing: "0.04em" }}
          >
            ₹{price.toLocaleString("en-IN")}
          </span>
          {/* Secondary variant — brass outline, never a filled brass background */}
          <Button variant="secondary" size="sm">Add to Cart</Button>
        </div>

      </div>
    </div>
  );
}
