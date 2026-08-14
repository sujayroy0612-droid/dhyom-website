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
  stock: number;
  description: string;
  image_url: string;
  image_urls: string[];
  is_visible: boolean;
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
