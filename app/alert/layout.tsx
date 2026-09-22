import AppShell from '@/components/app-shell'
import { getCurrentProfile } from '@/lib/server/profile'

export const dynamic = 'force-dynamic'

export default async function AlertLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()

  return <AppShell profile={profile}>{children}</AppShell>
}
