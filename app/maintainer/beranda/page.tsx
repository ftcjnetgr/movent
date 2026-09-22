import { createAdminClient } from '@/lib/supabase/admin'
import { getDashboardData } from '@/lib/server/dashboard'
import { getCurrentProfile } from '@/lib/server/profile'

function label(status: string) {
  return ({ Requested:'Diajukan', Confirmed:'Dikonfirmasi', 'In Progress':'Sedang dikerjakan', Completed:'Selesai', Canceled:'Dibatalkan' } as Record<string,string>)[status] ?? status
}

export default async function MaintainerBerandaPage() {
  const profile = await getCurrentProfile()
  const admin = createAdminClient()
  const [data, ticketResult] = await Promise.all([
    getDashboardData(profile),
    admin.from('ticketings').select('transaction_id, status, maintenance_list, location, fleet_plat_number, created_at').not('status','in','(Completed,Canceled)').order('created_at',{ascending:true}).limit(8),
  ])
  const tickets = ticketResult.data ?? []

  return (
    <div className="role-page">
      <div className="page-heading">
        <div><h1>Halo, Maintainer!</h1><p>Kelola ticketing maintenance armada dan selesaikan sesuai urutan.</p></div>
        
      </div>

      <section className="metric-grid">
        <div className="metric-card"><span>Tiket Masuk</span><strong>{data.ticketCounts.Requested ?? 0}</strong></div>
        <div className="metric-card"><span>In Progress</span><strong>{data.ticketCounts['In Progress'] ?? 0}</strong></div>
        <div className="metric-card"><span>Selesai</span><strong>{data.ticketCounts.Completed ?? 0}</strong></div>
        <div className="metric-card"><span>Total Aktif</span><strong>{tickets.length}</strong></div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><h2>Tiket Maintenance</h2><p>Tiket yang perlu kamu tindak sekarang.</p></div></div>
        <div className="ticket-grid">
          {tickets.map(ticket => (
            <article className="ticket-row-card" key={ticket.transaction_id}>
              <div className="ticket-row-icon">✣</div>
              <div className="ticket-row-main"><strong>{ticket.transaction_id}</strong><span>{ticket.maintenance_list ?? '-'}</span></div>
              <div className="ticket-row-meta"><strong>{ticket.fleet_plat_number ?? '-'}</strong><span>Lokasi: {ticket.location ?? '-'}</span><small>{ticket.created_at ? new Date(ticket.created_at).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Jakarta'}) : '-'}</small></div>
              <span className={'status-badge status-'+ticket.status.toLowerCase().replaceAll(' ','-')}>{label(ticket.status)}</span>
              
            </article>
          ))}
          {!tickets.length ? <div className="data-table-card"><div className="empty-state">Belum ada ticketing aktif.</div></div> : null}
        </div>
      </section>
    </div>
  )
}
