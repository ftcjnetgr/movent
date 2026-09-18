import AppShell from '@/components/app-shell'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'
import { cancelDispatcherTaskAction } from '@/app/dispatcher/beranda/actions'

async function cancelDispatcherTaskFormAction(formData: FormData) {
  'use server'
  await cancelDispatcherTaskAction(formData)
}

export default async function DispatcherAssignmentHistoryPage() {
  const profile = await getCurrentProfile()
  const admin = createAdminClient()
  const { data: tasks } = await admin
    .from('tasks')
    .select('transaction_id, task_type, status, fleet_ownership, created_by, start_point, destination, std, sta, created_at, executor_snapshot, fleet_snapshot, external_executor, external_fleet')
    .order('created_at', { ascending: false })

  const visible = profile.role === 'Dispatcher'
    ? (tasks ?? []).filter((task) => task.created_by === profile.id || task.fleet_ownership === 'Non-TGR')
    : (tasks ?? [])

  return (
    <AppShell>
      <div className="page-heading"><div><span className="eyebrow">Dispatcher</span><h1>Riwayat Penugasan</h1><p>Seluruh tugas yang dibuat oleh Dispatcher ini, termasuk seluruh statusnya.</p></div></div>
      <section className="data-table-card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID Transaksi</th><th>Jenis tugas</th><th>Rute</th><th>Executor</th><th>Armada</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {visible.map((task) => (
                <tr key={task.transaction_id}>
                  <td><strong>{task.transaction_id}</strong></td>
                  <td>{task.task_type}</td>
                  <td>{task.start_point ?? '-'} → {task.destination ?? '-'}</td>
                  <td>{task.executor_snapshot?.full_name ?? task.external_executor ?? '-'}</td>
                  <td>{task.fleet_snapshot?.plat_number ?? task.external_fleet ?? task.fleet_ownership ?? '-'}</td>
                  <td><span className={'status-badge status-' + task.status.toLowerCase().replaceAll(' ', '-')}>{task.status}</span></td>
                  <td>
                    {task.fleet_ownership === 'Non-TGR'
                      ? (profile.role === 'Super User' && task.status !== 'Completed' && task.status !== 'Canceled' ? (
                          <details><summary className="link-button">Batalkan tugas</summary><form action={cancelDispatcherTaskFormAction} className="compact-form" style={{marginTop:12}}><input type="hidden" name="transactionId" value={task.transaction_id} /><input name="note" placeholder="Tulis alasan pembatalan" required /><button type="submit">Ya, batalkan</button></form></details>
                        ) : <span className="muted">-</span>)
                      : (task.status === 'Assigned' && (profile.role === 'Super User' || task.created_by === profile.id) ? (
                          <details><summary className="link-button">Batalkan tugas</summary><form action={cancelDispatcherTaskFormAction} className="compact-form" style={{marginTop:12}}><input type="hidden" name="transactionId" value={task.transaction_id} /><input name="note" placeholder="Tulis alasan pembatalan" required /><button type="submit">Ya, batalkan</button></form></details>
                        ) : <span className="muted">-</span>)}
                  </td>
                </tr>
              ))}
              {!visible.length ? <tr><td colSpan={7}><div className="empty-state">Belum ada penugasan yang bisa dilihat.</div></td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  )
}
