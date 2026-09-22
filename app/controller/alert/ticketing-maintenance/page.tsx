import { notFound } from 'next/navigation'
import DashboardAlertList from '@/components/dashboard-alert-list'
import { getCurrentProfile } from '@/lib/server/profile'
import { getDashboardData } from '@/lib/server/dashboard'

export default async function AlertPage() {
  const profile = await getCurrentProfile()
  if (!['Controller', 'Super User'].includes(profile.role)) notFound()
  const data = await getDashboardData(profile)

  return (
    <div className="role-page alert-page">
      <DashboardAlertList
        roleLabel={profile.role}
        mode="ticket"
        taskAlerts={data.taskAlerts.map((alert) => ({
          ...alert,
          targetAt: alert.targetAt.toISOString(),
        }))}
        ticketAlerts={data.ticketAlerts}
      />
    </div>
  )
}
