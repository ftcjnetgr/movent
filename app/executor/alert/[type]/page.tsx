import RoleAlertPage from '@/components/role-alert-page'

export default async function AlertPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params
  return <RoleAlertPage type={type} />
}
