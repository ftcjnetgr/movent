import AppShell from '@/components/app-shell'
import { requireRole } from '@/lib/server/role-guard'

export const dynamic = 'force-dynamic'

export default async function ControllerLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole('Controller')
  return <AppShell profile={profile}>{children}</AppShell>
}
