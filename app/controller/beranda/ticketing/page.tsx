import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'
import { getDashboardData } from '@/lib/server/dashboard'

function statusLabel(status: string) {
  return ({
    Requested: 'Diajukan',
    Confirmed: 'Dikonfirmasi',
    'In Progress': 'Sedang dikerjakan',
    Completed: 'Selesai',
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

export default async function ControllerTicketingDashboardPage() {
  const profile = await getCurrentProfile()
  const admin = createAdminClient()
  const [data, ticketResult] = await Promise.all([
    getDashboardData(profile),
    admin
      .from('ticketings')
      .select('transaction_id, status, maintenance_list, fleet_plat_number, fleet_location, created_at')
      .order('created_at', { ascending: false })
      .limit(12),
  ])

  const tickets = ticketResult.data ?? []
  const activeCount =
    (data.ticketCounts.Requested ?? 0) +
    (data.ticketCounts.Confirmed ?? 0) +
    (data.ticketCounts['In Progress'] ?? 0)

  const statusRows = [
    { label: 'Diajukan', value: data.ticketCounts.Requested ?? 0, color: 'blue', note: 'Menunggu diterima' },
    { label: 'Dikonfirmasi', value: data.ticketCounts.Confirmed ?? 0, color: 'green', note: 'Sudah diterima' },
    { label: 'Sedang dikerjakan', value: data.ticketCounts['In Progress'] ?? 0, color: 'cyan', note: 'Sedang diproses' },
    { label: 'Selesai', value: data.ticketCounts.Completed ?? 0, color: 'purple', note: 'Maintenance selesai' },
  ]

  return (
    <div className="super-dashboard">
      <div className="super-dashboard-heading">
        <div>
          <span className="eyebrow">Controller</span>
          <h1>Maintenance</h1>
          <p>Ini ringkasan operasional maintenance hari ini. Biar gampang dipantau, semuanya kami rangkum di sini.</p>
        </div>
      </div>

      <section className="super-kpi-grid">
        <div className="super-kpi-card kpi-blue">
          <div className="super-kpi-icon">⌁</div>
          <span>Diajukan</span>
          <strong>{data.ticketCounts.Requested ?? 0}</strong>
          <small>Menunggu diterima</small>
        </div>
        <div className="super-kpi-card kpi-green">
          <div className="super-kpi-icon">✓</div>
          <span>Dikonfirmasi</span>
          <strong>{data.ticketCounts.Confirmed ?? 0}</strong>
          <small>Sudah diterima</small>
        </div>
        <div className="super-kpi-card kpi-cyan">
          <div className="super-kpi-icon">◷</div>
          <span>Sedang dikerjakan</span>
          <strong>{data.ticketCounts['In Progress'] ?? 0}</strong>
          <small>Sedang diproses</small>
        </div>
        <div className="super-kpi-card kpi-orange">
          <div className="super-kpi-icon">✓</div>
          <span>Selesai</span>
          <strong>{data.ticketCounts.Completed ?? 0}</strong>
          <small>Maintenance selesai</small>
        </div>
        <div className="super-kpi-card kpi-red">
          <div className="super-kpi-icon">●</div>
          <span>Aktif</span>
          <strong>{activeCount}</strong>
          <small>Masih berjalan</small>
        </div>
      </section>

      <section className="super-quick-row">
        <div className="super-panel super-quick-panel">
          <div className="super-quick-grid maintenance-quick-grid">
            <Link href="/dispatcher/maintenance-armada"><span className="quick-blue">+</span><strong>Buat Maintenance</strong></Link>
            <Link href="/controller/penarikan-report"><span className="quick-cyan">▤</span><strong>Penarikan Report</strong></Link>
          </div>
        </div>
      </section>

      <section className="super-dashboard-main-grid maintenance-dashboard-main-grid">
        <div className="super-panel super-activity-panel">
          <div className="super-panel-heading">
            <div><h2>Status Maintenance</h2><p>Ringkasan kondisi maintenance saat ini.</p></div>
          </div>
          <div className="super-activity-list">
            {statusRows.map((item) => (
              <div key={item.label}>
                <span className={'activity-dot ' + item.color} />
                <span>{item.label} · {item.value} data</span>
                <small>{item.note}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="super-panel super-activity-panel">
          <div className="super-panel-heading">
            <div><h2>Aktivitas Sistem</h2><p>Aktivitas terbaru maintenance.</p></div>
          </div>
          <div className="super-activity-list">
            <div><span className="activity-dot blue" /><span>{tickets.length} maintenance terbaru</span><time>{shortTime(new Date().toISOString())}</time></div>
            <div><span className="activity-dot green" /><span>{activeCount} maintenance sedang berjalan</span><time>{shortTime(new Date().toISOString())}</time></div>
            <div><span className="activity-dot orange" /><span>{data.ticketCounts.Completed ?? 0} maintenance selesai</span><time>{shortTime(new Date().toISOString())}</time></div>
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
