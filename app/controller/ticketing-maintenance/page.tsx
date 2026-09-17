import AppShell from '@/components/app-shell'
import { getDashboardData } from '@/lib/server/dashboard'
import { getCurrentProfile } from '@/lib/server/profile'

function deadlineLabel(status: string, value: string | null) {
  if (!value) return '-'
  const threshold = status === 'Created' ? 3 * 60 : status === 'Accepted' ? 24 * 60 : 72 * 60
  const elapsed = (Date.now() - new Date(value).getTime()) / 60000
  if (elapsed < threshold) return `Countdown ${Math.round(threshold - elapsed)} m`
  return `Count After ${Math.round(elapsed - threshold)} m`
}

export default async function ControllerTicketingMaintenancePage() {
  const profile = await getCurrentProfile()
  const data = await getDashboardData(profile)

  return (
    <AppShell>
      <div className="page-heading"><div><span className="eyebrow">Controller</span><h1>Ticketing Maintenance</h1><p>Pantau seluruh ticketing maintenance armada.</p></div></div>
      <div className="dashboard-tabs">
        <a className="dashboard-tab" href="/controller/beranda">Tugas</a>
        <a className="dashboard-tab" href="/controller/timetable">Timetable</a>
        <a className="dashboard-tab active" href="/controller/ticketing-maintenance">Ticketing Maintenance</a>
      </div>
      <section className="section-block">
        <div className="metric-grid">
          {Object.entries(data.ticketCounts).map(([status, count]) => <div className="metric-card" key={status}><span>{status}</span><strong>{count}</strong></div>)}
          <div className="metric-card alert-card"><span>Alert</span><strong>{data.ticketAlerts.length}</strong></div>
        </div>
      </section>
      <section className="section-block">
        <div className="metric-grid">
          <div className="metric-card"><span>Created → Accepted</span><strong>{data.ticketAverages.createdAccepted === null ? '-' : `${Math.round(data.ticketAverages.createdAccepted)} m`}</strong></div>
          <div className="metric-card"><span>Accepted → In Progress</span><strong>{data.ticketAverages.acceptedInProgress === null ? '-' : `${Math.round(data.ticketAverages.acceptedInProgress)} m`}</strong></div>
          <div className="metric-card"><span>In Progress → Completed</span><strong>{data.ticketAverages.inProgressCompleted === null ? '-' : `${Math.round(data.ticketAverages.inProgressCompleted)} m`}</strong></div>
          <div className="metric-card"><span>Cycle Completed</span><strong>{data.ticketAverages.completedCycle === null ? '-' : `${Math.round(data.ticketAverages.completedCycle)} m`}</strong></div>
          <div className="metric-card"><span>Cycle Canceled</span><strong>{data.ticketAverages.canceledCycle === null ? '-' : `${Math.round(data.ticketAverages.canceledCycle)} m`}</strong></div>
        </div>
      </section>
      <section className="section-block">
        <div className="alert-list">
          {data.ticketAlerts.map((ticket) => (
            <div className="alert-item" key={ticket.transaction_id}>
              <div><strong>{ticket.transaction_id}</strong><span>Status {ticket.status}</span></div>
              <b>{ticket.status === 'Created' ? deadlineLabel(ticket.status, ticket.created_at) : ticket.status === 'Accepted' ? deadlineLabel(ticket.status, ticket.accepted_at) : deadlineLabel(ticket.status, ticket.in_progress_at)}</b>
            </div>
          ))}
          {!data.ticketAlerts.length ? <div className="empty-state">Belum ada alert ticketing.</div> : null}
        </div>
      </section>
    </AppShell>
  )
}
