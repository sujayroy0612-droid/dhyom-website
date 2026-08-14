export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import type { DbProduct } from "@/lib/supabase/types";
import ProductCard from "@/components/ProductCard";
import ProductActions from "@/components/ProductActions";
import ProductGallery from "@/components/ProductGallery";

/* ─── Display name maps ───────────────────────────────── */
const CATEGORY_NAMES: Record<string, string> = {
  candle: "Candles",
  idol: "Idols",
  bracelet: "Spiritual Bracelets",
  gift: "Gift Sets",
  "pooja-essentials": "Pooja Essentials",
};

const SUBCATEGORY_NAMES: Record<string, string> = {
  nakshatra: "Nakshatra Collection",
  mandala: "Mandala Collection",
  ganesha: "Ganesha",
  lakshmi: "Lakshmi",
  rudraksh: "Rudraksh Mala",
  "rose-quartz": "Rose Quartz",
  diwali: "Diwali",
  rakhi: "Rakhi",
  chhath: "Chhath Puja",
  "ganesh-chaturthi": "Ganesh Chaturthi",
  dussehra: "Dussehra",
  corporate: "Corporate Gifting",
  wedding: "Wedding",
  "incense-sticks": "Incense Sticks",
  "incense-cones": "Incense Cones",
  "ghee-batti": "Ghee Batti",
  camphor: "Camphor",
};

/* ─── Helpers ─────────────────────────────────────────── */
function buildCardLabel(p: DbProduct): string {
  const first = p.collection
    ? p.collection.charAt(0).toUpperCase() + p.collection.slice(1)
    : p.type.charAt(0).toUpperCase() + p.type.slice(1);
  return [first, p.fragrance ?? null].filter(Boolean).join(" · ");
}

function buildDetailLabel(p: DbProduct): string {
  if (p.collection) {
    const col = p.collection.charAt(0).toUpperCase() + p.collection.slice(1);
    return [col + " Collection", p.fragrance].filter(Boolean).join(" · ");
  }
  if (p.subcategory) {
    const sub = p.subcategory
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    return [sub, p.fragrance].filter(Boolean).join(" · ");
  }
  const type = p.type.charAt(0).toUpperCase() + p.type.slice(1);
  return [type, p.fragrance].filter(Boolean).join(" · ");
}

function getSubcategorySlug(p: DbProduct): string {
  return p.collection ?? p.subcategory ?? "";
}

/* ─── Page ────────────────────────────────────────────── */
interface PageProps {
  params: { category: string; subcategory: string; id: string };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { category, subcategory, id } = params;

  const supabase = createServerClient();
  const cols =
    "id,name,type,subcategory,collection,fragrance,price,description,image_url,image_urls,category,stock,is_visible,created_at";

  const [productRes, relatedRes, catVisRes] = await Promise.all([
    supabase.from("products").select(cols).eq("id", id).single(),
    supabase
      .from("products")
      .select(cols)
      .eq("category", category)
      .eq("is_visible", true)
      .neq("id", id)
      .limit(3),
    supabase
      .from("category_visibility")
      .select("is_visible")
      .eq("category", category)
      .single(),
  ]);

  if (productRes.error || !productRes.data) notFound();

  const product = productRes.data as DbProduct;
  if (product.category !== category) notFound();
  if (!product.is_visible) notFound();
  if (catVisRes.data?.is_visible === false) notFound();

  const related = (relatedRes.data ?? []) as DbProduct[];
  const categoryName = CATEGORY_NAMES[category] ?? category;
  const subcategoryName = SUBCATEGORY_NAMES[subcategory] ?? subcategory;
  const detailLabel = buildDetailLabel(product);
  const inStock = product.stock > 0;

