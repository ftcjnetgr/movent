import AppShell from '@/components/app-shell'
import { getDashboardData } from '@/lib/server/dashboard'
import { getCurrentProfile } from '@/lib/server/profile'

export default async function DispatcherBerandaPage() {
  const profile = await getCurrentProfile()
  const data = await getDashboardData(profile)

  return (
    <AppShell>
      <div className="page-heading"><div><span className="eyebrow">Dispatcher</span><h1>Beranda</h1><p>Pantau tugas yang kamu buat dan ticketing maintenance.</p></div></div>
      <div className="dashboard-tabs">
        <a className="dashboard-tab active" href="/dispatcher/beranda">Tugas</a>
        <a className="dashboard-tab" href="/dispatcher/timetable">Timetable</a>
        <a className="dashboard-tab" href="/dispatcher/ticketing-maintenance">Ticketing Maintenance</a>
      </div>
      <section className="section-block">
        <div className="metric-grid">
          {Object.entries(data.taskCounts).map(([status, count]) => <div className="metric-card" key={status}><span>{status}</span><strong>{count}</strong></div>)}
          <div className="metric-card alert-card"><span>Alert</span><strong>{data.taskAlerts.length}</strong></div>
        </div>
      </section>
      <section className="section-block">
        <div className="section-heading"><div><h2>Durasi & Cycle Time</h2><p>Rata-rata dari transaksi yang terlihat oleh Dispatcher ini.</p></div></div>
        <div className="metric-grid">
          <div className="metric-card"><span>Assigned → Accepted</span><strong>{data.averages.assignedAccepted === null ? '-' : `${Math.round(data.averages.assignedAccepted)} m`}</strong></div>
          <div className="metric-card"><span>Accepted → Driving</span><strong>{data.averages.acceptedDriving === null ? '-' : `${Math.round(data.averages.acceptedDriving)} m`}</strong></div>
          <div className="metric-card"><span>Driving → Completed</span><strong>{data.averages.drivingCompleted === null ? '-' : `${Math.round(data.averages.drivingCompleted)} m`}</strong></div>
          <div className="metric-card"><span>Cycle Completed</span><strong>{data.averages.completedCycle === null ? '-' : `${Math.round(data.averages.completedCycle)} m`}</strong></div>
          <div className="metric-card"><span>Cycle Canceled</span><strong>{data.averages.canceledCycle === null ? '-' : `${Math.round(data.averages.canceledCycle)} m`}</strong></div>
        </div>
      </section>
      <section className="section-block">
        <div className="metric-grid">
          {Object.entries(data.ticketCounts).map(([status, count]) => <div className="metric-card" key={status}><span>{status}</span><strong>{count}</strong></div>)}
          <div className="metric-card alert-card"><span>Alert Ticketing</span><strong>{data.ticketAlerts.length}</strong></div>
        </div>
      </section>
    </AppShell>
  )
}
