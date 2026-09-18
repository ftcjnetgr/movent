import AppShell from '@/components/app-shell'
import OperationRequestExtraScheduleForm from '@/components/operation-request-extra-schedule-form'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function RequestExtraSchedulePage() {
  const admin = createAdminClient()
  const { data: locations } = await admin
    .from('locations')
    .select('location')
    .eq('status', 'Active')
    .order('location')

  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Operation</span>
          <h1>Request Extra Schedule</h1>
          <p>Ajukan kebutuhan perjalanan tambahan ke Dispatcher.</p>
        </div>
      </div>

      <section className="section-grid two-column">
        <div className="metric-card">
          <div className="card-title">Buat request</div>
          <p className="muted">Isi kebutuhan perjalanan tambahan yang mau diajukan.</p>
          <OperationRequestExtraScheduleForm locations={(locations ?? []).map((item) => item.location)} />
        </div>

        <div className="metric-card">
          <div className="card-title">Alur</div>
          <div className="flow-list">
            <div><strong>Requested</strong><span>Request sudah diajukan dan menunggu assignment.</span></div>
            <div><strong>Assigned</strong><span>Dispatcher sudah memilih Executor dan Armada.</span></div>
            <div><strong>Accepted</strong><span>Executor sudah menerima request.</span></div>
            <div><strong>Driving</strong><span>Executor sudah konfirmasi berangkat.</span></div>
            <div><strong>Completed</strong><span>Seluruh proses Extra Schedule selesai.</span></div>
          </div>
        </div>
      </section>
    </AppShell>
  )
}
