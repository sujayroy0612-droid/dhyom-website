---
name: ecommerce-funnel
description: Build a Next.js 14 + Supabase + Vercel + Resend + Razorpay + Cloudinary e-commerce site with opt-in funnel and automated email sequences; use when starting or extending an e-commerce build
command: /ecommerce-funnel
---

# E-Commerce + Funnel Skill

Verified against dhyom-website production code, August 2026.

---

## HOW TO USE THIS SKILL

When invoked, present the MODULE MENU to the operator. Build only the selected modules, in order, testing each before proceeding. Never build ahead or add features not chosen.

---

## LOCKED STACK

```
Next.js        14.2.x  (App Router, TypeScript strict)
React          18.x
Supabase       @supabase/supabase-js ^2.112
Resend         ^6.20   (transactional + sequence email)
Razorpay       REST API (no SDK — raw fetch with Basic auth)
Cloudinary     REST API (no SDK — raw fetch for image/PDF upload)
Tailwind CSS   ^3.4
Framer Motion  ^13
Vercel         Hobby or Pro (cron requires Pro or higher)
```

**Do not substitute.** No SendGrid, no Stripe, no tRPC, no Prisma.

---

## ENVIRONMENT VARIABLES

Set these in `.env.local` (gitignored) AND in Vercel → Settings → Environment Variables:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # NEVER prefix with NEXT_PUBLIC_

# Razorpay
NEXT_PUBLIC_RAZORPAY_KEY_ID=        # safe to expose — used in frontend Checkout.js
RAZORPAY_KEY_SECRET=                # NEVER prefix with NEXT_PUBLIC_

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=hello@yourdomain.com   # must be a verified Resend domain

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=   # unsigned preset created in Cloudinary dashboard

# Cron + Unsubscribe HMAC
CRON_SECRET=                        # random 32-char string; add to Vercel then redeploy

