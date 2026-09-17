import AppShell from '@/components/app-shell'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'
import { cancelExtraScheduleAction } from '../request-extra-schedule/actions'

function formatDateTime(value: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value))
}

export default async function OperationHistoryPage() {
  const profile = await getCurrentProfile()
  const admin = createAdminClient()
  const { data: requests } = await admin
    .from('tasks')
    .select('transaction_id, status, start_point, destination, std, sta, created_at, canceled_at, cancellation_note')
    .eq('source_type', 'Extra Schedule')
    .eq('requested_by', profile.id)
    .order('created_at', { ascending: false })

  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Operation</span>
          <h1>Riwayat Permintaan</h1>
          <p>Semua request Extra Schedule yang pernah kamu ajukan.</p>
        </div>
      </div>

      <section className="data-table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Transaction ID</th>
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
                    {request.status === 'Requested' ? (
                      <details>
                        <summary className="link-button">Batalkan</summary>
                        <form action={cancelExtraScheduleAction} className="compact-form">
                          <input type="hidden" name="transactionId" value={request.transaction_id} />
                          <input name="note" placeholder="Alasan pembatalan" required />
                          <button type="submit">Konfirmasi batal</button>
                        </form>
                      </details>
                    ) : request.status === 'Canceled' ? (
                      <span className="muted">{request.cancellation_note}</span>
                    ) : (
                      <span className="muted">Preview</span>
                    )}
                  </td>
                </tr>
              ))}
              {(requests ?? []).length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state">Belum ada request Extra Schedule.</div></td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  )
}
