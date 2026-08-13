import { createClient } from "@supabase/supabase-js";

export const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser client — use in Client Components ("use client").
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
