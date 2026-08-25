export type ProductCategory =
  | "candle"
  | "idol"
  | "bracelet"
  | "gift"
  | "pooja-essentials";

export type CandleCollection = "nakshatra" | "mandala";

export interface DbProduct {
  id: string;
  name: string;
  category: ProductCategory;
  type: string;
  subcategory: string | null;
  collection: CandleCollection | null;
  fragrance: string | null;
  price: number;
  mrp: number | null;
  stock: number;
  description: string;
  bullet_points: string | null;
  image_url: string;
  image_urls: string[];
  is_visible: boolean;
  is_featured: boolean;
  created_at: string;
  // Extended fields (added via Supabase migration)
  sku: string | null;
  short_description: string | null;
  long_description: string | null;
  meta_title: string | null;
  meta_description: string | null;
  weight_grams: number | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  hsn_code: string | null;
}

export interface DbProductImage {
  id: string;
  product_id: string;
  url: string;
  display_order: number;
  is_primary: boolean;
  alt_text: string | null;
  created_at: string;
}

export interface DbCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  display_order: number;
  created_at: string;
}

export type OrderStatus =
  | "pending"
  | "processing"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface DbOrder {
  id: string;
  customer_id: string | null;
  customer_name: string;
  phone: string;
  email: string | null;
  address: string;
  items: Array<{
    product_id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  payment_method: "cod" | "online";
  payment_status: "pending" | "paid" | "failed" | "refunded";
  order_status: OrderStatus;
  created_at: string;
}

export interface DbCoupon {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  campaign_tag: string;
  usage_limit: number | null;
  times_used: number;
  valid_from: string;
  valid_until: string;
  active: boolean;
}

export interface DbReview {
  id: string;
  product_id: string;
  customer_name: string;
  rating: number;
  review_text: string;
  approved: boolean;
  created_at: string;
}
