import { TaskDurationVisualization, TicketDurationVisualization } from '@/components/duration-visualization'
import DashboardAlertList from '@/components/dashboard-alert-list'
import { getCurrentProfile } from '@/lib/server/profile'
import { getDashboardData } from '@/lib/server/dashboard'

function formatMinutes(value: number | null) {
  if (value === null) return '-'
  if (value < 60) return `${Math.round(value)} m`
  const hours = Math.floor(value / 60)
  const minutes = Math.round(value % 60)
  return `${hours}j ${minutes}m`
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    Assigned: 'Ditugaskan',
    Confirmed: 'Dikonfirmasi',
    Driving: 'Berangkat',
    Completed: 'Selesai',
    Canceled: 'Dibatalkan',
    Requested: 'Diajukan',
    'In Progress': 'Sedang dikerjakan',
  }
  return labels[status] ?? status
}

export default async function ControllerBerandaPage() {
  const profile = await getCurrentProfile()
  const data = await getDashboardData(profile)

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Controller</span>
          <h1>Beranda</h1>
          <p>Pantau pergerakan operasional dari satu tempat.</p>
        </div>
      </div>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>Tugas</h2>
            <p>Ringkasan semua tugas yang ada.</p>
          </div>
        </div>
        <div className="metric-grid">
          {Object.entries(data.taskCounts).map(([status, count]) => (
            <div className="metric-card" key={status}><span>{statusLabel(status)}</span><strong>{count}</strong></div>
          ))}
        </div>
      </section>

      <DashboardAlertList
        taskAlerts={data.taskAlerts.map((alert) => ({ ...alert, targetAt: alert.targetAt.toISOString() }))}
        ticketAlerts={data.ticketAlerts}
      />

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>Durasi & waktu proses</h2>
            <p>Rata-rata waktu proses dari transaksi yang sudah punya penanda waktu.</p>
          </div>
        </div>
        <div className="metric-grid">
          <div className="metric-card"><span>Ditugaskan → Diterima</span><strong>{formatMinutes(data.averages.assignedAccepted)}</strong></div>
          <div className="metric-card"><span>Diterima → Berangkat</span><strong>{formatMinutes(data.averages.acceptedDriving)}</strong></div>
          <div className="metric-card"><span>Berangkat → Selesai</span><strong>{formatMinutes(data.averages.drivingCompleted)}</strong></div>
          <div className="metric-card"><span>Total waktu sampai selesai</span><strong>{formatMinutes(data.averages.completedCycle)}</strong></div>
          <div className="metric-card"><span>Total waktu sampai dibatalkan</span><strong>{formatMinutes(data.averages.canceledCycle)}</strong></div>
        </div>
        <div className="metric-grid">
          <div className="metric-card"><span>Non-TGR: Ditugaskan → Berangkat</span><strong>{formatMinutes(data.taskAveragesNonTgr.assignedDriving)}</strong></div>
          <div className="metric-card"><span>Non-TGR: Berangkat → Selesai</span><strong>{formatMinutes(data.taskAveragesNonTgr.drivingCompleted)}</strong></div>
          <div className="metric-card"><span>Non-TGR: Total waktu sampai selesai</span><strong>{formatMinutes(data.taskAveragesNonTgr.completedCycle)}</strong></div>
          <div className="metric-card"><span>Non-TGR: Total waktu sampai dibatalkan</span><strong>{formatMinutes(data.taskAveragesNonTgr.canceledCycle)}</strong></div>
        </div>
      </section>

      <TaskDurationVisualization rows={data.taskDurations} />
      <TicketDurationVisualization rows={data.ticketDurations} />

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>Ticketing Maintenance</h2>
            <p>Ringkasan semua tiket maintenance.</p>
          </div>
        </div>
        <div className="metric-grid">
          {Object.entries(data.ticketCounts).map(([status, count]) => (
            <div className="metric-card" key={status}><span>{status}</span><strong>{count}</strong></div>
          ))}
        </div>
        <div className="metric-grid">
          <div className="metric-card"><span>Requested → Confirmed</span><strong>{formatMinutes(data.ticketAverages.createdAccepted)}</strong></div>
          <div className="metric-card"><span>Confirmed → In Progress</span><strong>{formatMinutes(data.ticketAverages.acceptedInProgress)}</strong></div>
          <div className="metric-card"><span>In Progress → Completed</span><strong>{formatMinutes(data.ticketAverages.inProgressCompleted)}</strong></div>
          <div className="metric-card"><span>Cycle Completed</span><strong>{formatMinutes(data.ticketAverages.completedCycle)}</strong></div>
          <div className="metric-card"><span>Cycle Canceled</span><strong>{formatMinutes(data.ticketAverages.canceledCycle)}</strong></div>
        </div>
      </section>
    </>
  )
}
