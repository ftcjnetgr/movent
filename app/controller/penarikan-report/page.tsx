import ReportForm from './report-form'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function ControllerReportPage() {
  const admin = createAdminClient()
  const { data: locations } = await admin.from('locations').select('location').eq('status', 'Active').order('location')

  const options = (locations ?? []).map((item) => ({ value: item.location, label: item.location }))

  return (
    <>
    <div className="page-heading"><div><span className="eyebrow">Controller</span><h1>Penarikan Laporan</h1><p>Tarik laporan berdasarkan STD, STA, atau pembatalan.</p></div></div>
      <section className="section-block">
        <div className="metric-card report-card">
          <ReportForm startPoints={options} destinations={options} />
        </div>
      </section>
    </>
  )
}
