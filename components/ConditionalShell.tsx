"use client";
import { usePathname } from "next/navigation";

const LANDING_ROUTES = ["/fragrance-guide", "/admin"];

export default function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (LANDING_ROUTES.some((r) => pathname.startsWith(r))) return null;
  return <>{children}</>;
}
