import AppShell from "@/components/layout/app-shell";
import { requireRole } from "@/lib/server/role-guard";

export const dynamic = "force-dynamic";

export default async function PickupLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("Pickup");
  return <AppShell profile={profile}>{children}</AppShell>;
}
