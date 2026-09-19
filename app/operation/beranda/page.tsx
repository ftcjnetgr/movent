import { createAdminClient } from '@/lib/supabase/admin'

export default async function OperationBerandaPage() {
  const admin = createAdminClient()
  const [{ count: requested }, { count: assigned }, { count: completed }, { count: canceled }] = await Promise.all([
    admin.from('tasks').select('*', { count: 'exact', head: true }).eq('source_type', 'Extra Schedule').eq('status', 'Requested'),
    admin.from('tasks').select('*', { count: 'exact', head: true }).eq('source_type', 'Extra Schedule').eq('status', 'Assigned'),
    admin.from('tasks').select('*', { count: 'exact', head: true }).eq('source_type', 'Extra Schedule').eq('status', 'Completed'),
    admin.from('tasks').select('*', { count: 'exact', head: true }).eq('source_type', 'Extra Schedule').eq('status', 'Canceled'),
  ])
  return (
    <>
      <div className="page-heading"><div><span className="eyebrow">Operation</span><h1>Homepage</h1><p>Pantau request Extra Schedule dari satu tempat.</p></div></div>
      <section className="section-block"><div className="metric-grid">
        <div className="metric-card"><span>Requested</span><strong>{requested ?? 0}</strong></div>
        <div className="metric-card"><span>Assigned</span><strong>{assigned ?? 0}</strong></div>
        <div className="metric-card"><span>Completed</span><strong>{completed ?? 0}</strong></div>
        <div className="metric-card"><span>Canceled</span><strong>{canceled ?? 0}</strong></div>
      </div></section>
    </>
  )
}
