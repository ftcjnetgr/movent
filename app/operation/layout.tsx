import { requireRole } from '@/lib/server/role-guard'

export default async function OperationLayout({ children }: { children: React.ReactNode }) {
  await requireRole('Operation')
  return children
}
