import { requireSuperUser } from '@/lib/server/role-guard'

export default async function SuperUserLayout({ children }: { children: React.ReactNode }) {
  await requireSuperUser()
  return children
}
