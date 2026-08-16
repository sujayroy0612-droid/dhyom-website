import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type AnnouncementMessage = {
  id: string;
  text: string;
  link_url: string | null;
  sort_order: number;
};

export type AnnouncementData = {
  speed: number;
  messages: AnnouncementMessage[];
};

export async function fetchAnnouncementBar(): Promise<AnnouncementData | null> {
  const { data: settings } = await supabase
    .from("announcement_bar")
    .select("enabled, speed")
    .single();

  if (!settings?.enabled) return null;

  const { data: messages } = await supabase
    .from("announcement_messages")
    .select("id, text, link_url, sort_order")
    .eq("active", true)
    .order("sort_order");

  if (!messages?.length) return null;

  return { speed: settings.speed ?? 30, messages };
}
