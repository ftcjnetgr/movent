import { requireRole } from '@/lib/server/role-guard'

export default async function ControllerLayout({ children }: { children: React.ReactNode }) {
  await requireRole('Controller')
  return children
}
