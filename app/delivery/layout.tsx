import AppShell from "@/components/layout/app-shell";
import { requireRole } from "@/lib/server/role-guard";

export const dynamic = "force-dynamic";

export default async function DeliveryLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("Delivery");
  return <AppShell profile={profile}>{children}</AppShell>;
}
