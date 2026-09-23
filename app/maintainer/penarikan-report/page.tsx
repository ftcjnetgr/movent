import { notFound } from 'next/navigation'
import ReportForm from '@/app/controller/penarikan-report/report-form'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'

export default async function MaintainerReportPage() {
  const profile = await getCurrentProfile()
  if (!['Maintainer', 'Super User'].includes(profile.role)) notFound()
  const admin = createAdminClient()
  const [{ data: locations }, { data: executors }] = await Promise.all([
    admin.from('locations').select('location').eq('status', 'Active').order('location'),
    admin.from('executors').select('executor_nik, full_name').eq('status', 'Active').order('full_name'),
  ])
  const options = (locations ?? []).map((item) => ({ value: item.location, label: item.location }))
  const executorOptions = (executors ?? []).map((item) => ({ value: item.executor_nik, label: `${item.full_name} (${item.executor_nik})` }))
  return (
    <>
      <div className="page-heading"><div><h1>Penarikan Report</h1><p>Tarik laporan operasional berdasarkan STD, STA, atau tugas yang dibatalkan.</p></div></div>
      <section className="section-block"><div className="metric-card report-card"><ReportForm mode="maintenance" startPoints={options} destinations={options} executors={executorOptions} /></div></section>
    </>
  )
}
