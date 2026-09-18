import AppShell from '@/components/app-shell'
import { TaskDurationVisualization, TicketDurationVisualization } from '@/components/duration-visualization'
import DashboardAlertList from '@/components/dashboard-alert-list'
import { getDashboardData } from '@/lib/server/dashboard'
import { getCurrentProfile } from '@/lib/server/profile'

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    Assigned: 'Ditugaskan',
    Accepted: 'Diterima',
    Driving: 'Berangkat',
    Completed: 'Selesai',
    Canceled: 'Dibatalkan',
    Created: 'Dibuat',
    'In Progress': 'Sedang dikerjakan',
  }
  return labels[status] ?? status
}

export default async function MaintainerBerandaPage() {
  const profile = await getCurrentProfile()
  const data = await getDashboardData(profile)

  return (
    <AppShell>
      <div className="page-heading"><div><span className="eyebrow">Maintainer</span><h1>Beranda</h1><p>Pantau tugas dan ticketing maintenance armada.</p></div></div>
      <div className="dashboard-tabs">
        <a className="dashboard-tab active" href="/maintainer/beranda">Tugas</a>
        <a className="dashboard-tab" href="/maintainer/timetable">Jadwal</a>
        <a className="dashboard-tab" href="/maintainer/ticketing-maintenance">Tiket Maintenance</a>
      </div>
      <DashboardAlertList
        taskAlerts={data.taskAlerts.map((alert) => ({ ...alert, targetAt: alert.targetAt.toISOString() }))}
        ticketAlerts={data.ticketAlerts}
      />

      <section className="section-block">
        <div className="metric-grid">
          {Object.entries(data.taskCounts).map(([status, count]) => <div className="metric-card" key={status}><span>{statusLabel(status)}</span><strong>{count}</strong></div>)}
          <div className="metric-card alert-card"><span>Peringatan</span><strong>{data.taskAlerts.length}</strong></div>
        </div>
        <div className="metric-grid">
          <div className="metric-card"><span>Non-TGR: Ditugaskan → Berangkat</span><strong>{data.taskAveragesNonTgr.assignedDriving === null ? '-' : `${Math.round(data.taskAveragesNonTgr.assignedDriving)} m`}</strong></div>
          <div className="metric-card"><span>Non-TGR: Berangkat → Selesai</span><strong>{data.taskAveragesNonTgr.drivingCompleted === null ? '-' : `${Math.round(data.taskAveragesNonTgr.drivingCompleted)} m`}</strong></div>
          <div className="metric-card"><span>Non-TGR: Total waktu sampai selesai</span><strong>{data.taskAveragesNonTgr.completedCycle === null ? '-' : `${Math.round(data.taskAveragesNonTgr.completedCycle)} m`}</strong></div>
          <div className="metric-card"><span>Non-TGR: Total waktu sampai dibatalkan</span><strong>{data.taskAveragesNonTgr.canceledCycle === null ? '-' : `${Math.round(data.taskAveragesNonTgr.canceledCycle)} m`}</strong></div>
        </div>
      </section>
      <TaskDurationVisualization rows={data.taskDurations} />
      <TicketDurationVisualization rows={data.ticketDurations} />

      <section className="section-block">
        <div className="metric-grid">
          {Object.entries(data.ticketCounts).map(([status, count]) => <div className="metric-card" key={status}><span>{status}</span><strong>{count}</strong></div>)}
          <div className="metric-card alert-card"><span>Alert</span><strong>{data.ticketAlertCount}</strong></div>
        </div>
      </section>
    </AppShell>
  )
}
