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

function dateLabel(date: Date) {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(date)
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

  const [data, tasksResult, ticketsResult, fleetResult, scheduleResult, activityResult] = await Promise.all([
    getDashboardData(profile),
    admin
      .from('tasks')
      .select('transaction_id, task_type, status, start_point, destination, std, sta, executor_snapshot, fleet_snapshot, created_at')
      .order('created_at', { ascending: false })
      .limit(8),
    admin
      .from('ticketings')
      .select('transaction_id, status, maintenance_list, fleet_plat_number, location, created_at')
      .order('created_at', { ascending: false })
      .limit(6),
    admin
      .from('fleets')
      .select('status', { count: 'exact', head: false }),
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
  ])

  const tasks = tasksResult.data ?? []
  const tickets = ticketsResult.data ?? []
  const fleetRows = fleetResult.data ?? []
  const schedules = scheduleResult.data ?? []
  const activities = activityResult.data ?? []

  const fleetStatus = fleetRows.reduce<Record<string, number>>((acc, row) => {
    const key = row.status ?? 'Unknown'
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  const usedScheduleIds = new Set(
    tasksResult.data
      ?.map((task) => task.transaction_id ? null : null)
      .filter(Boolean) ?? [],
  )

  const activeTasks =
    (data.taskCounts.Assigned ?? 0) +
    (data.taskCounts.Confirmed ?? 0) +
    (data.taskCounts.Driving ?? 0)

  const completedTasks = data.taskCounts.Completed ?? 0
  const alertCount = data.taskAlerts.length + data.ticketAlertCount
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
  const fleetTotal = fleetRows.length

  return (
    <div className="super-dashboard">
      <div className="super-dashboard-heading">
        <div>
          <span className="eyebrow">Controller</span>
          <h1>Selamat datang, {profile.full_name}! <span aria-hidden="true">👋</span></h1>
          <p>Berikut ringkasan operasional hari ini. Tetap pantau dan pastikan semuanya berjalan lancar.</p>
        </div>
        <div className="super-dashboard-date">
          <span>Kalender</span>
          <strong>{dateLabel(now)}</strong>
          <small>{now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB</small>
        </div>
      </div>

      <section className="super-kpi-grid">
        <div className="super-kpi-card kpi-blue">
          <div className="super-kpi-icon">▤</div>
          <span>Total Tugas</span>
          <strong>{tasks.length}</strong>
          <small>Data terbaru</small>
        </div>
        <div className="super-kpi-card kpi-green">
          <div className="super-kpi-icon">▰</div>
          <span>Sedang Berjalan</span>
          <strong>{activeTasks}</strong>
          <small>Assigned sampai Driving</small>
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
        <Link href="/controller/alert" className="super-kpi-card kpi-red super-kpi-link">
          <div className="super-kpi-icon">!</div>
          <span>Alert</span>
          <strong>{alertCount}</strong>
          <small>Lihat semua alert</small>
        </Link>
      </section>

      <section className="super-dashboard-main-grid">
        <div className="super-panel super-chart-panel">
          <div className="super-panel-heading">
            <div>
              <h2>Aktivitas Tugas Hari Ini</h2>
              <p>Distribusi tugas berdasarkan jam STD.</p>
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

        <div className="super-panel super-fleet-panel">
          <div className="super-panel-heading">
            <div>
              <h2>Status Armada</h2>
              <p>Total armada terdaftar.</p>
            </div>
          </div>
          <div className="super-fleet-body">
            <div className="super-donut" style={{ background: fleetTotal ? `conic-gradient(#1fc37c 0deg 360deg)` : '#edf1f5' }}>
              <div><strong>{fleetTotal}</strong><span>Total Armada</span></div>
            </div>
            <div className="super-fleet-list">
              {Object.entries(fleetStatus).length ? Object.entries(fleetStatus).map(([status, count]) => (
                <div key={status}><span><i className="fleet-dot" /> {status}</span><strong>{count}</strong></div>
              )) : <div className="muted">Belum ada data armada.</div>}
            </div>
          </div>
          <Link href="/super-user/pengelolaan-database?db=fleets" className="super-panel-link">Lihat detail →</Link>
        </div>

        <div className="super-panel super-info-panel">
          <div className="super-panel-heading">
            <div><h2>Informasi Cepat</h2><p>Hal yang perlu diperhatikan.</p></div>
          </div>
          <div className="super-info-list">
            <Link href="/controller/alert" className="super-info-item">
              <span className="super-info-icon danger">!</span>
              <div><strong>{data.taskAlerts.length} alert tugas</strong><small>Perlu diperhatikan</small></div>
              <b>›</b>
            </Link>
            <Link href="/controller/alert?type=ticketing" className="super-info-item">
              <span className="super-info-icon blue">▣</span>
              <div><strong>{data.ticketAlertCount} ticket maintenance</strong><small>Dalam batas alert</small></div>
              <b>›</b>
            </Link>
            <Link href="/super-user/pengelolaan-database?db=fleets" className="super-info-item">
              <span className="super-info-icon green">✓</span>
              <div><strong>{fleetTotal} armada tersedia</strong><small>Master armada</small></div>
              <b>›</b>
            </Link>
          </div>
        </div>
      </section>

      <section className="super-dashboard-table-grid">
        <div className="super-panel super-table-panel">
          <div className="super-panel-heading">
            <div><h2>Penugasan Terbaru</h2><p>Aktivitas tugas terbaru.</p></div>
            <Link href="/dispatcher/riwayat-penugasan">Lihat Semua →</Link>
          </div>
          <div className="super-table-wrap">
            <table>
              <thead><tr><th>ID Tugas</th><th>Rute</th><th>Executor</th><th>Armada</th><th>Status</th><th>Waktu</th></tr></thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.transaction_id}>
                    <td><strong>{task.transaction_id}</strong></td>
                    <td>{task.start_point ?? '-'} <b>→</b> {task.destination ?? '-'}</td>
                    <td>{task.executor_snapshot?.full_name ?? '-'}</td>
                    <td>{task.fleet_snapshot?.plat_number ?? '-'}</td>
                    <td><span className={'status-badge status-' + task.status.toLowerCase().replaceAll(' ', '-')}>{statusLabel(task.status)}</span></td>
                    <td>{timeLabel(task.std)}</td>
                  </tr>
                ))}
                {!tasks.length ? <tr><td colSpan={6} className="super-empty-cell">Belum ada penugasan.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="super-panel super-table-panel">
          <div className="super-panel-heading">
            <div><h2>Ticketing Maintenance Terbaru</h2><p>Ticket yang baru masuk.</p></div>
            <Link href="/controller/beranda/ticketing">Lihat Semua →</Link>
          </div>
          <div className="super-table-wrap">
            <table>
              <thead><tr><th>ID Ticket</th><th>Armada</th><th>Maintenance</th><th>Status</th><th>Waktu</th></tr></thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.transaction_id}>
                    <td><strong>{ticket.transaction_id}</strong></td>
                    <td>{ticket.fleet_plat_number ?? '-'}</td>
                    <td>{ticket.maintenance_list ?? '-'}</td>
                    <td><span className={'status-badge status-' + ticket.status.toLowerCase().replaceAll(' ', '-')}>{statusLabel(ticket.status)}</span></td>
                    <td>{shortTime(ticket.created_at)}</td>
                  </tr>
                ))}
                {!tickets.length ? <tr><td colSpan={5} className="super-empty-cell">Belum ada ticketing.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="super-dashboard-bottom-grid">
        <div className="super-panel super-quick-panel">
          <div className="super-panel-heading"><div><h2>Akses Cepat</h2><p>Aksi yang paling sering dipakai.</p></div></div>
          <div className="super-quick-grid">
            <Link href="/dispatcher/beranda"><span className="quick-blue">+</span><strong>Buat Tugas</strong></Link>
            <Link href="/dispatcher/maintenance-armada"><span className="quick-green">⌁</span><strong>Buat Tiket</strong></Link>
            <Link href="/controller/timetable?view=plan"><span className="quick-purple">▦</span><strong>Lihat Schedule</strong></Link>
            <Link href="/super-user/pengelolaan-database"><span className="quick-orange">↥</span><strong>Import Data</strong></Link>
            <Link href="/super-user/pengelolaan-pengguna"><span className="quick-navy">♙</span><strong>Manajemen User</strong></Link>
            <Link href="/controller/penarikan-report"><span className="quick-cyan">▤</span><strong>Penarikan Report</strong></Link>
          </div>
        </div>

        <div className="super-panel super-activity-panel">
          <div className="super-panel-heading"><div><h2>Aktivitas Sistem</h2><p>Aktivitas terbaru di sistem.</p></div></div>
          <div className="super-activity-list">
            <div><span className="activity-dot blue" /> <span>{data.taskAlerts.length} alert tugas aktif</span><time>{shortTime(now.toISOString())}</time></div>
            <div><span className="activity-dot green" /> <span>{schedules.length} schedule aktif hari ini</span><time>{shortTime(now.toISOString())}</time></div>
            <div><span className="activity-dot orange" /> <span>{activeTasks} tugas sedang berjalan</span><time>{shortTime(now.toISOString())}</time></div>
            <div><span className="activity-dot purple" /> <span>{fleetTotal} armada terdaftar</span><time>{shortTime(now.toISOString())}</time></div>
          </div>
        </div>
      </section>
    </div>
  )
}
