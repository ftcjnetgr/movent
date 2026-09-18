import OperasionalExtraScheduleAlert from '@/components/operation-extra-schedule-alert'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'
import { cancelExtraScheduleAction } from '../request-extra-schedule/actions'

async function cancelExtraScheduleFormAction(formData: FormData) {
  'use server'
  await cancelExtraScheduleAction(formData)
}

function formatDateTime(value: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value))
}

export default async function OperasionalHistoryPage() {
  const profile = await getCurrentProfile()
  const admin = createAdminClient()
  const { data: requests } = await admin
    .from('tasks')
    .select('transaction_id, status, start_point, destination, std, sta, created_at, canceled_at, cancellation_note, executor_snapshot, fleet_snapshot')
    .eq('source_type', 'Extra Schedule')
    .eq('requested_by', profile.id)
    .order('created_at', { ascending: false })

  const alertRequests = (requests ?? [])
    .filter((request) => request.status === 'Requested')
    .map((request) => ({
      transaction_id: request.transaction_id,
      start_point: request.start_point,
      destination: request.destination,
      created_at: request.created_at,
    }))

  return (
    <>
    <div className="page-heading">
        <div>
          <span className="eyebrow">Operasional</span>
          <h1>Riwayat Permintaan</h1>
          <p>Semua permintaan jadwal tambahan yang pernah kamu ajukan.</p>
        </div>
      </div>

      <OperasionalExtraScheduleAlert requests={alertRequests} />

      <section className="data-table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID Transaksi</th>
                <th>Rute</th>
                <th>STD</th>
                <th>STA</th>
                <th>Status</th>
                <th>Dibuat</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {(requests ?? []).map((request) => (
                <tr key={request.transaction_id}>
                  <td><strong>{request.transaction_id}</strong></td>
                  <td>{request.start_point} → {request.destination}</td>
                  <td>{formatDateTime(request.std)}</td>
                  <td>{formatDateTime(request.sta)}</td>
                  <td><span className={`status-badge status-${String(request.status).toLowerCase().replaceAll(' ', '-')}`}>{request.status}</span></td>
                  <td>{formatDateTime(request.created_at)}</td>
                  <td>
                    <details>
                      <summary className="link-button">Lihat detail</summary>
                      <div className="metric-card compact-form" style={{marginTop:12}}>
                        <div><span className="muted">ID Transaksi</span><strong>{request.transaction_id}</strong></div>
                        <div><span className="muted">Start Point</span><strong>{request.start_point ?? '-'}</strong></div>
                        <div><span className="muted">Destinasi</span><strong>{request.destination ?? '-'}</strong></div>
                        <div><span className="muted">STD</span><strong>{formatDateTime(request.std)}</strong></div>
                        <div><span className="muted">STA</span><strong>{formatDateTime(request.sta)}</strong></div>
                        <div><span className="muted">Status</span><strong>{request.status}</strong></div>
                        <div><span className="muted">Executor</span><strong>{request.executor_snapshot?.executor_nik ?? '-'}{request.executor_snapshot?.full_name ? ' - ' + request.executor_snapshot.full_name : ''}</strong></div>
                        <div><span className="muted">Armada</span><strong>{request.fleet_snapshot?.plat_number ?? '-'}{request.fleet_snapshot?.fleet_type ? ' - ' + request.fleet_snapshot.fleet_type : ''}</strong></div>
                        <div><span className="muted">Dibuat</span><strong>{formatDateTime(request.created_at)}</strong></div>
                        {request.cancellation_note ? (
                          <div><span className="muted">Catatan Pembatalan</span><strong>{request.cancellation_note}</strong></div>
                        ) : null}
                      </div>
                    </details>

                    {request.status === 'Requested' ? (
                      <details style={{marginTop:8}}>
                        <summary className="link-button">Batalkan permintaan</summary>
                        <form action={cancelExtraScheduleFormAction} className="compact-form">
                          <input type="hidden" name="transactionId" value={request.transaction_id} />
                          <input name="note" placeholder="Tulis alasan pembatalan" required />
                          <button type="submit">Ya, batalkan</button>
                        </form>
                      </details>
                    ) : null}
                  </td>
                </tr>
              ))}
              {(requests ?? []).length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state">Belum ada permintaan jadwal tambahan.</div></td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