  return (
    <div className="min-h-screen bg-black-plum">

      {/* ══ PRODUCT DETAIL ══════════════════════════════════ */}
      <section className="pt-20">
        <div className="max-w-6xl mx-auto px-6 py-14 lg:py-20">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 mb-10 flex-wrap">
            <Link
              href="/shop"
              className="font-display text-[0.54rem] tracking-[0.2em] uppercase text-[rgba(245,237,224,0.30)] hover:text-[rgba(245,237,224,0.60)] transition-colors duration-200"
            >
              Shop
            </Link>
            <span className="text-[rgba(196,163,115,0.28)] text-xs">›</span>
            <Link
              href={`/shop/${category}`}
              className="font-display text-[0.54rem] tracking-[0.2em] uppercase text-[rgba(245,237,224,0.30)] hover:text-[rgba(245,237,224,0.60)] transition-colors duration-200"
            >
              {categoryName}
            </Link>
            <span className="text-[rgba(196,163,115,0.28)] text-xs">›</span>
            <Link
              href={`/shop/${category}/${subcategory}`}
              className="font-display text-[0.54rem] tracking-[0.2em] uppercase text-[rgba(245,237,224,0.30)] hover:text-[rgba(245,237,224,0.60)] transition-colors duration-200"
            >
              {subcategoryName}
            </Link>
            <span className="text-[rgba(196,163,115,0.28)] text-xs">›</span>
            <span className="font-display text-[0.54rem] tracking-[0.2em] uppercase text-brass">
              {product.name}
            </span>
          </nav>

          {/* Two-column layout */}
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-start">

            {/* ── Left: image gallery ── */}
            <div className="w-full lg:w-1/2 flex-shrink-0">
              <ProductGallery
                images={[product.image_url, ...(product.image_urls ?? [])].filter(Boolean) as string[]}
                alt={product.name}
              />
            </div>

            {/* ── Right: product info ── */}
            <div className="w-full lg:w-1/2 flex flex-col gap-7">

              {detailLabel && (
                <p className="font-display text-[0.58rem] tracking-[0.24em] uppercase text-[rgba(196,163,115,0.50)]">
                  {detailLabel}
                </p>
              )}

              <h1
                className="font-display text-ivory leading-tight"
                style={{
                  fontSize: "clamp(1.7rem, 3.5vw, 2.6rem)",
                  letterSpacing: "0.05em",
                  lineHeight: 1.1,
                }}
              >
                {product.name}
              </h1>

              <div className="w-10 h-px bg-[rgba(196,163,115,0.30)]" />

              <p
                className="font-display text-brass"
                style={{ fontSize: "1.5rem", letterSpacing: "0.04em" }}
              >
                ₹{product.price.toLocaleString("en-IN")}
              </p>

              {product.description && (
                <p className="font-body font-light italic text-[rgba(245,237,224,0.55)] text-base leading-[1.9]">
                  {product.description}
                </p>
              )}

              <div className="w-full h-px bg-[rgba(196,163,115,0.10)]" />

              <ProductActions
                productId={product.id}
                productName={product.name}
                price={product.price}
                inStock={inStock}
                label={detailLabel}
                imageUrl={product.image_url || ""}
                category={product.category}
                subcategorySlug={getSubcategorySlug(product)}
              />

            </div>
          </div>
        </div>
      </section>


      {/* ══ YOU MAY ALSO LIKE ═══════════════════════════════ */}
      {related.length > 0 && (
        <section className="border-t border-[rgba(196,163,115,0.10)] py-20 px-6">
          <div className="max-w-6xl mx-auto">

            <div className="text-center mb-12">
              <p className="font-display text-[0.58rem] tracking-[0.28em] uppercase text-[rgba(196,163,115,0.40)] mb-3">
                From the same collection
              </p>
              <h2
                className="font-display text-ivory"
                style={{ fontSize: "clamp(1.3rem, 2.5vw, 1.9rem)", letterSpacing: "0.05em" }}
              >
                You May Also Like
              </h2>
              <div className="mt-4 mx-auto w-8 h-px bg-[rgba(196,163,115,0.28)]" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((p) => (
                <ProductCard
                  key={p.id}
                  id={p.id}
                  name={p.name}
                  category={p.category}
                  subcategorySlug={getSubcategorySlug(p)}
                  label={buildCardLabel(p)}
                  price={p.price}
                  description={p.description || undefined}
                  imageUrl={p.image_url || undefined}
                />
              ))}
            </div>

          </div>
        </section>
      )}

    </div>
  );
}
