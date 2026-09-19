import { TaskDurationVisualization, TicketDurationVisualization } from '@/components/duration-visualization'
import DashboardAlertList from '@/components/dashboard-alert-list'
import { getDashboardData } from '@/lib/server/dashboard'
import { getCurrentProfile } from '@/lib/server/profile'

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    Assigned: 'Ditugaskan',
    Confirmed: 'Diterima',
    Driving: 'Berangkat',
    Completed: 'Selesai',
    Canceled: 'Dibatalkan',
    Requested: 'Dibuat',
    'In Progress': 'Sedang dikerjakan',
  }
  return labels[status] ?? status
}

export default async function MaintainerBerandaPage() {
  const profile = await getCurrentProfile()
  const data = await getDashboardData(profile)

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Maintainer</span>
          <h1>Beranda</h1>
          <p>Pantau status operasional dan maintenance armada.</p>
        </div>
      </div>

      <DashboardAlertList
        taskAlerts={data.taskAlerts.map((alert) => ({ ...alert, targetAt: alert.targetAt.toISOString() }))}
        ticketAlerts={data.ticketAlerts}
      />

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>Status tugas</h2>
            <p>Ringkasan status penugasan yang perlu dipantau.</p>
          </div>
        </div>
        <div className="metric-grid">
          {Object.entries(data.taskCounts).map(([status, count]) => (
            <div className="metric-card" key={status}><span>{statusLabel(status)}</span><strong>{count}</strong></div>
          ))}
          <div className="metric-card alert-card"><span>Peringatan</span><strong>{data.taskAlerts.length}</strong></div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>Status ticketing</h2>
            <p>Ringkasan tiket maintenance dan peringatan yang perlu ditindaklanjuti.</p>
          </div>
        </div>
        <div className="metric-grid">
          {Object.entries(data.ticketCounts).map(([status, count]) => (
            <div className="metric-card" key={status}><span>{status}</span><strong>{count}</strong></div>
          ))}
          <div className="metric-card alert-card"><span>Alert</span><strong>{data.ticketAlertCount}</strong></div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>Waktu proses Non-TGR</h2>
            <p>Rata-rata waktu proses armada Non-TGR.</p>
          </div>
        </div>
        <div className="metric-grid">
          <div className="metric-card"><span>Ditugaskan → Berangkat</span><strong>{data.taskAveragesNonTgr.assignedDriving === null ? '-' : `${Math.round(data.taskAveragesNonTgr.assignedDriving)} m`}</strong></div>
          <div className="metric-card"><span>Berangkat → Selesai</span><strong>{data.taskAveragesNonTgr.drivingCompleted === null ? '-' : `${Math.round(data.taskAveragesNonTgr.drivingCompleted)} m`}</strong></div>
          <div className="metric-card"><span>Total waktu sampai selesai</span><strong>{data.taskAveragesNonTgr.completedCycle === null ? '-' : `${Math.round(data.taskAveragesNonTgr.completedCycle)} m`}</strong></div>
          <div className="metric-card"><span>Total waktu sampai dibatalkan</span><strong>{data.taskAveragesNonTgr.canceledCycle === null ? '-' : `${Math.round(data.taskAveragesNonTgr.canceledCycle)} m`}</strong></div>
        </div>
      </section>

      <TaskDurationVisualization rows={data.taskDurations} />
      <TicketDurationVisualization rows={data.ticketDurations} />
    </>
  )
}
