import Link from 'next/link'
import DashboardAlertList from '@/components/dashboard-alert-list'
import { getCurrentProfile } from '@/lib/server/profile'
import { getDashboardData } from '@/lib/server/dashboard'

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    Requested: 'Diajukan',
    Confirmed: 'Dikonfirmasi',
    Assigned: 'Ditugaskan',
    Driving: 'Berangkat',
    Completed: 'Selesai',
    Canceled: 'Dibatalkan',
    'In Progress': 'Sedang dikerjakan',
  }
  return labels[status] ?? status
}

export default async function ControllerBerandaPage() {
  const profile = await getCurrentProfile()
  const data = await getDashboardData(profile)
  const activeTasks = (data.taskCounts.Assigned ?? 0) + (data.taskCounts.Confirmed ?? 0) + (data.taskCounts.Driving ?? 0)
  const activeTickets = (data.ticketCounts.Requested ?? 0) + (data.ticketCounts.Confirmed ?? 0) + (data.ticketCounts['In Progress'] ?? 0)

  return (
    <div className="role-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">CONTROLLER</span>
          <h1>Monitoring Operasional</h1>
          <p>Lihat kondisi penugasan, jadwal, dan ticketing dari satu layar.</p>
        </div>
        <div className="page-heading-actions">
          <Link className="secondary-button button-link" href="/controller/schedule">Lihat Schedule</Link>
          <Link className="button-link" href="/controller/penarikan-report">Tarik Report</Link>
        </div>
      </div>

      <section className="section-block">
        <div className="section-heading"><div><h2>Ringkasan hari ini</h2><p>Status operasional yang sedang berjalan.</p></div></div>
        <div className="metric-grid">
          <div className="metric-card"><span>Total Penugasan</span><strong>{Object.values(data.taskCounts).reduce((a,b)=>a+b,0)}</strong></div>
          <div className="metric-card"><span>Sedang Berjalan</span><strong>{data.taskCounts.Driving ?? 0}</strong></div>
          <div className="metric-card"><span>Menunggu Tindakan</span><strong>{activeTasks}</strong></div>
          <div className="metric-card"><span>Ticketing Aktif</span><strong>{activeTickets}</strong></div>
          <div className="metric-card alert-card"><span>Alert</span><strong>{data.taskAlerts.length + data.ticketAlertCount}</strong></div>
        </div>
      </section>

      <DashboardAlertList
        taskAlerts={data.taskAlerts.map((alert) => ({ ...alert, targetAt: alert.targetAt.toISOString() }))}
        ticketAlerts={data.ticketAlerts}
      />

      <section className="section-block">
        <div className="section-heading"><div><h2>Status penugasan</h2><p>Distribusi status seluruh penugasan yang tersedia untuk monitoring.</p></div></div>
        <div className="metric-grid">
          {Object.entries(data.taskCounts).map(([status,count]) => (
            <div className="metric-card" key={status}><span>{statusLabel(status)}</span><strong>{count}</strong></div>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><h2>Status ticketing</h2><p>Pergerakan tiket maintenance dari request sampai selesai.</p></div></div>
        <div className="metric-grid">
          {Object.entries(data.ticketCounts).map(([status,count]) => (
            <div className="metric-card" key={status}><span>{statusLabel(status)}</span><strong>{count}</strong></div>
          ))}
        </div>
      </section>
    </div>
  )
}
