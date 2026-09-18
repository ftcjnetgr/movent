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
    <>
    <div className="page-heading">
        <div>
          <span className="eyebrow">Operation</span>
          <h1>Permintaan Jadwal Tambahan</h1>
          <p>Ajukan kebutuhan perjalanan tambahan ke Dispatcher.</p>
        </div>
      </div>

      <section className="section-grid two-column">
        <div className="metric-card">
          <div className="card-title">Buat permintaan</div>
          <p className="muted">Ceritain kebutuhan perjalanan tambahan yang mau diajukan.</p>
          <OperationRequestExtraScheduleForm locations={(locations ?? []).map((item) => item.location)} />
        </div>

        <div className="metric-card">
          <div className="card-title">Alurnya</div>
          <div className="flow-list">
            <div><strong>Diajukan</strong><span>Permintaan sudah diajukan dan tinggal menunggu penugasan.</span></div>
            <div><strong>Ditugaskan</strong><span>Dispatcher sudah memilih executor dan armada.</span></div>
            <div><strong>Diterima</strong><span>Executor sudah menerima permintaan.</span></div>
            <div><strong>Berangkat</strong><span>Executor sudah konfirmasi berangkat.</span></div>
            <div><strong>Selesai</strong><span>Semua proses jadwal tambahan sudah selesai.</span></div>
          </div>
        </div>
      </section>
    </>
  )
}