# Optional
CALLMEBOT_API_KEY=                  # WhatsApp alerts via callmebot.com
```

**Security invariants (never violate):**
- `.env.local` is gitignored — never commit it.
- `SUPABASE_SERVICE_ROLE_KEY` and `RAZORPAY_KEY_SECRET` must never have `NEXT_PUBLIC_` prefix.
- After adding `CRON_SECRET` to Vercel you MUST redeploy — env vars are baked at build time.

---

## SUPABASE SCHEMA

Run each `CREATE TABLE` in the Supabase SQL Editor. Enable RLS on every table. Use `adminClient()` (service role) from API routes to bypass RLS; use the anon client only for public reads from the browser.

### products
```sql
CREATE TABLE products (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  category    text NOT NULL,          -- 'candle' | 'idol' | 'bracelet' | 'gift' | 'pooja-essentials'
  type        text NOT NULL DEFAULT '',
  subcategory text,
  collection  text,                  -- 'nakshatra' | 'mandala'
  fragrance   text,
  price       numeric NOT NULL,
  mrp         numeric,
  stock       integer NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  image_url   text NOT NULL DEFAULT '',
  image_urls  text[] NOT NULL DEFAULT '{}',
  is_visible  boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON products FOR SELECT USING (true);
```

### orders
```sql
CREATE TABLE orders (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number   text UNIQUE NOT NULL,
  customer_id    uuid,
  customer_name  text NOT NULL,
  phone          text NOT NULL,
  email          text,
  address        text NOT NULL,
  items          jsonb NOT NULL DEFAULT '[]',
  subtotal       numeric NOT NULL DEFAULT 0,
  shipping_fee   numeric NOT NULL DEFAULT 0,
  total          numeric NOT NULL,
  discount_code  text,
  discount_amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'online',   -- 'cod' | 'online'
  payment_status text NOT NULL DEFAULT 'pending',  -- 'pending' | 'paid' | 'failed' | 'refunded'
  order_status   text NOT NULL DEFAULT 'pending',  -- 'pending' | 'processing' | 'packed' | 'shipped' | 'delivered' | 'cancelled'
  razorpay_order_id   text,
  razorpay_payment_id text,
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- Only service role reads/writes orders; no public policy needed
```

### contacts
```sql
CREATE TABLE contacts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email             text NOT NULL,
  phone             text,
  name              text,
  message           text,
  tag               text NOT NULL DEFAULT 'reel_lead',
    -- 'reel_lead' | 'newsletter' | 'checkout_lead' | 'inquiry' | 'buyer'
    -- hierarchy: buyer > checkout_lead / newsletter / reel_lead / inquiry
  campaign_id       uuid REFERENCES campaigns(id),
  sequence_day_sent integer NOT NULL DEFAULT 0,
  last_email_sent_at timestamptz,
  unsubscribed      boolean NOT NULL DEFAULT false,
  captured_at       timestamptz DEFAULT now()
);
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
-- No public policy; all writes via service role (adminClient)
```

**Note:** contacts has NO unique constraint on email — a buyer who also opted in for a guide gets two rows. The `tag = 'buyer'` row is authoritative; the guide row is for sequence tracking. `tagAsBuyer()` does UPDATE first, INSERT only if 0 rows updated.

### campaigns
```sql
CREATE TABLE campaigns (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text UNIQUE NOT NULL,   -- matches public/{slug}.pdf filename
  title        text NOT NULL,
  headline     text NOT NULL,
  subheadline  text,
  body_copy    text,
  pdf_url      text,                   -- Cloudinary fallback URL
  tag          text NOT NULL DEFAULT 'reel_lead',
  dm_copy      text,
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active" ON campaigns FOR SELECT USING (active = true);
```

### soap_opera_emails
```sql
CREATE TABLE soap_opera_emails (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_number   integer NOT NULL,       -- 1..5
  variant      text NOT NULL DEFAULT 'default',  -- 'default' | 'lead' | 'buyer'
  subject      text NOT NULL,
  preview_text text NOT NULL DEFAULT '',
  body_html    text NOT NULL,
  body_text    text NOT NULL,
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (day_number, variant)
);
ALTER TABLE soap_opera_emails ENABLE ROW LEVEL SECURITY;
-- Service role only; no public policy
```

Seed: 6 rows — days 1-4 variant='default', day 5 variant='lead', day 5 variant='buyer'.
Use `{{name}}` and `{{unsub_url}}` as placeholders in body_html and body_text.

### coupons
```sql
CREATE TABLE coupons (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code           text UNIQUE NOT NULL,
  discount_type  text NOT NULL,        -- 'percentage' | 'fixed'
  discount_value numeric NOT NULL,
  campaign_tag   text NOT NULL DEFAULT '',
  usage_limit    integer,
  times_used     integer NOT NULL DEFAULT 0,
  valid_from     timestamptz NOT NULL,
  valid_until    timestamptz NOT NULL,
  active         boolean NOT NULL DEFAULT true
);
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
-- Service role only
```

### product_funnel_settings
```sql
CREATE TABLE product_funnel_settings (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id         uuid UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  bump_product_id    uuid REFERENCES products(id),
  oto_product_id     uuid REFERENCES products(id),
  downsell_product_id uuid REFERENCES products(id)
);
ALTER TABLE product_funnel_settings ENABLE ROW LEVEL SECURITY;
-- Service role only; read via /api/funnel-bump?productId=&stage=bump|oto|downsell
```

### category_visibility
```sql
CREATE TABLE category_visibility (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text UNIQUE NOT NULL,
  visible  boolean NOT NULL DEFAULT true
);
ALTER TABLE category_visibility ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON category_visibility FOR SELECT USING (true);
```

### invoices (optional — GST invoice module)
```sql
CREATE TABLE invoices (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       uuid REFERENCES orders(id),
  invoice_number text UNIQUE NOT NULL,
  taxable_value  numeric,
  gst_amount     numeric,
  total          numeric,
  created_at     timestamptz DEFAULT now()
);
CREATE OR REPLACE FUNCTION generate_invoice_number() RETURNS text LANGUAGE plpgsql AS $$
DECLARE seq int;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 4) AS int)), 0) + 1
    INTO seq FROM invoices;
  RETURN 'INV' || LPAD(seq::text, 4, '0');
