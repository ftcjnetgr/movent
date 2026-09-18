import AppShell from '@/components/app-shell'
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

export default async function ControllerBerandaPage() {
  const profile = await getCurrentProfile()
  const data = await getDashboardData(profile)

  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Controller</span>
          <h1>Beranda</h1>
          <p>Pantau pergerakan operasional dari satu tempat.</p>
        </div>
      </div>

      <div className="dashboard-tabs">
        <a className="dashboard-tab active" href="/controller/beranda">Tugas</a>
        <a className="dashboard-tab" href="/controller/timetable">Timetable</a>
        <a className="dashboard-tab" href="/controller/ticketing-maintenance">Ticketing Maintenance</a>
      </div>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>Tugas</h2>
            <p>Summary seluruh tugas yang ada.</p>
          </div>
        </div>
        <div className="metric-grid">
          {Object.entries(data.taskCounts).map(([status, count]) => (
            <div className="metric-card" key={status}><span>{status}</span><strong>{count}</strong></div>
          ))}
          <div className="metric-card alert-card"><span>Alert</span><strong>{data.taskAlerts.length}</strong></div>
        </div>


      </section>

      <DashboardAlertList
        taskAlerts={data.taskAlerts.map((alert) => ({ ...alert, targetAt: alert.targetAt.toISOString() }))}
        ticketAlerts={data.ticketAlerts}
      />

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>Durasi & Cycle Time</h2>
            <p>Rata-rata proses berdasarkan transaksi yang sudah memiliki penanda waktu.</p>
          </div>
        </div>
        <div className="metric-grid">
          <div className="metric-card"><span>Assigned → Accepted</span><strong>{formatMinutes(data.averages.assignedAccepted)}</strong></div>
          <div className="metric-card"><span>Accepted → Driving</span><strong>{formatMinutes(data.averages.acceptedDriving)}</strong></div>
          <div className="metric-card"><span>Driving → Completed</span><strong>{formatMinutes(data.averages.drivingCompleted)}</strong></div>
          <div className="metric-card"><span>Cycle Completed</span><strong>{formatMinutes(data.averages.completedCycle)}</strong></div>
          <div className="metric-card"><span>Cycle Canceled</span><strong>{formatMinutes(data.averages.canceledCycle)}</strong></div>
        </div>
        <div className="metric-grid">
          <div className="metric-card"><span>Non-TGR: Assigned → Driving</span><strong>{formatMinutes(data.taskAveragesNonTgr.assignedDriving)}</strong></div>
          <div className="metric-card"><span>Non-TGR: Driving → Completed</span><strong>{formatMinutes(data.taskAveragesNonTgr.drivingCompleted)}</strong></div>
          <div className="metric-card"><span>Non-TGR: Cycle Completed</span><strong>{formatMinutes(data.taskAveragesNonTgr.completedCycle)}</strong></div>
          <div className="metric-card"><span>Non-TGR: Cycle Canceled</span><strong>{formatMinutes(data.taskAveragesNonTgr.canceledCycle)}</strong></div>
        </div>
      </section>

      <TaskDurationVisualization rows={data.taskDurations} />
      <TicketDurationVisualization rows={data.ticketDurations} />

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>Ticketing Maintenance</h2>
            <p>Summary seluruh ticketing maintenance.</p>
          </div>
        </div>
        <div className="metric-grid">
          {Object.entries(data.ticketCounts).map(([status, count]) => (
            <div className="metric-card" key={status}><span>{status}</span><strong>{count}</strong></div>
          ))}
          <div className="metric-card alert-card"><span>Alert</span><strong>{data.ticketAlertCount}</strong></div>
        </div>
        <div className="metric-grid">
          <div className="metric-card"><span>Created → Accepted</span><strong>{formatMinutes(data.ticketAverages.createdAccepted)}</strong></div>
          <div className="metric-card"><span>Accepted → In Progress</span><strong>{formatMinutes(data.ticketAverages.acceptedInProgress)}</strong></div>
          <div className="metric-card"><span>In Progress → Completed</span><strong>{formatMinutes(data.ticketAverages.inProgressCompleted)}</strong></div>
          <div className="metric-card"><span>Cycle Completed</span><strong>{formatMinutes(data.ticketAverages.completedCycle)}</strong></div>
          <div className="metric-card"><span>Cycle Canceled</span><strong>{formatMinutes(data.ticketAverages.canceledCycle)}</strong></div>
        </div>

      </section>
    </AppShell>
  )
}
