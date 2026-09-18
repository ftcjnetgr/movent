import Link from 'next/link'
import { TicketDurationVisualization } from '@/components/duration-visualization'
import DashboardPeringatanList from '@/components/dashboard-alert-list'
import { getDashboardData } from '@/lib/server/dashboard'
import { getCurrentProfile } from '@/lib/server/profile'

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    Created: 'Dibuat',
    Accepted: 'Diterima',
    'In Progress': 'Sedang Dikerjakan',
    Completed: 'Selesai',
    Canceled: 'Dibatalkan',
  }
  return labels[status] ?? status
}

function formatMinutes(value: number | null) {
  if (value === null) return '-'
  if (value < 60) return Math.round(value) + ' m'
  return Math.floor(value / 60) + 'j ' + Math.round(value % 60) + 'm'
}

export default async function ControllerTicketingMaintenancePage() {
  const profile = await getCurrentProfile()
  const data = await getDashboardData(profile)

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Controller</span>
          <h1>Tiket Maintenance</h1>
          <p>Pantau seluruh tiket maintenance armada dan proses pengerjaannya.</p>
        </div>
      </div>

      <div className="dashboard-tabs">
        <Link className="dashboard-tab" href="/controller/beranda">Tugas</Link>
        <Link className="dashboard-tab" href="/controller/timetable">Jadwal</Link>
        <Link className="dashboard-tab active" href="/controller/ticketing-maintenance">Tiket Maintenance</Link>
      </div>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>Status Tiket</h2>
            <p>Ringkasan status seluruh tiket maintenance.</p>
          </div>
        </div>
        <div className="metric-grid">
          {Object.entries(data.ticketCounts).map(([status, count]) => (
            <div className="metric-card" key={status}>
              <span>{statusLabel(status)}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
      </section>

      <DashboardPeringatanList ticketAlerts={data.ticketAlerts} />

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>Durasi Proses</h2>
            <p>Rata-rata waktu antar tahap proses tiket.</p>
          </div>
        </div>
        <div className="metric-grid">
          <div className="metric-card"><span>Dibuat → Diterima</span><strong>{formatMinutes(data.ticketAverages.createdAccepted)}</strong></div>
          <div className="metric-card"><span>Diterima → Dikerjakan</span><strong>{formatMinutes(data.ticketAverages.acceptedInProgress)}</strong></div>
          <div className="metric-card"><span>Dikerjakan → Selesai</span><strong>{formatMinutes(data.ticketAverages.inProgressCompleted)}</strong></div>
          <div className="metric-card"><span>Total → Selesai</span><strong>{formatMinutes(data.ticketAverages.completedCycle)}</strong></div>
          <div className="metric-card"><span>Total → Dibatalkan</span><strong>{formatMinutes(data.ticketAverages.canceledCycle)}</strong></div>
        </div>
      </section>

      <TicketDurationVisualization rows={data.ticketDurations} />
    </>
  )
}
