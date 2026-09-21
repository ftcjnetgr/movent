import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'

function formatDateTime(value: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value))
}

export default async function ExecutorHistoryPage() {
  const profile = await getCurrentProfile()
  if (!['Executor', 'Super User'].includes(profile.role)) notFound()
  const admin = createAdminClient()
  let query = admin
    .from('tasks')
    .select('transaction_id, task_type, status, start_point, destination, assigned_at, accepted_at, driving_at, completed_at, executor_snapshot, fleet_snapshot')
    .eq('status', 'Completed')
    .order('completed_at', { ascending: false })

  if (profile.role === 'Executor') query = query.eq('executor_nik', profile.nik)

  const { data: tasks } = await query

  return (
    <>
    <div className="page-heading">
        <div>
          <span className="eyebrow">Executor</span>
          <h1>Riwayat Tugas</h1>
          <p>Riwayat tugas yang sudah selesai.</p>
        </div>
      </div>

      <section className="data-table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>ID Transaksi</th><th>Jenis</th><th>Rute</th><th>Armada</th><th>Selesai</th></tr>
            </thead>
            <tbody>
              {(tasks ?? []).map((task) => (
                <tr key={task.transaction_id}>
                  <td><strong>{task.transaction_id}</strong></td>
                  <td>{task.task_type}</td>
                  <td>{task.start_point} → {task.destination}</td>
                  <td>{task.fleet_snapshot?.plat_number ?? '-'}</td>
                  <td>{formatDateTime(task.completed_at)}</td>
                </tr>
              ))}
              {(tasks ?? []).length === 0 ? <tr><td colSpan={5}><div className="empty-state">Belum ada tugas yang selesai untuk sekarang.</div></td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
