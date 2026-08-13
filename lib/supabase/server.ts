import { createClient } from "@supabase/supabase-js";

// Server-side client — safe to call in async Server Components.
// cache: 'no-store' prevents Next.js from caching Supabase fetch responses,
// so stock, prices and product data are always live from the database.
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: (url, options) =>
          fetch(url, { ...options, cache: "no-store" }),
      },
    }
  );
}
