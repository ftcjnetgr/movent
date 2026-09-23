import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'
import { getDashboardData } from '@/lib/server/dashboard'

function statusLabel(status: string) {
  return ({ Requested: 'Diajukan', Confirmed: 'Dikonfirmasi', 'In Progress': 'Sedang dikerjakan', Completed: 'Selesai', Canceled: 'Dibatalkan' } as Record<string, string>)[status] ?? status
}

function statusClass(status: string) {
  return 'status-' + status.toLowerCase().replaceAll(' ', '-')
}

export default async function ControllerTicketingDashboardPage() {
  const profile = await getCurrentProfile()
  const admin = createAdminClient()
  const [data, ticketResult] = await Promise.all([
    getDashboardData(profile),
    admin.from('ticketings').select('transaction_id, status, maintenance_list, fleet_plat_number, fleet_location, created_at').order('created_at', { ascending: false }).limit(12),
  ])

  const tickets = ticketResult.data ?? []
  const activeCount = (data.ticketCounts.Requested ?? 0) + (data.ticketCounts.Confirmed ?? 0) + (data.ticketCounts['In Progress'] ?? 0)

  return (
    <div className="role-page dashboard-page dashboard-ticketing-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Controller</span>
          <h1>Maintenance</h1>
          <p>Pantau proses maintenance dari ticket dibuat sampai selesai.</p>
        </div>
      </div>

      <section className="metric-grid controller-kpi-grid dashboard-kpi-row">
        <div className="metric-card"><span>Diajukan</span><strong>{data.ticketCounts.Requested ?? 0}</strong><small>Menunggu diterima</small></div>
        <div className="metric-card"><span>Dikonfirmasi</span><strong>{data.ticketCounts.Confirmed ?? 0}</strong><small>Sudah diterima</small></div>
        <div className="metric-card"><span>Sedang dikerjakan</span><strong>{data.ticketCounts['In Progress'] ?? 0}</strong><small>Sedang dikerjakan</small></div>
        <div className="metric-card metric-completed"><span>Selesai</span><strong>{data.ticketCounts.Completed ?? 0}</strong><small>Maintenance selesai</small></div>
        <div className="metric-card metric-ticket"><span>Aktif</span><strong>{activeCount}</strong><small>Masih berjalan</small></div>
      </section>

      <section className="section-block dashboard-table-section">
        <div className="section-heading">
          <div><h2>Maintenance Terbaru</h2><p>Ticket terbaru yang masuk dan sedang diproses.</p></div>
          <span className="section-count">{tickets.length} data</span>
        </div>
        <div className="data-table-card dashboard-table-card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Maintenance</th><th>Armada</th><th>Lokasi</th><th>Status</th><th>Dibuat</th></tr></thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.transaction_id}>
                    <td><strong>{ticket.transaction_id}</strong></td>
                    <td>{ticket.maintenance_list ?? '-'}</td>
                    <td>{ticket.fleet_plat_number ?? '-'}</td>
                    <td>{ticket.fleet_location ?? '-'}</td>
                    <td><span className={'status-badge ' + statusClass(ticket.status)}>{statusLabel(ticket.status)}</span></td>
                    <td>{new Date(ticket.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', timeZone: 'Asia/Jakarta' })}</td>
                  </tr>
                ))}
                {!tickets.length ? (
                  <tr><td colSpan={6}><div className="dashboard-empty-state"><strong>Belum ada maintenance.</strong><span>Kalau ada ticket baru, nanti muncul di sini.</span></div></td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