END;
$$;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
```

---

## THE TWO-CLIENT PATTERN

**Never deviate from this.**

```ts
// lib/supabase/client.ts — browser client (Client Components)
import { createClient } from "@supabase/supabase-js";
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Inline in every API route — service role, bypasses RLS
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
```

Use `adminClient()` for all server-side reads/writes (API routes, cron). Use `supabase` (anon) only for public product reads from Client Components. **Never** use the service role key client-side.

---

## ADMIN AUTH PATTERN

### Layout gate (`app/admin/layout.tsx`)

```tsx
"use client";
// On mount: getSession() → if no session, router.replace("/admin/login")
// onAuthStateChange: if session goes null, redirect to login
// Render: spinner while checking; null if not authed; layout if authed
```

Admin login uses Supabase email/password: `supabase.auth.signInWithPassword({ email, password })`.
Only one admin user — create via Supabase Dashboard → Authentication → Users.

### verifyAdmin() for API routes

Every admin API route must call this before any data operation:

```ts
async function verifyAdmin(req: NextRequest): Promise<boolean> {
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "").trim();
  if (!token) return false;
  const { data } = await createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ).auth.getUser(token);
  return !!data.user;
}
```

Client sends token: `Authorization: Bearer ${session.access_token}` where `session` comes from `supabase.auth.getSession()`.

---

## RAZORPAY ORDER + PAYMENT PATTERN

### Create order (`POST /api/create-order`)

```ts
// amount in rupees → multiply by 100 for paise
const credentials = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
  method: "POST",
  headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
  body: JSON.stringify({ amount: Math.round(amount * 100), currency: "INR", receipt: orderNumber }),
});
// Returns: { razorpayOrderId, amount, currency }
```

### Frontend checkout flow

1. Collect name/email/phone/address → generate `orderNumber = "ORD-" + Date.now()`
2. `POST /api/create-order` → get `razorpayOrderId`
3. Open Razorpay modal (load `https://checkout.razorpay.com/v1/checkout.js` in `<Script>`)
4. On `handler(response)`: store order in Supabase, call `POST /api/notify-order` (tags buyer, emails founder)
5. Redirect to `/thank-you?order=ORD-xxx`

### Buyer tagging (`tagAsBuyer` in notify-order route)

```ts
async function tagAsBuyer(email: string) {
  const sb = adminClient();
  const { data: updated } = await sb.from("contacts").update({ tag: "buyer" }).eq("email", email).select("id");
  if (!updated || updated.length === 0) {
    await sb.from("contacts").insert({ email, tag: "buyer" });
  }
}
// UPDATE first; INSERT only if 0 rows matched (buyer not in contacts yet)
```

---

## RESEND EMAIL PATTERNS

### Lead magnet / PDF delivery (`POST /api/guide/[slug]`)

```ts
// 1. Look up campaign by slug — use adminClient() so inactive campaigns return 404, not RLS silence
// 2. Validate email with regex
// 3. INSERT into contacts { email, tag: campaign.tag, campaign_id: campaign.id }
//    — no unique constraint; errors are caught and logged, never surface to user
// 4. Load PDF (filesystem first, Cloudinary fallback):
import { readFile } from "fs/promises";
import { join } from "path";
try {
  const buf = await readFile(join(process.cwd(), "public", `${slug}.pdf`));
  pdfBase64 = buf.toString("base64");
} catch {
  if (campaign.pdf_url) {
    const res = await fetch(campaign.pdf_url);
    if (res.ok) pdfBase64 = Buffer.from(await res.arrayBuffer()).toString("base64");
  }
}
// 5. Send via Resend:
await new Resend(apiKey).emails.send({
  from: `Brand <${fromAddr}>`,
  to: trimmed,
  subject: `Your ${campaign.title}`,
  html: buildEmailHtml(...),
  text: "...",
  headers: { "List-Unsubscribe": `<mailto:${fromAddr}?subject=unsubscribe>` },
  ...(pdfBase64 && { attachments: [{ filename: `${slug}.pdf`, content: pdfBase64 }] }),
});
```

