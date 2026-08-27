const SHIPROCKET_BASE = "https://apiv2.shiprocket.in/v1/external";

export interface ShippingRate {
  courierId:   number;
  courierName: string;
  rate:        number; // total freight charge in ₹ (includes COD charges if applicable)
}

export async function checkShippingRate(
  pickupPincode:   string,
  deliveryPincode: string,
  weightKg:        number,
  isCod:           boolean,
): Promise<ShippingRate> {
  const token = await getToken();
  const params = new URLSearchParams({
    pickup_postcode:   pickupPincode,
    delivery_postcode: deliveryPincode,
    weight:            weightKg.toFixed(2),
    cod:               isCod ? "1" : "0",
  });

  const res = await fetch(`${SHIPROCKET_BASE}/courier/serviceability/?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Shiprocket serviceability check failed (${res.status})`);
  }

  const json = (await res.json()) as {
    status: number;
    data?: {
      available_courier_companies?: Array<{
        courier_company_id: number;
        courier_name:       string;
        freight_charge?:    number;
        rate?:              number;
        cod_charges?:       number;
      }>;
    };
  };

  const companies = json.data?.available_courier_companies;
  if (!companies?.length) {
    throw new Error("No serviceable couriers for this route");
  }

  // Pick cheapest: freight_charge (or rate) + cod_charges for COD orders
  const sorted = companies
    .map(c => ({
      courierId:   c.courier_company_id,
      courierName: c.courier_name,
      rate:        (c.freight_charge ?? c.rate ?? 999) + (isCod ? (c.cod_charges ?? 0) : 0),
    }))
    .sort((a, b) => a.rate - b.rate);

  return sorted[0];
}

// Module-level token cache — reused across warm Lambda instances.
// Cold starts trigger re-auth; token is valid 240 hours.
let _cachedToken: string | null = null;
let _tokenExpiresAt = 0; // Unix ms

async function getToken(): Promise<string> {
  if (_cachedToken && Date.now() < _tokenExpiresAt) return _cachedToken;

  const res = await fetch(`${SHIPROCKET_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email:    process.env.SHIPROCKET_EMAIL!,
      password: process.env.SHIPROCKET_PASSWORD!,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Shiprocket auth failed (${res.status}): ${JSON.stringify(err)}`);
  }

  const { token } = (await res.json()) as { token: string };
  _cachedToken = token;
  // Cache 200 hours — 40-hour buffer before 240-hour expiry
  _tokenExpiresAt = Date.now() + 200 * 60 * 60 * 1000;
  return token;
}

export interface ShiprocketOrderInput {
  orderNumber:    string;
  orderDate:      string; // ISO string
  firstName:      string;
  lastName:       string;
  email:          string;
  phone:          string;
  shippingStreet: string;
  shippingCity:   string;
  shippingState:  string;
  shippingPincode: string;
  items: {
    id?:      string;
    name:     string;
    price:    number;
    quantity: number;
  }[];
  total:       number;
  paymentType: "online" | "partial_cod" | null;
  amountDueCod?: number | null;
  // Per-product dims — fetched from products table; fall back to defaults if null
  weightKg?: number;
  lengthCm?: number;
  breadthCm?: number;
  heightCm?: number;
  // Preferred courier from rate check — passed to AWB assign to match quoted rate
  courierId?: number;
}

export interface ShiprocketResult {
  shiprocketOrderId: string;
  shipmentId:        string;
  awbNumber:         string;
  courierName:       string;
  trackingUrl:       string;
  labelUrl:          string;
}

