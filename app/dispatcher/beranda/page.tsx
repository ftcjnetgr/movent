import Link from 'next/link'
import { TaskDurationVisualization, TicketDurationVisualization } from '@/components/duration-visualization'
import DashboardAlertList from '@/components/dashboard-alert-list'
import DispatcherCreateTask from '@/components/dispatcher-create-task'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDashboardData } from '@/lib/server/dashboard'
import { getCurrentProfile } from '@/lib/server/profile'

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    Assigned: 'Ditugaskan',
    Confirmed: 'Dikonfirmasi',
    Driving: 'Berangkat',
    Completed: 'Selesai',
    Canceled: 'Dibatalkan',
    Requested: 'Dibuat',
    'In Progress': 'Sedang dikerjakan',
  }
  return labels[status] ?? status
}

type DashboardData = Awaited<ReturnType<typeof getDashboardData>>

const emptyDashboard: DashboardData = {
  taskDurations: [],
  ticketDurations: [],
  taskCounts: { Assigned: 0, Confirmed: 0, Driving: 0, Completed: 0 },
  ticketCounts: { Requested: 0, Confirmed: 0, 'In Progress': 0, Completed: 0 },
  taskAlerts: [],
  ticketAlerts: [],
  ticketAlertCount: 0,
  averages: {
    assignedAccepted: null,
    acceptedDriving: null,
    drivingCompleted: null,
    completedCycle: null,
    canceledCycle: null,
  },
  taskAveragesNonTgr: {
    assignedDriving: null,
    drivingCompleted: null,
    completedCycle: null,
    canceledCycle: null,
  },
  ticketAverages: {
    createdAccepted: null,
    acceptedInProgress: null,
    inProgressCompleted: null,
    completedCycle: null,
    canceledCycle: null,
  },
}

export default async function DispatcherBerandaPage() {
  const profile = await getCurrentProfile()
  const admin = createAdminClient()
  const [{ data: locations }, { data: schedules }, { data: executors }, { data: fleets }, { data: products }] = await Promise.all([
    admin.from('locations').select('location').eq('status', 'Active').order('location'),
    admin.from('schedules').select('schedule_id, route, category, start_point, destination, std, sta, trip').eq('status', 'Active').order('schedule_day').order('std'),
    admin.from('executors').select('executor_nik, full_name').eq('status', 'Active').order('full_name'),
    admin.from('fleets').select('plat_number, fleet_type').eq('status', 'Active').order('plat_number'),
    admin.from('products').select('product').eq('status', 'Active').order('product'),
  ])

  let dashboard = emptyDashboard
  try {
    dashboard = await getDashboardData(profile)
  } catch (error) {
    console.error('Dispatcher dashboard data failed:', error)
  }

  return (
    <>
      <div className="page-heading"><div><span className="eyebrow">Dispatcher</span><h1>Beranda</h1><p>Pantau tugas yang kamu buat dan ticketing maintenance.</p></div></div>

      <div className="dashboard-tabs">
        <Link className="dashboard-tab active" href="/dispatcher/beranda">Tugas</Link>
        <Link className="dashboard-tab" href="/dispatcher/timetable">Jadwal</Link>
        <Link className="dashboard-tab" href="/dispatcher/ticketing-maintenance">Tiket Maintenance</Link>
      </div>

      <section className="section-block">
        <div className="metric-grid">
          {Object.entries(dashboard.taskCounts).map(([status, count]) => (
            <div className="metric-card" key={status}><span>{statusLabel(status)}</span><strong>{count}</strong></div>
          ))}
        </div>
      </section>

      <DashboardAlertList
        taskAlerts={dashboard.taskAlerts.map((alert) => ({ ...alert, targetAt: alert.targetAt.toISOString() }))}
        ticketAlerts={dashboard.ticketAlerts}
      />

      <DispatcherCreateTask
        locations={(locations ?? []).map((item) => item.location)}
        schedules={schedules ?? []}
        executors={executors ?? []}
        fleets={fleets ?? []}
        products={(products ?? []).map((item) => item.product)}
      />

      <section className="section-block">
        <div className="section-heading"><div><h2>Durasi & waktu proses</h2><p>Rata-rata waktu proses dari transaksi yang kamu lihat.</p></div></div>
        <div className="metric-grid">
          <div className="metric-card"><span>Ditugaskan → Diterima</span><strong>{dashboard.averages.assignedAccepted === null ? '-' : `${Math.round(dashboard.averages.assignedAccepted)} m`}</strong></div>
          <div className="metric-card"><span>Diterima → Berangkat</span><strong>{dashboard.averages.acceptedDriving === null ? '-' : `${Math.round(dashboard.averages.acceptedDriving)} m`}</strong></div>
          <div className="metric-card"><span>Berangkat → Selesai</span><strong>{dashboard.averages.drivingCompleted === null ? '-' : `${Math.round(dashboard.averages.drivingCompleted)} m`}</strong></div>
          <div className="metric-card"><span>Total waktu sampai selesai</span><strong>{dashboard.averages.completedCycle === null ? '-' : `${Math.round(dashboard.averages.completedCycle)} m`}</strong></div>
          <div className="metric-card"><span>Total waktu sampai dibatalkan</span><strong>{dashboard.averages.canceledCycle === null ? '-' : `${Math.round(dashboard.averages.canceledCycle)} m`}</strong></div>
        </div>
        <div className="metric-grid">
          <div className="metric-card"><span>Non-TGR: Ditugaskan → Berangkat</span><strong>{dashboard.taskAveragesNonTgr.assignedDriving === null ? '-' : `${Math.round(dashboard.taskAveragesNonTgr.assignedDriving)} m`}</strong></div>
          <div className="metric-card"><span>Non-TGR: Berangkat → Selesai</span><strong>{dashboard.taskAveragesNonTgr.drivingCompleted === null ? '-' : `${Math.round(dashboard.taskAveragesNonTgr.drivingCompleted)} m`}</strong></div>
          <div className="metric-card"><span>Non-TGR: Total waktu sampai selesai</span><strong>{dashboard.taskAveragesNonTgr.completedCycle === null ? '-' : `${Math.round(dashboard.taskAveragesNonTgr.completedCycle)} m`}</strong></div>
          <div className="metric-card"><span>Non-TGR: Total waktu sampai dibatalkan</span><strong>{dashboard.taskAveragesNonTgr.canceledCycle === null ? '-' : `${Math.round(dashboard.taskAveragesNonTgr.canceledCycle)} m`}</strong></div>
        </div>
      </section>

      <TaskDurationVisualization rows={dashboard.taskDurations} />
      <TicketDurationVisualization rows={dashboard.ticketDurations} />

      <section className="section-block">
        <div className="metric-grid">
          {Object.entries(dashboard.ticketCounts).map(([status, count]) => (
            <div className="metric-card" key={status}><span>{status}</span><strong>{count}</strong></div>
          ))}
        </div>
      </section>
    </>
  )
}
