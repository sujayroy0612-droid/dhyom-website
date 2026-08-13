import { createClient } from "@supabase/supabase-js";

// Server-side client — safe to call in async Server Components.
// Uses the anon key; products table is publicly readable via RLS policy.
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
