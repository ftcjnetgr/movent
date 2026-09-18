import { requireRole } from '@/lib/server/role-guard'

export default async function ExecutorLayout({ children }: { children: React.ReactNode }) {
  await requireRole('Executor')
  return children
}
