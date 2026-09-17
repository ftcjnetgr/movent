import AppShell from '@/components/app-shell'
import ExecutorTaskCard from '@/components/executor-task-card'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'

export default async function ExecutorTugasSayaPage() {
  const profile = await getCurrentProfile()
  const admin = createAdminClient()

  let taskQuery = admin
    .from('tasks')
    .select('transaction_id, task_type, status, start_point, destination, std, sta, sj_number, sj_qty, sj_weight, product, sj_note, odometer_start, odometer_end, executor_snapshot, fleet_snapshot')
    .not('status', 'in', '(Completed,Canceled)')
    .order('created_at', { ascending: false })

  if (profile.role === 'Executor') {
    taskQuery = taskQuery.eq('executor_nik', profile.nik)
  }

  const [{ data: tasks }, { data: products }] = await Promise.all([
    taskQuery,
    admin.from('products').select('product').eq('status', 'Active').order('product'),
  ])

  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Executor</span>
          <h1>Tugas Saya</h1>
          <p>Semua tugas aktif yang sedang menjadi tanggung jawab kamu.</p>
        </div>
      </div>

      <section className="task-list">
        {(tasks ?? []).map((task) => (
          <ExecutorTaskCard key={task.transaction_id} task={task} products={(products ?? []).map((item) => item.product)} />
        ))}
        {(tasks ?? []).length === 0 ? (
          <div className="metric-card">
            <span>Belum ada tugas aktif</span>
            <strong>0</strong>
            <p>Tugas Completed masuk ke Riwayat Tugas. Tugas Dibatalkan tidak masuk ke daftar aktif.</p>
          </div>
        ) : null}
      </section>
    </AppShell>
  )
}