**PDF rule:** Put the PDF as `public/{slug}.pdf` in the repo and commit it. Vercel serves it from the filesystem — most reliable. Cloudinary is the fallback only. When uploading PDFs to Cloudinary from the admin UI, use:
```ts
fd.append("resource_type", "raw");
// POST to: https://api.cloudinary.com/v1_1/{cloud}/auto/upload
// NOT raw/upload — auto/upload + resource_type=raw is the correct combination
```

### Transactional (order notification to founder)

```ts
await resend.emails.send({
  from: fromEmail,                    // can be plain email string here (founder-internal)
  to: FOUNDER_EMAIL,
  subject: `New Order — ${orderNumber}`,
  html: buildHtml({...}),
});
```

### Sequence email with unsubscribe token

```ts
// lib/email/soap-opera.ts — shared by cron and admin routes
import { createHmac } from "crypto";

function unsubscribeUrl(email: string): string {
  const e = Buffer.from(email).toString("base64url");
  const t = createHmac("sha256", process.env.CRON_SECRET!).update(email).digest("hex");
  return `https://yourdomain.com/api/unsubscribe?e=${e}&t=${t}`;
}

export function renderEmail(row: SoapOperaEmailRow, name: string, unsubUrl: string) {
  const display = name || "there";
  return {
    subject: row.subject,
    html: emailWrapper(row.preview_text, row.body_html.replace(/\{\{name\}\}/g, display), unsubUrl),
    text: row.body_text.replace(/\{\{name\}\}/g, display).replace(/\{\{unsub_url\}\}/g, unsubUrl),
  };
}
```

Unsubscribe handler (`GET /api/unsubscribe?e=&t=`): decode base64url email, verify HMAC, set `unsubscribed = true` on the contacts row, return a branded HTML page (no redirect — no auth header stripping risk).

---

## VERCEL CRON — SOAP OPERA SEQUENCE

### vercel.json
```json
{ "crons": [{ "path": "/api/cron/soap-opera", "schedule": "0 5 * * *" }] }
```

### Cron route auth
```ts
if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

### Idempotency and scheduling logic

```ts
const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();

const { data: contacts } = await sb
  .from("contacts")
  .select("id, email, name, tag, sequence_day_sent")
  .in("tag", ["reel_lead", "newsletter", "checkout_lead"])
  .eq("unsubscribed", false)
  .lt("sequence_day_sent", 5)                                    // not finished
  .or(`last_email_sent_at.is.null,last_email_sent_at.lte.${twentyHoursAgo}`);
  // ↑ 20h gap prevents double-sends if cron fires twice

// Day 5 branching:
const variant = nextDay === 5
  ? (contact.tag === "buyer" ? "buyer" : "lead")
  : "default";

const template = lookup.get(`${nextDay}-${variant}`);

// After successful send:
await sb.from("contacts").update({
  sequence_day_sent: nextDay,
  last_email_sent_at: new Date().toISOString(),
}).eq("id", contact.id);
```

Templates loaded from `soap_opera_emails` table at start of each cron run — edits take effect next run without code changes.

**CRON_SECRET gotcha:** After adding `CRON_SECRET` to Vercel env vars, you MUST trigger a new deployment — env vars are baked at build time, not read at runtime from the dashboard.

---

## CLOUDINARY IMAGE UPLOAD (admin)

For images:
```ts
fd.append("upload_preset", UPLOAD_PRESET);
fd.append("file", file);
// POST to: https://api.cloudinary.com/v1_1/{cloud}/image/upload
```

