import AppShell from '@/components/app-shell'
import { getCurrentProfile } from '@/lib/server/profile'
import { getDashboardData } from '@/lib/server/dashboard'

function formatMinutes(value: number | null) {
  if (value === null) return '-'
  if (value < 60) return `${Math.round(value)} m`
  const hours = Math.floor(value / 60)
  const minutes = Math.round(value % 60)
  return `${hours}j ${minutes}m`
}

function alertLabel(targetAt: Date) {
  const diff = Date.now() - targetAt.getTime()
  if (diff >= 0) return `Count After ${formatMinutes(diff / 60000)}`
  return `Countdown ${formatMinutes(Math.abs(diff) / 60000)}`
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

        <div className="alert-list">
          {data.taskAlerts.slice(0, 12).map((alert) => (
            <div className="alert-item" key={`${alert.kind}-${alert.scheduleId}-${alert.transactionId ?? ''}`}>
              <div><strong>{alert.kind === 'unassigned' ? `Schedule ${alert.scheduleId}` : alert.transactionId}</strong><span>{alert.kind === 'unassigned' ? 'Belum digunakan Dispatcher' : `Status ${alert.status} • Schedule ${alert.scheduleId}`}</span></div>
              <b>{alertLabel(alert.targetAt)}</b>
            </div>
          ))}
          {data.taskAlerts.length === 0 ? <div className="empty-state">Belum ada alert tugas.</div> : null}
        </div>
      </section>

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
      </section>

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
          <div className="metric-card alert-card"><span>Alert</span><strong>{data.ticketAlerts.length}</strong></div>
        </div>
        <div className="metric-grid">
          <div className="metric-card"><span>Created → Accepted</span><strong>{formatMinutes(data.ticketAverages.createdAccepted)}</strong></div>
          <div className="metric-card"><span>Accepted → In Progress</span><strong>{formatMinutes(data.ticketAverages.acceptedInProgress)}</strong></div>
          <div className="metric-card"><span>In Progress → Completed</span><strong>{formatMinutes(data.ticketAverages.inProgressCompleted)}</strong></div>
          <div className="metric-card"><span>Cycle Completed</span><strong>{formatMinutes(data.ticketAverages.completedCycle)}</strong></div>
          <div className="metric-card"><span>Cycle Canceled</span><strong>{formatMinutes(data.ticketAverages.canceledCycle)}</strong></div>
        </div>
        <div className="alert-list">
          {data.ticketAlerts.slice(0, 12).map((ticket) => (
            <div className="alert-item" key={ticket.transaction_id}>
              <div><strong>{ticket.transaction_id}</strong><span>Status {ticket.status}</span></div>
              <b>{ticket.status === 'Created' ? alertLabel(new Date(new Date(ticket.created_at).getTime() + 3 * 60 * 60 * 1000)) : ticket.status === 'Accepted' ? alertLabel(new Date(new Date(ticket.accepted_at as string).getTime() + 24 * 60 * 60 * 1000)) : alertLabel(new Date(new Date(ticket.in_progress_at as string).getTime() + 72 * 60 * 60 * 1000))}</b>
            </div>
          ))}
          {data.ticketAlerts.length === 0 ? <div className="empty-state">Belum ada alert ticketing.</div> : null}
        </div>
      </section>
    </AppShell>
  )
}
