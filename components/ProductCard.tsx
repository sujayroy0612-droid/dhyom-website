import Link from "next/link";
import Image from "next/image";
import WishlistButton from "@/components/WishlistButton";

export interface Product {
  id: string;
  name: string;
  category: string;
  subcategorySlug: string; // collection slug for candles, subcategory for all others
  label: string;
  price: number;
  description?: string;
  imageUrl?: string;
}

export default function ProductCard({
  id,
  name,
  category,
  subcategorySlug,
  label,
  price,
  description,
  imageUrl,
}: Product) {
  return (
    <Link
      href={`/shop/${category}/${subcategorySlug}/${id}`}
      className="group bg-damson border border-[rgba(196,163,115,0.15)] rounded-[6px] overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(196,163,115,0.42)] hover:shadow-[0_16px_48px_rgba(15,5,8,0.55)]"
    >
      {/* Image */}
      <div className="aspect-square bg-[#270b1b] flex items-center justify-center overflow-hidden flex-shrink-0 relative">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <span
            aria-hidden="true"
            className="font-display text-[0.52rem] tracking-[0.22em] uppercase text-[rgba(196,163,115,0.20)]"
          >
            Image coming soon
          </span>
        )}
        <WishlistButton productId={id} className="absolute top-2.5 right-2.5" />
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col gap-3 flex-1">
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

        {description && (
          <p className="font-body font-light italic text-[rgba(245,237,224,0.42)] text-[0.88rem] leading-relaxed">
            {description}
          </p>
        )}

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-[rgba(196,163,115,0.10)]">
          <span
            className="font-display text-brass"
            style={{ fontSize: "1.0rem", letterSpacing: "0.04em" }}
          >
            ₹{price.toLocaleString("en-IN")}
          </span>
          <span className="font-display text-[0.55rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.45)] group-hover:text-brass group-hover:translate-x-0.5 transition-all duration-200">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}
