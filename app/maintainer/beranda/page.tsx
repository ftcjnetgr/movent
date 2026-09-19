import Link from 'next/link'
import DashboardAlertList from '@/components/dashboard-alert-list'
import { getDashboardData } from '@/lib/server/dashboard'
import { getCurrentProfile } from '@/lib/server/profile'

function label(status: string) {
  return ({ Requested:'Diajukan', Confirmed:'Dikonfirmasi', 'In Progress':'Sedang dikerjakan', Completed:'Selesai', Canceled:'Dibatalkan' } as Record<string,string>)[status] ?? status
}

export default async function MaintainerBerandaPage() {
  const profile = await getCurrentProfile()
  const data = await getDashboardData(profile)

  return (
    <div className="role-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">MAINTAINER</span>
          <h1>Maintenance Armada</h1>
          <p>Lihat tiket yang masuk, kerjakan sesuai urutan, dan tandai selesai saat maintenance sudah beres.</p>
        </div>
        <div className="page-heading-actions">
          <Link className="button-link" href="/maintainer/penarikan-report">Penarikan Report</Link>
        </div>
      </div>

      <section className="section-block">
        <div className="section-heading"><div><h2>Ringkasan tiket</h2><p>Status tiket maintenance yang perlu kamu pantau.</p></div></div>
        <div className="metric-grid">
          <div className="metric-card"><span>Request Masuk</span><strong>{data.ticketCounts.Requested ?? 0}</strong></div>
          <div className="metric-card"><span>Sudah Dikonfirmasi</span><strong>{data.ticketCounts.Confirmed ?? 0}</strong></div>
          <div className="metric-card"><span>Sedang Dikerjakan</span><strong>{data.ticketCounts['In Progress'] ?? 0}</strong></div>
          <div className="metric-card"><span>Selesai</span><strong>{data.ticketCounts.Completed ?? 0}</strong></div>
          <div className="metric-card alert-card"><span>Alert</span><strong>{data.ticketAlertCount}</strong></div>
        </div>
      </section>

      <DashboardAlertList
        taskAlerts={[]}
        ticketAlerts={data.ticketAlerts}
      />

      <section className="section-block">
        <div className="section-heading"><div><h2>Alur kerja ticketing</h2><p>Setiap tiket bergerak melalui status berikut.</p></div></div>
        <div className="metric-grid">
          {['Requested','Confirmed','In Progress','Completed'].map((status) => (
            <div className="metric-card" key={status}><span>{label(status)}</span><strong>{data.ticketCounts[status as keyof typeof data.ticketCounts] ?? 0}</strong></div>
          ))}
        </div>
      </section>
    </div>
  )
}
