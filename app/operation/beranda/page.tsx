import OperationCreateTask from '@/components/operation-create-task'
import OperationRequestExtraScheduleForm from '@/components/operation-request-extra-schedule-form'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function OperationBerandaPage() {
  const admin = createAdminClient()
  const [{ data: locations }, { data: products }, { data: tasks }, { count: requested }, { count: completed }] = await Promise.all([
    admin.from('locations').select('location').eq('status', 'Active').order('location'),
    admin.from('products').select('product').eq('status', 'Active').order('product'),
    admin.from('tasks').select('transaction_id, status, start_point, destination, std, sta, external_executor, external_fleet, sj_number, sj_qty, sj_weight, product, sj_note').eq('task_type', 'Supply').eq('fleet_ownership', 'Non-TGR').eq('status', 'Assigned').order('created_at', { ascending: false }),
    admin.from('tasks').select('*', { count: 'exact', head: true }).eq('source_type', 'Jadwal Tambahan').eq('status', 'Requested'),
    admin.from('tasks').select('*', { count: 'exact', head: true }).eq('source_type', 'Jadwal Tambahan').eq('status', 'Completed'),
  ])

  return (
    <div className="role-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">OPERATION</span>
          <h1>Operasional Harian</h1>
          <p>Buat Supply Non-TGR dan ajukan Jadwal Tambahan tanpa pindah-pindah halaman.</p>
        </div>
      </div>

      <section className="section-block">
        <div className="metric-grid">
          <div className="metric-card"><span>Non-TGR Menunggu</span><strong>{tasks?.length ?? 0}</strong></div>
          <div className="metric-card"><span>Jadwal Tambahan Diajukan</span><strong>{requested ?? 0}</strong></div>
          <div className="metric-card"><span>Jadwal Tambahan Selesai</span><strong>{completed ?? 0}</strong></div>
          <div className="metric-card"><span>Proses Berjalan</span><strong>{(tasks?.length ?? 0) + (requested ?? 0)}</strong></div>
          <div className="metric-card alert-card"><span>Perlu Dicek</span><strong>{requested ?? 0}</strong></div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><h2>Buat tugas baru</h2><p>Pilih proses sesuai kebutuhan operasional.</p></div></div>
        <OperationCreateTask
          locations={(locations ?? []).map((item) => item.location)}
          products={(products ?? []).map((item) => item.product)}
          tasks={tasks ?? []}
        />
      </section>

      <section className="section-block">
        <div className="section-heading"><div><h2>Buat request baru</h2><p>Ajukan Jadwal Tambahan ke Dispatcher.</p></div></div>
        <div className="section-grid two-column">
          <div className="metric-card">
            <div className="card-title">Jadwal Tambahan</div>
            <p className="muted">Isi Start Point, Destination, STD, dan STA. Setelah dikonfirmasi, request masuk ke Dispatcher.</p>
            <OperationRequestExtraScheduleForm locations={(locations ?? []).map((item) => item.location)} />
          </div>
          <div className="metric-card">
            <div className="card-title">Setelah request dikirim</div>
            <div className="flow-list">
              <div><strong>1. Diajukan</strong><span>Request tersimpan sebagai Requested.</span></div>
              <div><strong>2. Diterima</strong><span>Dispatcher mengonfirmasi request.</span></div>
              <div><strong>3. Ditugaskan</strong><span>Dispatcher memilih Executor dan Armada.</span></div>
              <div><strong>4. Berjalan</strong><span>Executor menerima dan menjalankan tugas.</span></div>
              <div><strong>5. Selesai</strong><span>Perjalanan ditutup setelah tiba.</span></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
