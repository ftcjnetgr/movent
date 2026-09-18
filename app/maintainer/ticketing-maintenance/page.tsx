import AppShell from '@/components/app-shell'
import { TicketDurationVisualization } from '@/components/duration-visualization'
import DashboardPeringatanList from '@/components/dashboard-alert-list'
import { getDashboardData } from '@/lib/server/dashboard'
import { getCurrentProfile } from '@/lib/server/profile'

export default async function MaintainerTicketingMaintenanceDashboardPage() {
  const profile = await getCurrentProfile()
  const data = await getDashboardData(profile)

  return (
    <AppShell>
      <div className="page-heading"><div><span className="eyebrow">Maintainer</span><h1>Tiket Maintenance</h1><p>Ringkasan semua tiket maintenance armada.</p></div></div>
      <div className="dashboard-tabs">
        <a className="dashboard-tab" href="/maintainer/beranda">Tugas</a>
        <a className="dashboard-tab" href="/maintainer/timetable">Jadwal</a>
        <a className="dashboard-tab active" href="/maintainer/ticketing-maintenance">Tiket Maintenance</a>
      </div>
      <section className="section-block">
        <div className="metric-grid">
          {Object.entries(data.ticketCounts).map(([status, count]) => <div className="metric-card" key={status}><span>{status}</span><strong>{count}</strong></div>)}
          <div className="metric-card alert-card"><span>Peringatan</span><strong>{data.ticketPeringatanCount}</strong></div>
        </div>
      </section>
      <DashboardPeringatanList ticketAlerts={data.ticketAlerts} />

      <TicketDurationVisualization rows={data.ticketDurations} />
    </AppShell>
  )
}
