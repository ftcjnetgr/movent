import AppShell from '@/components/app-shell'
import { requireSuperUser } from '@/lib/server/role-guard'

export const dynamic = 'force-dynamic'

export default async function SuperUserLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireSuperUser()
  return <AppShell profile={profile}>{children}</AppShell>
}
