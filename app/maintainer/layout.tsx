import { requireRole } from '@/lib/server/role-guard'

export default async function MaintainerLayout({ children }: { children: React.ReactNode }) {
  await requireRole('Maintainer')
  return children
}