For PDFs (raw files):
```ts
fd.append("upload_preset", UPLOAD_PRESET);
fd.append("file", file);
fd.append("resource_type", "raw");
fd.append("public_id", `guides/${slug}`);
// POST to: https://api.cloudinary.com/v1_1/{cloud}/auto/upload   ← NOT raw/upload
```

Multi-image: store URL array in `image_urls text[]`. Show a vertical thumbnail strip (index 0 = main image). Add new images by pushing to the array, remove by filtering.

---

## ADMIN PANEL STRUCTURE

```
/admin                  — Dashboard (stats: orders, revenue, contacts)
/admin/orders           — Order list + status management
/admin/products         — Product CRUD + image upload
/admin/visibility       — Category + product visibility toggles (category_visibility table)
/admin/upload-brand-images — Brand asset management
/admin/analytics        — Revenue charts
/admin/coupons          — Coupon CRUD
/admin/funnel-planner   — Per-product bump/OTO/downsell assignment (product_funnel_settings)
/admin/leads            — Contacts dashboard: stats, filters, soap opera progress, CSV export
/admin/campaigns        — Lead magnet CRUD (campaigns table + Cloudinary PDF upload)
/admin/soap-opera       — Edit soap_opera_emails rows in DB, Send Test per card
/admin/seinfeld         — Placeholder (broadcast email — not yet built)
/admin/login            — Email + password login
```

### Admin nav structure (`app/admin/layout.tsx`)
Two-level collapsible nav: main items flat, then "Advertisement" collapsible group containing Coupons, Upsells & Offers, Leads, and "Email Campaign" sub-group (Lead Magnets, Soap Opera, Seinfeld).

---

## CART PATTERN

```ts
// lib/cart/CartContext.tsx
// useReducer with actions: HYDRATE | ADD_ITEM | REMOVE_ITEM | SET_QUANTITY | CLEAR
// CartItem: { id, name, price, quantity, category, subcategorySlug, label, imageUrl }
// Persist to localStorage on every dispatch; hydrate on mount
// Max quantity per item: 10
```

---

## FUNNEL (BUMP / OTO / DOWNSELL)

```
Checkout page
  ↓ bump offer inline (GET /api/funnel-bump?productId=&stage=bump)
Order confirmed → OTO page
  ↓ "Yes" → POST /api/create-upsell-order (adds item to existing order)
  ↓ "No" → Downsell page
  ↓ either → /thank-you
```

`product_funnel_settings` maps each product to its bump/OTO/downsell product IDs.
`/api/funnel-bump` returns the offer product (only if `is_visible=true`).
`/api/create-upsell-order` checks `alreadyAdded` to prevent double-add, then appends item to `orders.items` jsonb.

---

## KNOWN BUGS AND THEIR REAL FIXES

### 1. RLS silent fail on contacts INSERT
**Symptom:** No error thrown, but contact is not saved. Campaign_id always NULL.
**Cause:** The column didn't exist yet (migration not run), or RLS blocks anon writes.
**Fix:** Use `adminClient()` (service role) for all contact inserts. Add missing columns with `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES campaigns(id);` — run in Supabase SQL Editor, not in code.
**Key lesson:** Catch and LOG the Supabase error inside a try/catch but never let it fail the whole request silently. Always console.error the dbErr. Supabase errors on INSERT with wrong schema fail silently unless you inspect `error`.

### 2. Cloudinary PDF upload returns image URL (not downloadable)
**Symptom:** PDF uploads "succeed" but the stored URL returns a broken image or HTML page.
**Cause:** Using `image/upload` endpoint or omitting `resource_type: raw`.
**Fix:** Always `fd.append("resource_type", "raw")` + POST to `.../auto/upload` (not `.../raw/upload` and not `.../image/upload`).
**Secondary fix:** Commit the PDF as `public/{slug}.pdf` in the repo. `readFile(join(process.cwd(), "public", slug + ".pdf"))` works reliably on Vercel and is the primary PDF source. Cloudinary URL is fallback only.

