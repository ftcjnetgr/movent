import MaintainerTicketCard from '@/components/maintainer-ticket-card'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'

export default async function MaintainerTicketMaintenancePage() {
  const profile = await getCurrentProfile()
  const admin = createAdminClient()
  const { data: tickets } = await admin
    .from('ticketings')
    .select('transaction_id, status, maintenance_list, location, fleet_plat_number, created_at, accepted_at, in_progress_at, maintainer_user_id')
    .not('status', 'eq', 'Completed')
    .not('status', 'eq', 'Canceled')
    .order('created_at', { ascending: true })

  const visible = profile.role === 'Maintainer'
    ? (tickets ?? []).filter((ticket) => ticket.status === 'Requested' || ticket.maintainer_user_id === profile.id)
    : (tickets ?? [])

  return (
    <>
    <div className="page-heading">
        <div>
          <h1>Maintenance</h1>
          <p>Terima lalu kerjakan maintenance armada.</p>
        </div>
      </div>

      <section className="task-list">
        {visible.map((ticket) => <MaintainerTicketCard key={ticket.transaction_id} ticket={ticket} />)}
        {visible.length === 0 ? <div className="metric-card"><span>Belum ada maintenance aktif</span><strong>0</strong><p>Maintenance baru bakal muncul di sini setelah Dispatcher membuatnya.</p></div> : null}
      </section>
    </>
  )
}
