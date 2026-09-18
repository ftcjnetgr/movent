import AppShell from '@/components/app-shell'
import { requireRole } from '@/lib/server/role-guard'

export default async function MaintainerLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole('Maintainer')
  return <AppShell profile={profile}>{children}</AppShell>
}