### 3. CRON_SECRET not available after adding to Vercel dashboard
**Symptom:** Cron fires, route returns 401 Unauthorized even though CRON_SECRET is set.
**Cause:** Vercel bakes env vars at build time. Existing deployment doesn't see new vars.
**Fix:** Add var to Vercel → trigger a new deploy (push a commit or click Redeploy).

### 4. www redirect strips Authorization header
**Symptom:** Admin API calls or unsubscribe links fail with 401 after redirect from www to non-www (or vice versa).
**Cause:** Browser security policy strips `Authorization: Bearer` headers on cross-origin redirects.
**Fix:** Ensure your Resend unsubscribe URLs use the canonical domain (no www if domain is non-www). For admin calls, call the same origin. Never rely on redirect-then-auth.

### 5. campaign_id NULL on all leads
**Symptom:** Leads dashboard shows "—" in Campaign column; campaign filter returns nothing.
**Cause:** `campaign_id` column was never added to contacts table (migration not run), so every INSERT silently dropped the field.
**Fix:** `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES campaigns(id);` in Supabase SQL Editor.

### 6. buyer tagging fails for new buyers (not in contacts)
**Symptom:** Buyer's email tag is never set; they continue receiving soap opera as lead.
**Cause:** Code only did UPDATE; if buyer never opted in, 0 rows matched and no INSERT followed.
**Fix:** `tagAsBuyer` pattern — UPDATE first, check returned row count, INSERT if 0:
```ts
const { data: updated } = await sb.from("contacts").update({ tag: "buyer" }).eq("email", email).select("id");
if (!updated || updated.length === 0) {
  await sb.from("contacts").insert({ email, tag: "buyer" });
}
```

### 7. Resend domain not verified / MX not enabled for receiving
**Symptom:** Emails sent but unsubscribe mailto links bounce; Resend dashboard shows domain unverified.
**Fix:** In Resend → Domains: add TXT (SPF), DKIM CNAME records to your DNS. For receiving (mailto unsubscribe), also enable the MX record. Wait for propagation (can take up to 48h). Until then, use `onboarding@resend.dev` as `from` address for testing.

### 8. ESLint `no-unused-vars` breaks Vercel build
**Symptom:** Build fails with "`X` is defined but never used" — even though `tsc --noEmit` passes locally.
**Cause:** Next.js runs ESLint as part of `next build`. Unused imports that TypeScript tolerates are still ESLint errors.
**Fix:** Remove unused imports before pushing. Check with `npx next build` locally before pushing any new file.

---

## MODULE MENU

Present this to the operator at invocation. Build only selected modules.

```
┌─────────────────────────────────────────────────────────┐
│  E-COMMERCE + FUNNEL MODULE MENU                        │
│  Select which modules to build (pick any combination):  │
├─────────────────────────────────────────────────────────┤
│  [ ] A — Foundation          Next.js scaffold, env,     │
│                              Supabase schema, two-client│
│                              pattern, admin auth gate   │
│  [ ] B — Catalog             Product table, listing,    │
│                              detail pages, visibility   │
│                              toggle, CartContext        │
│  [ ] C — Cart + Checkout     Cart drawer, checkout form,│
│                              Razorpay integration,      │
│                              order saved to Supabase    │
│  [ ] D — Admin Core          /admin layout + login,     │
│                              orders, products CRUD,     │
│                              image/PDF upload (Cloudinary)│
│  [ ] E — Lead Capture        Opt-in form → contacts     │
│                              INSERT, contact-inquiry    │
│                              WhatsApp alert             │
│  [ ] F — Lead Magnet         campaigns table, /guide/   │
│                              [slug] PDF-delivery route, │
│                              admin campaigns editor     │
│  [ ] G — Soap Opera          soap_opera_emails table,   │
│                              cron route (idempotent),   │
│                              unsubscribe endpoint,      │
│                              admin editor               │
│  [ ] H — Funnel (Bump/OTO)   product_funnel_settings,  │
│                              /api/funnel-bump, OTO page,│
│                              create-upsell-order, admin │
│                              Upsells & Offers page      │
│  [ ] I — Coupons             coupons table, validation  │
│                              at checkout, admin CRUD    │
│  [ ] J — Leads Dashboard     /admin/leads: stats, tag   │
│                              filter, campaign filter,   │
│                              email search, soap opera   │
│                              progress dots, CSV export  │
│  [ ] K — Seinfeld Broadcast  broadcast emails to tag    │
│                              segments via Resend, admin │
│                              composer (not yet built)   │
│  [ ] L — Analytics           Revenue chart, order count,│
│                              AOV by period              │
└─────────────────────────────────────────────────────────┘
```

