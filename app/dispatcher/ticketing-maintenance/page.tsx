import Link from 'next/link'
import { TicketDurationVisualization } from '@/components/duration-visualization'
import DashboardPeringatanList from '@/components/dashboard-alert-list'
import { getDashboardData } from '@/lib/server/dashboard'
import { getCurrentProfile } from '@/lib/server/profile'

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    Requested: 'Dibuat',
    Confirmed: 'Diterima',
    'In Progress': 'Sedang dikerjakan',
    Completed: 'Selesai',
    Canceled: 'Dibatalkan',
  }
  return labels[status] ?? status
}

export default async function DispatcherTicketingMaintenancePage() {
  const profile = await getCurrentProfile()
  const data = await getDashboardData(profile)

  return (
    <>
    <div className="page-heading"><div><span className="eyebrow">Dispatcher</span><h1>Tiket Maintenance</h1><p>Ringkasan semua tiket maintenance armada.</p></div></div>
      <div className="dashboard-tabs">
        <Link className="dashboard-tab" href="/dispatcher/beranda">Tugas</Link>
        <Link className="dashboard-tab" href="/dispatcher/timetable">Jadwal</Link>
        <Link className="dashboard-tab active" href="/dispatcher/ticketing-maintenance">Tiket Maintenance</Link>
      </div>
      <section className="section-block">
        <div className="metric-grid">
          {Object.entries(data.ticketCounts).map(([status, count]) => <div className="metric-card" key={status}><span>{statusLabel(status)}</span><strong>{count}</strong></div>)}
          <div className="metric-card alert-card"><span>Peringatan</span><strong>{data.ticketAlertCount}</strong></div>
        </div>
      </section>
      <DashboardPeringatanList ticketAlerts={data.ticketAlerts} />

      <TicketDurationVisualization rows={data.ticketDurations} />
    </>
  )
}
