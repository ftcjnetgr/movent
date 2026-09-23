import { SuperUserTaskEditor, SuperUserTicketEditor } from '@/components/super-user-transaction-editor'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'
function statusLabel(status: string) {
  const labels: Record<string, string> = {
    Requested: 'Diajukan',
    Assigned: 'Ditugaskan',
    Confirmed: 'Dikonfirmasi',
    Driving: 'Berangkat',
    Completed: 'Selesai',
    Canceled: 'Dibatalkan',
  }
  return labels[status] ?? status
}
function ticketStatusLabel(status: string) {
  const labels: Record<string, string> = {
    Requested: 'Diajukan',
    Confirmed: 'Dikonfirmasi',
    'In Progress': 'Sedang dikerjakan',
    Completed: 'Selesai',
    Canceled: 'Dibatalkan',
  }
  return labels[status] ?? status
}


function masterOptions(items: Array<{ value: string; label: string }>) {
  return items.map((item) => ({ ...item, searchText: item.label }))
}

export default async function SuperUserTransactionManagementPage() {
  const profile = await getCurrentProfile()
  if (profile.role !== 'Super User') return null

  const admin = createAdminClient()
  const [
    { data: tasks },
    { data: sjItems },
    { data: ticketings },
    { data: locations },
    { data: executors },
    { data: fleets },
    { data: products },
    { data: schedules },
    { data: maintenanceLists },
  ] = await Promise.all([
    admin.from('tasks').select('transaction_id, id, status, task_type, source_type, fleet_ownership, schedule_id, start_point, destination, std, sta, executor_nik, external_executor, external_fleet, fleet_snapshot, sj_number, sj_qty, sj_weight, product, sj_note, odometer_start, odometer_end').order('created_at', { ascending: false }),
    admin.from('task_sj_items').select('id, task_id, sj_number, sj_qty, sj_weight, product, note').order('created_at'),
    admin.from('ticketings').select('transaction_id, status, maintenance_list, location, fleet_plat_number').order('created_at', { ascending: false }),
    admin.from('locations').select('location').eq('status', 'Active').order('location'),
    admin.from('executors').select('executor_nik, full_name').eq('status', 'Active').order('full_name'),
    admin.from('fleets').select('plat_number, fleet_type').eq('status', 'Active').order('plat_number'),
    admin.from('products').select('product').eq('status', 'Active').order('product'),
    admin.from('schedules').select('schedule_id, route, category, start_point, destination, std, sta, trip').eq('status', 'Active').order('schedule_id'),
    admin.from('maintenance_lists').select('maintenance_list').eq('status', 'Active').order('maintenance_list'),
  ])

  const locationOptions = masterOptions((locations ?? []).map((item) => ({ value: item.location, label: item.location })))
  const executorOptions = (executors ?? []).map((item) => ({ value: item.executor_nik, label: item.executor_nik + ' - ' + item.full_name, searchText: item.executor_nik + ' ' + item.full_name }))
  const fleetOptions = (fleets ?? []).map((item) => ({ value: item.plat_number, label: item.plat_number + ' - ' + item.fleet_type, searchText: item.plat_number + ' ' + item.fleet_type }))
  const productOptions = masterOptions((products ?? []).map((item) => ({ value: item.product, label: item.product })))
  const scheduleOptions = (schedules ?? []).map((item) => ({ value: item.schedule_id, label: item.schedule_id + ' • Trip ' + item.trip + ' • ' + item.start_point + ' → ' + item.destination, searchText: [item.schedule_id, item.route, item.category, item.start_point, item.destination, String(item.trip), item.std, item.sta].join(' ') }))
  const maintenanceOptions = masterOptions((maintenanceLists ?? []).map((item) => ({ value: item.maintenance_list, label: item.maintenance_list })))

  return (
    <>
    <div className="page-heading">
        <div>
          <h1>Kelola Transaksi</h1>
          <p>Edit transaksi yang masih bisa diubah. Transaksi yang sudah selesai tetap terkunci.</p>
        </div>
      </div>

      <section className="data-table-card section-block">
        <div className="section-heading"><div><h2>Tugas</h2><p>Semua transaksi tugas dari berbagai alur.</p></div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID Transaksi</th><th>Jenis</th><th>Rute</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {(tasks ?? []).map((task) => (
                <tr key={task.transaction_id}>
                  <td><strong>{task.transaction_id}</strong></td>
                  <td>{task.task_type}</td>
                  <td>{task.start_point ?? '-'} → {task.destination ?? '-'}</td>
                  <td><span className={'status-badge status-' + task.status.toLowerCase().replaceAll(' ', '-')}>{statusLabel(task.status)}</span></td>
                  <td><SuperUserTaskEditor task={task} locations={locationOptions} executors={executorOptions} fleets={fleetOptions} schedules={scheduleOptions} products={productOptions} sjItems={(sjItems ?? []).filter((item) => item.task_id === task.id)} /></td>
                </tr>
              ))}
              {!(tasks ?? []).length ? <tr><td colSpan={5}><div className="empty-state">Belum ada transaksi tugas untuk sekarang.</div></td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="data-table-card section-block">
        <div className="section-heading"><div><h2>Tiket Maintenance</h2><p>Semua tiket maintenance dari Dispatcher.</p></div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Transaction ID</th><th>Maintenance</th><th>Lokasi</th><th>Armada</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {(ticketings ?? []).map((ticket) => (
                <tr key={ticket.transaction_id}>
                  <td><strong>{ticket.transaction_id}</strong></td>
                  <td>{ticket.maintenance_list ?? '-'}</td>
                  <td>{ticket.location ?? '-'}</td>
                  <td>{ticket.fleet_plat_number ?? '-'}</td>
                  <td><span className={'status-badge status-' + ticket.status.toLowerCase().replaceAll(' ', '-')}>{ticketStatusLabel(ticket.status)}</span></td>
                  <td><SuperUserTicketEditor ticket={ticket} maintenanceLists={maintenanceOptions} locations={locationOptions} fleets={fleetOptions} /></td>
                </tr>
              ))}
              {!(ticketings ?? []).length ? <tr><td colSpan={6}><div className="empty-state">Belum ada transaksi ticketing untuk sekarang.</div></td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