export async function createAndShipOrder(input: ShiprocketOrderInput): Promise<ShiprocketResult> {
  const token   = await getToken();
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const isCod    = input.paymentType === "partial_cod";
  const codAmount = isCod ? (input.amountDueCod ?? 0) : 0;

  const orderDate = new Date(input.orderDate).toISOString().slice(0, 16).replace("T", " ");

  const orderBody = {
    order_id:               input.orderNumber,
    order_date:             orderDate,
    pickup_location:        process.env.SHIPROCKET_PICKUP_LOCATION_NAME ?? "Home",
    billing_customer_name:  input.firstName,
    billing_last_name:      input.lastName,
    billing_address:        input.shippingStreet,
    billing_city:           input.shippingCity,
    billing_pincode:        input.shippingPincode,
    billing_state:          input.shippingState,
    billing_country:        "India",
    billing_email:          input.email,
    billing_phone:          input.phone,
    shipping_is_billing:    true,
    order_items: input.items.map(item => ({
      name:          item.name,
      sku:           item.id ?? item.name.slice(0, 20).replace(/\s+/g, "-").toLowerCase(),
      units:         item.quantity,
      selling_price: item.price,
    })),
    payment_method: isCod ? "COD" : "Prepaid",
    // For partial COD, sub_total = amount courier collects at door.
    // For prepaid, sub_total = full order total.
    sub_total: isCod ? codAmount : input.total,
    length:  input.lengthCm  ?? 15,
    breadth: input.breadthCm ?? 10,
    height:  input.heightCm  ?? 8,
    weight:  input.weightKg  ?? 0.3,
  };

  // ── Step 1: Create order ─────────────────────────────────────────────────
  const orderRes = await fetch(`${SHIPROCKET_BASE}/orders/create/adhoc`, {
    method: "POST",
    headers,
    body: JSON.stringify(orderBody),
  });

  if (!orderRes.ok) {
    const err = await orderRes.json().catch(() => ({}));
    throw new Error(`Shiprocket order create failed (${orderRes.status}): ${JSON.stringify(err)}`);
  }

  const orderData = (await orderRes.json()) as {
    order_id:     number;
    shipment_id:  number;
    awb_code?:    string;
    courier_name?: string;
  };

  const shiprocketOrderId = String(orderData.order_id);
  const shipmentId        = String(orderData.shipment_id);

  // If AWB was auto-assigned in the create response, skip the assign step
  if (orderData.awb_code) {
    const awbNumber  = orderData.awb_code;
    const courierName = orderData.courier_name ?? "Unknown";
    const trackingUrl = `https://shiprocket.co/tracking/${awbNumber}`;
    const labelUrl    = await fetchLabel(shipmentId, headers);
    return { shiprocketOrderId, shipmentId, awbNumber, courierName, trackingUrl, labelUrl };
  }

  // ── Step 2: Assign best courier and get AWB ──────────────────────────────
  let awbNumber  = "";
  let courierName = "Unknown";

  const assignRes = await fetch(`${SHIPROCKET_BASE}/courier/assign/awb`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      shipment_id: shipmentId,
      ...(input.courierId ? { courier_id: input.courierId } : {}),
    }),
  });

  if (assignRes.ok) {
    const assignData = (await assignRes.json()) as {
      response?: { data?: { awb_code?: string; courier_name?: string } };
    };
    awbNumber   = assignData.response?.data?.awb_code   ?? "";
    courierName = assignData.response?.data?.courier_name ?? "Unknown";
  } else {
    const err = await assignRes.json().catch(() => ({}));
    console.error(`[shiprocket] AWB assign failed (${assignRes.status}):`, JSON.stringify(err));
  }

  const trackingUrl = awbNumber ? `https://shiprocket.co/tracking/${awbNumber}` : "";

  // ── Step 3: Generate shipping label ─────────────────────────────────────
  const labelUrl = await fetchLabel(shipmentId, headers);

  return { shiprocketOrderId, shipmentId, awbNumber, courierName, trackingUrl, labelUrl };
}

async function fetchLabel(
  shipmentId: string,
  headers: Record<string, string>,
): Promise<string> {
  try {
    const res = await fetch(`${SHIPROCKET_BASE}/orders/print/label`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({ shipment_id: [parseInt(shipmentId, 10)] }),
    });
    if (!res.ok) return "";
    const data = (await res.json()) as { label_url?: string };
    return data.label_url ?? "";
  } catch {
    return "";
  }
}
