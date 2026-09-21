import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'
import { submitNonTgrArrivalAction } from './actions'

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    Requested: 'Diajukan',
    Assigned: 'Ditugaskan',
    Confirmed: 'Diterima',
    Driving: 'Berangkat',
    Completed: 'Selesai',
    Canceled: 'Dibatalkan',
  }
  return labels[status] ?? status
}

async function submitNonTgrArrivalFormAction(formData: FormData) {
  'use server'
  await submitNonTgrArrivalAction(formData)
}

export default async function ArmadaNonTgrPage() {
  const profile = await getCurrentProfile()
  const admin = createAdminClient()
  const { data: tasks } = await admin
    .from('tasks')
    .select('transaction_id, task_type, status, fleet_ownership, start_point, destination, std, sta, external_executor, external_fleet, sj_number, created_at, external_departure_at, external_arrival_at')
    .eq('fleet_ownership', 'Non-TGR')
    .order('created_at', { ascending: false })

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Dispatcher</span>
          <h1>Armada Non-TGR</h1>
          <p>Konfirmasi kedatangan Armada Non-TGR dan simpan ATA setelah Operation mengonfirmasi keberangkatan.</p>
        </div>
      </div>
      <section className="data-table-card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID Transaksi</th><th>Rute</th><th>Executor dari luar</th><th>Armada</th><th>STD</th><th>STA</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {(tasks ?? []).map((task) => <tr key={task.transaction_id}>
                <td><strong>{task.transaction_id}</strong></td>
                <td>{task.start_point ?? '-'} → {task.destination ?? '-'}</td>
                <td>{task.external_executor ?? '-'}</td>
                <td>{task.external_fleet ?? '-'}</td>
                <td>{task.std ? new Date(task.std).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) : '-'}</td>
                <td>{task.sta ? new Date(task.sta).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) : '-'}</td>
                <td><span className={`status-badge status-${task.status.toLowerCase().replaceAll(' ', '-')}`}>{statusLabel(task.status)}</span></td>
                <td>
                  {task.status === 'Driving' ? (
                    <form action={submitNonTgrArrivalFormAction} className="compact-form">
                      <input type="hidden" name="transactionId" value={task.transaction_id} />
                      <label>ATA<input name="arrival" type="datetime-local" required /></label>
                      <button type="submit">Konfirmasi Tiba</button>
                    </form>
                  ) : null}
                  {task.status === 'Completed' ? <span className="muted">Selesai</span> : null}
                </td>
              </tr>)}
              {!(tasks ?? []).length ? <tr><td colSpan={8}><div className="empty-state">Belum ada tugas Armada Non-TGR untuk sekarang.</div></td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
