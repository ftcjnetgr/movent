import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'
import { getDashboardData } from '@/lib/server/dashboard'

function statusLabel(status: string) {
  return ({
    Requested: 'Diajukan',
    Confirmed: 'Dikonfirmasi',
    Assigned: 'Ditugaskan',
    Driving: 'Berangkat',
    Completed: 'Selesai',
    Canceled: 'Dibatalkan',
  } as Record<string, string>)[status] ?? status
}

function taskTypeLabel(type: string) {
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

function shortTime(value: string | null) {
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

  const now = new Date()
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  const todayStart = new Date(`${today}T00:00:00+07:00`).toISOString()
  const todayEnd = new Date(new Date(`${today}T00:00:00+07:00`).getTime() + 86400000).toISOString()
  const todayDay = ((new Date(`${today}T12:00:00+07:00`).getUTCDay() + 6) % 7) + 1

  const [data, tasksResult, ticketsResult, scheduleResult, activityResult, totalTaskResult, usedScheduleResult] = await Promise.all([
    getDashboardData(profile),
    admin
      .from('tasks')
      .select('transaction_id, task_type, status, start_point, destination, std, sta, executor_snapshot, fleet_snapshot, schedule_id, created_at')
      .order('created_at', { ascending: false })
      .limit(8),
    admin
      .from('ticketings')
      .select('transaction_id, status, maintenance_list, fleet_plat_number, location, created_at')
      .order('created_at', { ascending: false })
      .limit(6),
    admin
      .from('schedules')
      .select('schedule_id, std')
      .eq('status', 'Active')
      .eq('schedule_day', todayDay)
      .order('std'),
    admin
      .from('tasks')
      .select('status, std')
      .gte('std', todayStart)
      .lt('std', todayEnd),
    admin.from('tasks').select('*', { count: 'exact', head: true }),
    admin.from('tasks').select('schedule_id').not('schedule_id', 'is', null),
  ])

  const tasks = tasksResult.data ?? []
  const tickets = ticketsResult.data ?? []
  const schedules = scheduleResult.data ?? []
  const activities = activityResult.data ?? []
  const usedScheduleIds = new Set((usedScheduleResult.data ?? []).map((task) => task.schedule_id).filter((value): value is string => Boolean(value)))

  const activeTasks =
    (data.taskCounts.Assigned ?? 0) +
    (data.taskCounts.Confirmed ?? 0) +
    (data.taskCounts.Driving ?? 0)

  const completedTasks = activities.filter((task) => task.status === 'Completed').length
  const unassignedSchedules = Math.max(0, schedules.length - usedScheduleIds.size)

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
          <p>Ini ringkasan operasional hari ini. Biar gampang dipantau, semuanya kami rangkum di sini.</p>
        </div>
      </div>

      <section className="super-kpi-grid">
        <div className="super-kpi-card kpi-blue">
          <div className="super-kpi-icon">▤</div>
          <span>Total Tugas</span>
          <strong>{totalTaskResult.count ?? 0}</strong>
          <small>Semua data</small>
        </div>
        <div className="super-kpi-card kpi-green">
          <div className="super-kpi-icon">▰</div>
          <span>Sedang Berjalan</span>
          <strong>{activeTasks}</strong>
          <small>Sedang diproses</small>
        </div>
        <div className="super-kpi-card kpi-cyan">
          <div className="super-kpi-icon">✓</div>
          <span>Selesai</span>
          <strong>{completedTasks}</strong>
          <small>Hari ini</small>
        </div>
        <div className="super-kpi-card kpi-orange">
          <div className="super-kpi-icon">◷</div>
          <span>Belum Ditugaskan</span>
          <strong>{unassignedSchedules}</strong>
          <small>Schedule hari ini</small>
        </div>
      </section>

      <section className="super-quick-row">
        <div className="super-panel super-quick-panel">
          <div className="super-quick-grid">
            <Link href="/dispatcher/beranda"><span className="quick-blue">+</span><strong>Buat Tugas</strong></Link>
            <Link href="/dispatcher/maintenance-armada"><span className="quick-green">⌁</span><strong>Buat Tiket</strong></Link>
            <Link href="/controller/timetable?view=plan"><span className="quick-purple">▦</span><strong>Lihat Jadwal</strong></Link>
            <Link href="/controller/beranda/ticketing"><span className="quick-navy">⌁</span><strong>Tiket Maintenance</strong></Link>
            <Link href="/controller/penarikan-report"><span className="quick-cyan">▤</span><strong>Penarikan Report</strong></Link>
          </div>
        </div>
      </section>

      <section className="super-dashboard-main-grid">
        <div className="super-panel super-chart-panel">
          <div className="super-panel-heading">
            <div>
              <h2>Aktivitas Tugas Hari Ini</h2>
              <p>Lihat ritme keberangkatan berdasarkan jam STD.</p>
            </div>
            <div className="super-chart-legend">
              <span><i className="legend-blue" /> Selesai</span>
              <span><i className="legend-green" /> Berjalan</span>
              <span><i className="legend-orange" /> Belum</span>
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
            <div><span className="activity-dot blue" /><span>{tickets.length} tiket maintenance terbaru</span><time>{shortTime(now.toISOString())}</time></div>
            <div><span className="activity-dot green" /><span>{schedules.length} schedule aktif hari ini</span><time>{shortTime(now.toISOString())}</time></div>
            <div><span className="activity-dot orange" /><span>{activeTasks} tugas sedang berjalan</span><time>{shortTime(now.toISOString())}</time></div>
          </div>
        </div>
      </section>

      <section className="super-dashboard-table-grid controller-detail-tables">
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

        <div className="super-panel super-table-panel">
          <div className="super-panel-heading">
            <div><h2>Tiket Maintenance Terbaru</h2><p>Ringkasan ticket terbaru beserta lokasi dan armada.</p></div>
          </div>
          <div className="super-table-wrap">
            <table className="controller-detail-table">
              <thead><tr><th>Ticket</th><th>Lokasi</th><th>Armada</th><th>Maintenance</th><th>Status</th><th>Waktu</th></tr></thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.transaction_id}>
                    <td><strong>{ticket.transaction_id}</strong></td>
                    <td>{ticket.location ?? '-'}</td>
                    <td>{ticket.fleet_plat_number ?? '-'}</td>
                    <td>{ticket.maintenance_list ?? '-'}</td>
                    <td><span className={'status-badge status-' + ticket.status.toLowerCase().replaceAll(' ', '-')}>{statusLabel(ticket.status)}</span></td>
                    <td><strong>{shortTime(ticket.created_at)}</strong></td>
                  </tr>
                ))}
                {!tickets.length ? <tr><td colSpan={6} className="super-empty-cell">Belum ada ticketing.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>

    </div>
  )
}
