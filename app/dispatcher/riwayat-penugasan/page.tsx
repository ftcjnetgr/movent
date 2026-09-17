import AppShell from '@/components/app-shell'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'

export default async function DispatcherAssignmentHistoryPage() {
  const profile = await getCurrentProfile()
  const admin = createAdminClient()
  const { data: tasks } = await admin
    .from('tasks')
    .select('transaction_id, task_type, status, fleet_ownership, start_point, destination, std, sta, created_at, executor_snapshot, fleet_snapshot')
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
            <thead><tr><th>Transaction ID</th><th>Jenis</th><th>Rute</th><th>Executor</th><th>Armada</th><th>Status</th></tr></thead>
            <tbody>
              {visible.map((task) => <tr key={task.transaction_id}>
                <td><strong>{task.transaction_id}</strong></td>
                <td>{task.task_type}</td>
                <td>{task.start_point ?? '-'} → {task.destination ?? '-'}</td>
                <td>{task.executor_snapshot?.full_name ?? '-'}</td>
                <td>{task.fleet_snapshot?.plat_number ?? task.fleet_ownership ?? '-'}</td>
                <td><span className={`status-badge status-${task.status.toLowerCase().replaceAll(' ', '-')}`}>{task.status}</span></td>
              </tr>)}
              {!visible.length ? <tr><td colSpan={6}><div className="empty-state">Belum ada riwayat penugasan.</div></td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  )
}
