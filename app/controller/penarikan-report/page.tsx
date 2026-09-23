import ReportForm from './report-form'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function ControllerReportPage() {
  const admin = createAdminClient()
  const [{ data: locations }, { data: executors }] = await Promise.all([
    admin.from('locations').select('location').eq('status', 'Active').order('location'),
    admin.from('executors').select('executor_nik, full_name').eq('status', 'Active').order('full_name'),
  ])

  const options = (locations ?? []).map((item) => ({ value: item.location, label: item.location }))
  const executorOptions = (executors ?? []).map((item) => ({ value: item.executor_nik, label: `${item.full_name} (${item.executor_nik})` }))

  return (
    <>
    <div className="page-heading"><div><h1>Penarikan Laporan</h1><p>Pilih periode dan filter yang kamu butuhkan, lalu tarik laporannya.</p></div></div>
      <section className="section-block">
        <div className="metric-card report-card">
          <ReportForm startPoints={options} destinations={options} executors={executorOptions} />
        </div>
      </section>
    </>
  )
}
