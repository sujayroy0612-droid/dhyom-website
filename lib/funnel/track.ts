import { supabase } from "@/lib/supabase/client";

const SESSION_KEY = "dhyom_sid";

function getSessionId(): string {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

export function trackEvent(
  eventType: "product_view" | "add_to_cart" | "checkout_started" | "purchase_completed",
  productId?: string
): void {
  if (typeof window === "undefined") return;
  const sessionId = getSessionId();
  void supabase.from("funnel_events").insert({
    session_id: sessionId,
    event_type: eventType,
    product_id: productId ?? null,
    page_path: window.location.pathname,
  });
}
