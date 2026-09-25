import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'
import { getDashboardData } from '@/lib/server/dashboard'

function statusLabel(status: string) {
  return ({
    Requested: 'Udah Diajukan',
    Confirmed: 'Udah Diterima',
    'In Progress': 'Lagi Dikerjain',
    Completed: 'Udah Selesai',
    Canceled: 'Dibatalkan',
  } as Record<string, string>)[status] ?? status
}

function statusClass(status: string) {
  return 'status-' + status.toLowerCase().replaceAll(' ', '-')
}

function shortTime(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  })
}

export default async function ControllerTicketingDashboardPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const profile = await getCurrentProfile()
  const admin = createAdminClient()
  const now = new Date()
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  const params = await searchParams
  const requestedFrom = params.from ?? today
  const requestedTo = params.to ?? requestedFrom
  const from = /^\d{4}-\d{2}-\d{2}$/.test(requestedFrom) ? requestedFrom : today
  const to = /^\d{4}-\d{2}-\d{2}$/.test(requestedTo) && requestedTo >= from ? requestedTo : from
  const rangeStart = new Date(`${from}T00:00:00+07:00`).toISOString()
  const rangeEnd = new Date(new Date(`${to}T00:00:00+07:00`).getTime() + 86400000).toISOString()

  const [data, ticketResult] = await Promise.all([
    getDashboardData(profile, from, to),
    admin
      .from('ticketings')
      .select('transaction_id, status, maintenance_list, fleet_plat_number, fleet_location, created_at')
      .order('created_at', { ascending: false })
      .gte('created_at', rangeStart)
      .lt('created_at', rangeEnd)
      .limit(12),
  ])

  const tickets = ticketResult.data ?? []
  const activeCount =
    (data.ticketCounts.Requested ?? 0) +
    (data.ticketCounts.Confirmed ?? 0) +
    (data.ticketCounts['In Progress'] ?? 0)

  const { data: todayTickets } = await admin
    .from('ticketings')
    .select('status, created_at')
    .gte('created_at', rangeStart)
    .lt('created_at', rangeEnd)

  const todayActivities = todayTickets ?? []
  const byHour = Array.from({ length: 24 }, (_, hour) => {
    const rows = todayActivities.filter((ticket) =>
      new Date(ticket.created_at).toLocaleString('en-US', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        hour12: false,
      }).slice(0, 2) === String(hour).padStart(2, '0')
    )
    return {
      hour,
      requested: rows.filter((ticket) => ticket.status === 'Requested').length,
      confirmed: rows.filter((ticket) => ticket.status === 'Confirmed').length,
      inProgress: rows.filter((ticket) => ticket.status === 'In Progress').length,
      completed: rows.filter((ticket) => ticket.status === 'Completed').length,
      canceled: rows.filter((ticket) => ticket.status === 'Canceled').length,
    }
  })
  const maxHour = Math.max(1, ...byHour.map((item) =>
    item.requested + item.confirmed + item.inProgress + item.completed + item.canceled
  ))

  return (
    <div className="super-dashboard">
      <div className="super-dashboard-heading dashboard-page-heading">
        <div>
          <h1>Dashboard</h1>
          <p>Ini ringkasan operasional sesuai periode yang dipilih. Biar gampang dipantau, semuanya kami rangkum di sini.</p>
        </div>
        <nav className="dashboard-view-tabs" aria-label="Dashboard">
          <Link href={`/controller/beranda?from=${from}&to=${to}`}>Penugasan</Link>
          <Link href={`/controller/beranda/ticketing?from=${from}&to=${to}`} className="active">Maintenance</Link>
        </nav>
      </div>

      <section className="super-kpi-grid maintenance-kpi-grid">
        <div className="super-kpi-card kpi-blue">
          <div className="super-kpi-icon">⌁</div>
          <div className="super-kpi-content"><span>Udah Diajukan</span>
          <strong>{data.ticketCounts.Requested ?? 0}</strong>
          <small>Nunggu diterima</small></div>
        </div>
        <div className="super-kpi-card kpi-cyan">
          <div className="super-kpi-icon">✓</div>
          <div className="super-kpi-content"><span>Udah Diterima</span>
          <strong>{data.ticketCounts.Confirmed ?? 0}</strong>
          <small>Udah diterima</small></div>
        </div>
        <div className="super-kpi-card kpi-orange">
          <div className="super-kpi-icon">◷</div>
          <div className="super-kpi-content"><span>Lagi Dikerjain</span>
          <strong>{data.ticketCounts['In Progress'] ?? 0}</strong>
          <small>Lagi diproses</small></div>
        </div>
        <div className="super-kpi-card kpi-purple">
          <div className="super-kpi-icon">✓</div>
          <div className="super-kpi-content"><span>Udah Selesai</span>
          <strong>{data.ticketCounts.Completed ?? 0}</strong>
          <small>Udah beres</small></div>
        </div>
        <div className="super-kpi-card kpi-red">
          <div className="super-kpi-icon">●</div>
          <div className="super-kpi-content"><span>Masih Aktif</span>
          <strong>{activeCount}</strong>
          <small>Masih jalan</small></div>
        </div>
      </section>


      <section className="super-dashboard-main-grid maintenance-dashboard-main-grid">
        <div className="super-panel super-chart-panel">
          <div className="super-panel-heading">
            <div>
              <h2>Aktivitas Maintenance</h2>
              <p>Maintenance yang dibuat berdasarkan periode yang dipilih.</p>
            </div>
            <div className="super-chart-legend">
              <span><i className="legend-blue" /> Diajukan</span>
              <span><i className="legend-cyan" /> Udah Diterima</span>
              <span><i className="legend-orange" /> Lagi Dikerjain</span>
              <span><i className="legend-purple" /> Selesai</span>
              <span><i className="legend-red" /> Dibatalkan</span>
            </div>
          </div>
          <div className="super-chart">
            <div className="super-chart-y"><span>{maxHour}</span><span>{Math.ceil(maxHour / 2)}</span><span>0</span></div>
            <div className="super-chart-bars">
              {byHour.map((item) => (
                <div className="super-chart-column" key={item.hour}>
                  <div className="super-chart-stack">
                    {item.requested > 0 ? <span className="bar-completed" style={{ height: `${(item.requested / maxHour) * 100}%` }} /> : null}
                    {item.confirmed > 0 ? <span className="bar-driving" style={{ height: `${(item.confirmed / maxHour) * 100}%` }} /> : null}
                    {item.inProgress > 0 ? <span className="bar-unassigned" style={{ height: `${(item.inProgress / maxHour) * 100}%` }} /> : null}
                    {item.completed > 0 ? <span className="bar-maintenance-completed" style={{ height: `${(item.completed / maxHour) * 100}%` }} /> : null}
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
            <div><h2>Aktivitas Sistem</h2><p>Aktivitas terbaru maintenance.</p></div>
          </div>
          <div className="super-activity-list">
            <div><span className="activity-dot blue" /><span>{tickets.length} maintenance terbaru</span><time>{shortTime(new Date().toISOString())}</time></div>
            <div><span className="activity-dot orange" /><span>{activeCount} maintenance sedang berjalan</span><time>{shortTime(new Date().toISOString())}</time></div>
            <div><span className="activity-dot purple" /><span>{data.ticketCounts.Completed ?? 0} maintenance selesai</span><time>{shortTime(new Date().toISOString())}</time></div>
          </div>
        </div>
      </section>

      <section className="super-dashboard-table-grid controller-detail-tables controller-single-detail-table">
        <div className="super-panel super-table-panel">
          <div className="super-panel-heading">
            <div><h2>Maintenance Terbaru</h2><p>Ringkasan maintenance terbaru tanpa membuka detail halaman.</p></div>
          </div>
          <div className="super-table-wrap">
            <table className="controller-detail-table">
              <thead><tr><th>ID</th><th>Maintenance</th><th>Armada</th><th>Lokasi</th><th>Status</th><th>Waktu</th></tr></thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.transaction_id}>
                    <td><strong>{ticket.transaction_id}</strong></td>
                    <td>{ticket.maintenance_list ?? '-'}</td>
                    <td>{ticket.fleet_plat_number ?? '-'}</td>
                    <td>{ticket.fleet_location ?? '-'}</td>
                    <td><span className={'status-badge ' + statusClass(ticket.status)}>{statusLabel(ticket.status)}</span></td>
                    <td><strong>{shortTime(ticket.created_at)}</strong></td>
                  </tr>
                ))}
                {!tickets.length ? <tr><td colSpan={6} className="super-empty-cell">Belum ada maintenance.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
