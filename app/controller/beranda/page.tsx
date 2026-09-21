import Link from 'next/link'
import DashboardAlertList from '@/components/dashboard-alert-list'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'
import { getDashboardData } from '@/lib/server/dashboard'

function statusLabel(status: string) {
  return ({ Requested: 'Diajukan', Confirmed: 'Dikonfirmasi', Assigned: 'Ditugaskan', Driving: 'Berangkat', Completed: 'Selesai', Canceled: 'Dibatalkan' } as Record<string, string>)[status] ?? status
}

function typeLabel(type: string) {
  return type === 'Supply' ? 'Supply' : 'Distribusi'
}

function timeLabel(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  })
}

export default async function ControllerPenugasanDashboardPage() {
  const profile = await getCurrentProfile()
  const admin = createAdminClient()
  const [data, taskResult, canceledResult] = await Promise.all([
    getDashboardData(profile),
    admin.from('tasks').select('transaction_id, task_type, status, start_point, destination, std, executor_snapshot, fleet_snapshot').order('created_at', { ascending: false }).limit(12),
    admin.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'Canceled'),
  ])

  const tasks = taskResult.data ?? []
  const activeCount = (data.taskCounts.Assigned ?? 0) + (data.taskCounts.Confirmed ?? 0) + (data.taskCounts.Driving ?? 0)

  return (
    <div className="role-page dashboard-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Controller</span>
          <h1>Penugasan</h1>
          <p>Pantau pergerakan penugasan dan kondisi operasional hari ini.</p>
        </div>

      </div>

      <section className="metric-grid controller-kpi-grid dashboard-kpi-row">
        <div className="metric-card"><span>Assigned</span><strong>{data.taskCounts.Assigned ?? 0}</strong><small>Menunggu diterima</small></div>
        <div className="metric-card"><span>Confirmed</span><strong>{data.taskCounts.Confirmed ?? 0}</strong><small>Sudah diterima</small></div>
        <div className="metric-card"><span>Driving</span><strong>{data.taskCounts.Driving ?? 0}</strong><small>Sedang berjalan</small></div>
        <div className="metric-card metric-completed"><span>Completed</span><strong>{data.taskCounts.Completed ?? 0}</strong><small>Sudah selesai</small></div>
        <div className="metric-card metric-canceled"><span>Canceled</span><strong>{canceledResult.count ?? 0}</strong><small>Dibatalkan</small></div>
        <div className="metric-card metric-ticket"><span>Aktif</span><strong>{activeCount}</strong><small>Penugasan berjalan</small></div>
      </section>

      <section className="dashboard-alert-section">
        <div className="section-heading">
          <div><h2>Alert Penugasan</h2><p>Jadwal yang perlu diperhatikan berdasarkan waktu STD dan STA.</p></div>
        </div>
        <DashboardAlertList taskAlerts={data.taskAlerts.map((alert) => ({ ...alert, targetAt: alert.targetAt.toISOString() }))} />
      </section>

      <section className="section-block dashboard-table-section">
        <div className="section-heading">
          <div><h2>Penugasan Hari Ini</h2><p>Penugasan terbaru yang sedang dipantau.</p></div>
          <span className="section-count">{tasks.length} data</span>
        </div>
        <div className="data-table-card dashboard-table-card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Waktu</th><th>ID</th><th>Jenis</th><th>Rute</th><th>Armada</th><th>Executor</th><th>Status</th></tr></thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.transaction_id}>
                    <td>{timeLabel(task.std)}</td>
                    <td><strong>{task.transaction_id}</strong></td>
                    <td>{typeLabel(task.task_type)}</td>
                    <td><span className="route-cell">{task.start_point ?? '-'} <b>→</b> {task.destination ?? '-'}</span></td>
                    <td>{task.fleet_snapshot?.plat_number ?? '-'}</td>
                    <td>{task.executor_snapshot?.full_name ?? '-'}</td>
                    <td><span className={'status-badge status-' + task.status.toLowerCase().replaceAll(' ', '-')}>{statusLabel(task.status)}</span></td>
                  </tr>
                ))}
                {!tasks.length ? (
                  <tr><td colSpan={7}><div className="dashboard-empty-state"><strong>Belum ada penugasan hari ini.</strong><span>Penugasan yang masuk akan muncul di sini.</span></div></td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
