import { requireRole } from '@/lib/server/role-guard'

export default async function DispatcherLayout({ children }: { children: React.ReactNode }) {
  await requireRole('Dispatcher')
  return children
}