**Build order for a full build:** A → B → D → C → E → F → G → H → I → J → L → K

---

## BUILD DISCIPLINE

- Run `npx next build` locally before every push. ESLint is part of build; unused imports = build failure.
- After building each module: test the happy path manually (don't just rely on tsc).
- Never commit `.env.local`. Verify with `git status` before any `git add .`.
- After adding any new env var to Vercel: trigger a redeploy immediately.
- Test Resend sends from `onboarding@resend.dev` until your domain is verified. Real sends require domain verified + MX enabled.
- Cron cannot be tested on Vercel Hobby without Pro. For local testing, call the cron route directly with `Authorization: Bearer {CRON_SECRET}`.
- For PDF delivery: commit the PDF file as `public/{slug}.pdf` first. The filesystem read in `readFile(join(process.cwd(), "public", slug + ".pdf"))` is more reliable than Cloudinary for attachments.

---

## SECURITY CHECKLIST (verify before deploy)

- [ ] `SUPABASE_SERVICE_ROLE_KEY` has no `NEXT_PUBLIC_` prefix and is not in any client-side file
- [ ] `RAZORPAY_KEY_SECRET` has no `NEXT_PUBLIC_` prefix
- [ ] `.env.local` is in `.gitignore`
- [ ] Every `/api/admin/*` route calls `verifyAdmin(req)` and returns 401 if false
- [ ] `/api/cron/*` routes check `Authorization: Bearer ${CRON_SECRET}` header
- [ ] Unsubscribe tokens use HMAC-SHA256 (not guessable IDs)
- [ ] `adminClient()` is never instantiated in any file under `app/` (client-side code)
- [ ] Razorpay payment verification (signature check) is done server-side before saving order as "paid"

---

## FILE TREE REFERENCE (dhyom-website structure to mirror)

```
app/
  admin/
    layout.tsx               — auth gate + sidebar nav
    login/page.tsx
    page.tsx                 — dashboard
    orders/page.tsx
    products/page.tsx
    visibility/page.tsx
    upload-brand-images/page.tsx
    analytics/page.tsx
    coupons/page.tsx
    funnel-planner/page.tsx  — Upsells & Offers
    leads/page.tsx
    campaigns/page.tsx       — Lead Magnets
    soap-opera/page.tsx
    seinfeld/page.tsx
  api/
    create-order/route.ts
    notify-order/route.ts    — tags buyer, emails founder
    create-upsell-order/route.ts
    funnel-bump/route.ts
    fragrance-guide/route.ts — legacy single-PDF opt-in
    guide/[slug]/route.ts    — dynamic campaign PDF delivery
    unsubscribe/route.ts
    contact-inquiry/route.ts — WhatsApp alert
    cron/
      soap-opera/route.ts
    admin/
      leads/route.ts
      soap-opera/route.ts
      funnel-settings/route.ts
      generate-invoice/route.ts
lib/
  supabase/
    client.ts                — browser anon client (export const supabase)
    server.ts
    types.ts                 — DbProduct, DbOrder, DbCoupon, DbReview
    visibility.ts
  cart/
    CartContext.tsx           — useReducer, localStorage persistence
  email/
    soap-opera.ts            — emailWrapper(), renderEmail(), SoapOperaEmailRow type
  utils.ts
  motion.ts
vercel.json                  — cron schedule
```
