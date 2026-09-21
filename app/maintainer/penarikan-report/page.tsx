import ReportForm from '@/app/controller/penarikan-report/report-form'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function MaintainerReportPage() {
  const admin = createAdminClient()
  const { data: locations } = await admin.from('locations').select('location').eq('status', 'Active').order('location')
  const options = (locations ?? []).map((item) => ({ value: item.location, label: item.location }))
  return (
    <>
      <div className="page-heading"><div><span className="eyebrow">Maintainer</span><h1>Penarikan Report</h1><p>Tarik laporan operasional berdasarkan STD, STA, atau tugas yang dibatalkan.</p></div></div>
      <section className="section-block"><div className="metric-card report-card"><ReportForm startPoints={options} destinations={options} /></div></section>
    </>
  )
}
