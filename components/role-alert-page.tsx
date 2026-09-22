import DashboardAlertList from '@/components/dashboard-alert-list'
import { getCurrentProfile } from '@/lib/server/profile'
import { getDashboardData } from '@/lib/server/dashboard'

export default async function RoleAlertPage({ type }: { type: string }) {
  const profile = await getCurrentProfile()
  const data = await getDashboardData(profile)
  const mode = type === 'ticketing-maintenance' ? 'ticket' : 'task'

  return (
    <div className="role-page alert-page">
      <DashboardAlertList
        roleLabel={profile.role}
        mode={mode}
        taskAlerts={data.taskAlerts.map((alert) => ({
          ...alert,
          targetAt: alert.targetAt.toISOString(),
        }))}
        ticketAlerts={data.ticketAlerts}
      />
    </div>
  )
}
