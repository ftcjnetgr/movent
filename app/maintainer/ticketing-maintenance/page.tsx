import AppShell from '@/components/app-shell'
import { getDashboardData } from '@/lib/server/dashboard'
import { getCurrentProfile } from '@/lib/server/profile'

export default async function MaintainerTicketingMaintenanceDashboardPage() {
  const profile = await getCurrentProfile()
  const data = await getDashboardData(profile)

  return (
    <AppShell>
      <div className="page-heading"><div><span className="eyebrow">Maintainer</span><h1>Ticketing Maintenance</h1><p>Summary seluruh ticketing maintenance armada.</p></div></div>
      <div className="dashboard-tabs">
        <a className="dashboard-tab" href="/maintainer/beranda">Tugas</a>
        <a className="dashboard-tab" href="/maintainer/timetable">Timetable</a>
        <a className="dashboard-tab active" href="/maintainer/ticketing-maintenance">Ticketing Maintenance</a>
      </div>
      <section className="section-block">
        <div className="metric-grid">
          {Object.entries(data.ticketCounts).map(([status, count]) => <div className="metric-card" key={status}><span>{status}</span><strong>{count}</strong></div>)}
          <div className="metric-card alert-card"><span>Alert</span><strong>{data.ticketAlerts.length}</strong></div>
        </div>
      </section>
    </AppShell>
  )
}
