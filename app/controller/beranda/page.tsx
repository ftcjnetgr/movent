import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'
import { getDashboardData } from '@/lib/server/dashboard'

function statusLabel(status: string) {
  return ({
    Requested: 'Udah Diajukan',
    Confirmed: 'Udah Diterima',
    Assigned: 'Siap Jalan',
    Driving: 'Lagi Jalan',
    Completed: 'Udah Selesai',
    Canceled: 'Dibatalkan',
  } as Record<string, string>)[status] ?? status
}

function timeLabel(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  })
}

function shortTime(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  })
}

export default async function ControllerPenugasanDashboardPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const profile = await getCurrentProfile()
  const admin = createAdminClient()

  const now = new Date()
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  const params = await searchParams
  const requestedFrom = params.from ?? today
  const requestedTo = params.to ?? requestedFrom
  const from = /^\d{4}-\d{2}-\d{2}$/.test(requestedFrom) ? requestedFrom : today
  const to = /^\d{4}-\d{2}-\d{2}$/.test(requestedTo) && requestedTo >= from ? requestedTo : from
  const rangeStart = new Date(`${from}T00:00:00+07:00`).toISOString()
  const rangeEnd = new Date(new Date(`${to}T00:00:00+07:00`).getTime() + 86400000).toISOString()

  const [data, tasksResult, activityResult, totalTaskResult] = await Promise.all([
    getDashboardData(profile, from, to),
    admin
      .from('tasks')
      .select('transaction_id, task_type, status, start_point, destination, std, sta, executor_snapshot, fleet_snapshot, schedule_id, created_at')
      .order('created_at', { ascending: false })
      .gte('std', rangeStart)
      .lt('std', rangeEnd)
      .limit(8),
    admin
      .from('tasks')
      .select('status, std')
      .gte('std', rangeStart)
      .lt('std', rangeEnd),
    admin
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .gte('std', rangeStart)
      .lt('std', rangeEnd),
  ])

  const tasks = tasksResult.data ?? []
  const activities = activityResult.data ?? []
  const activeTasks =
    (data.taskCounts.Assigned ?? 0) +
    (data.taskCounts.Confirmed ?? 0) +
    (data.taskCounts.Driving ?? 0)

  const completedTasks = activities.filter((task) => task.status === 'Completed').length

  const byHour = Array.from({ length: 24 }, (_, hour) => {
    const rows = activities.filter((task) => {
      if (!task.std) return false
      return new Date(task.std).toLocaleString('en-US', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        hour12: false,
      }).slice(0, 2) === String(hour).padStart(2, '0')
    })
    return {
      hour,
      total: rows.length,
      completed: rows.filter((row) => row.status === 'Completed').length,
      driving: rows.filter((row) => ['Assigned', 'Confirmed', 'Driving'].includes(row.status)).length,
      canceled: rows.filter((row) => row.status === 'Canceled').length,
      unassigned: 0,
    }
  })

  const maxHour = Math.max(1, ...byHour.map((item) => item.total))
  return (
    <div className="super-dashboard">
      <div className="super-dashboard-heading">
        <div>
          <span className="eyebrow">Controller</span>
          <h1>Selamat datang, {profile.full_name}! <span aria-hidden="true">👋</span></h1>
          <p>Ini ringkasan operasional sesuai periode yang dipilih. Biar gampang dipantau, semuanya kami rangkum di sini.</p>
        </div>
      </div>

      <section className="super-kpi-grid assignment-kpi-grid">
        <div className="super-kpi-card kpi-blue">
          <div className="super-kpi-icon">⌁</div>
          <div className="super-kpi-content">
            <span>Semua Tugas</span>
            <strong>{totalTaskResult.count ?? 0}</strong>
            <small>Semua data</small>
          </div>
        </div>
        <div className="super-kpi-card kpi-orange">
          <div className="super-kpi-icon">▰</div>
          <div className="super-kpi-content">
            <span>Siap Jalan</span>
            <strong>{data.taskCounts.Assigned ?? 0}</strong>
            <small>Belum mulai</small>
          </div>
        </div>
        <div className="super-kpi-card kpi-cyan">
          <div className="super-kpi-icon">✓</div>
          <div className="super-kpi-content">
            <span>Udah Diterima</span>
            <strong>{data.taskCounts.Confirmed ?? 0}</strong>
            <small>Udah diterima</small>
          </div>
        </div>
        <div className="super-kpi-card kpi-green">
          <div className="super-kpi-icon">◷</div>
          <div className="super-kpi-content">
            <span>Lagi Jalan</span>
            <strong>{data.taskCounts.Driving ?? 0}</strong>
            <small>Sedang berjalan</small>
          </div>
        </div>
        <div className="super-kpi-card kpi-purple">
          <div className="super-kpi-icon">✓</div>
          <div className="super-kpi-content">
            <span>Udah Selesai</span>
            <strong>{data.taskCounts.Completed ?? 0}</strong>
            <small>Udah selesai</small>
          </div>
        </div>
      </section>


      <section className="super-dashboard-main-grid">
        <div className="super-panel super-chart-panel">
          <div className="super-panel-heading">
            <div>
              <h2>Aktivitas Tugas</h2>
              <p>Lihat ritme keberangkatan berdasarkan periode yang dipilih.</p>
            </div>
            <div className="super-chart-legend">
              <span><i className="legend-blue" /> Udah Selesai</span>
              <span><i className="legend-green" /> Lagi Jalan</span>
              <span><i className="legend-orange" /> Siap Jalan</span>
              <span><i className="legend-red" /> Dibatalkan</span>
            </div>
          </div>
          <div className="super-chart">
            <div className="super-chart-y"><span>{maxHour}</span><span>{Math.ceil(maxHour / 2)}</span><span>0</span></div>
            <div className="super-chart-bars">
              {byHour.map((item) => (
                <div className="super-chart-column" key={item.hour}>
                  <div className="super-chart-stack">
                    {item.completed > 0 ? <span className="bar-completed" style={{ height: `${(item.completed / maxHour) * 100}%` }} /> : null}
                    {item.driving > 0 ? <span className="bar-driving" style={{ height: `${(item.driving / maxHour) * 100}%` }} /> : null}
                    {item.unassigned > 0 ? <span className="bar-unassigned" style={{ height: `${(item.unassigned / maxHour) * 100}%` }} /> : null}
                    {item.canceled > 0 ? <span className="bar-canceled" style={{ height: `${(item.canceled / maxHour) * 100}%` }} /> : null}
                  </div>
                  <small>{String(item.hour).padStart(2, '0')}</small>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="super-panel super-activity-panel">
          <div className="super-panel-heading">
            <div><h2>Aktivitas Sistem</h2><p>Aktivitas terbaru di sistem.</p></div>
          </div>
          <div className="super-activity-list">
            <div><span className="activity-dot blue" /><span>{tasks.length} penugasan terbaru</span><time>{shortTime(now.toISOString())}</time></div>
            <div><span className="activity-dot green" /><span>{completedTasks} tugas selesai dalam periode</span><time>{shortTime(now.toISOString())}</time></div>
            <div><span className="activity-dot orange" /><span>{activeTasks} tugas sedang berjalan</span><time>{shortTime(now.toISOString())}</time></div>
          </div>
        </div>
      </section>

      <section className="super-dashboard-table-grid controller-detail-tables controller-single-detail-table">
        <div className="super-panel super-table-panel">
          <div className="super-panel-heading">
            <div><h2>Penugasan Terbaru</h2><p>Ringkasan penugasan terbaru tanpa membuka detail halaman.</p></div>
          </div>
          <div className="super-table-wrap">
            <table className="controller-detail-table">
              <thead><tr><th>Penugasan</th><th>Rute</th><th>Driver</th><th>Armada</th><th>Jadwal</th><th>Status</th></tr></thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.transaction_id}>
                    <td><strong>{task.transaction_id}</strong><small>{task.task_type}</small></td>
                    <td><strong>{task.start_point ?? '-'} → {task.destination ?? '-'}</strong></td>
                    <td>{task.executor_snapshot?.full_name ?? '-'}</td>
                    <td>{task.fleet_snapshot?.plat_number ?? '-'}</td>
                    <td><strong>{timeLabel(task.std)}</strong><small>STA {timeLabel(task.sta)}</small></td>
                    <td><span className={'status-badge status-' + task.status.toLowerCase().replaceAll(' ', '-')}>{statusLabel(task.status)}</span></td>
                  </tr>
                ))}
                {!tasks.length ? <tr><td colSpan={6} className="super-empty-cell">Belum ada penugasan.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>

      </section>

    </div>
  )
}
