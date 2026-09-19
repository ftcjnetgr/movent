import OperationCreateTask from '@/components/operation-create-task'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function OperationBerandaPage() {
  const admin = createAdminClient()
  const [{ data: locations }, { data: products }, { data: tasks }, { count: requested }, { count: completed }] = await Promise.all([
    admin.from('locations').select('location').eq('status', 'Active').order('location'),
    admin.from('products').select('product').eq('status', 'Active').order('product'),
    admin.from('tasks').select('transaction_id, status, start_point, destination, std, sta, external_executor, external_fleet, sj_number, sj_qty, sj_weight, product, sj_note').eq('task_type', 'Supply').eq('fleet_ownership', 'Non-TGR').eq('status', 'Assigned').order('created_at', { ascending: false }),
    admin.from('tasks').select('*', { count: 'exact', head: true }).eq('source_type', 'Extra Schedule').eq('status', 'Requested'),
    admin.from('tasks').select('*', { count: 'exact', head: true }).eq('source_type', 'Extra Schedule').eq('status', 'Completed'),
  ])

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Operation</span>
          <h1>Homepage</h1>
          <p>Kelola Supply Non-TGR dan kebutuhan Extra Schedule dari satu tempat.</p>
        </div>
      </div>

      <section className="section-block">
        <div className="metric-grid">
          <div className="metric-card"><span>Extra Schedule Diajukan</span><strong>{requested ?? 0}</strong></div>
          <div className="metric-card"><span>Extra Schedule Selesai</span><strong>{completed ?? 0}</strong></div>
          <div className="metric-card"><span>Non-TGR Siap Berangkat</span><strong>{tasks?.length ?? 0}</strong></div>
        </div>
      </section>

      <OperationCreateTask
        locations={(locations ?? []).map((item) => item.location)}
        products={(products ?? []).map((item) => item.product)}
        tasks={tasks ?? []}
      />
    </>
  )
}
