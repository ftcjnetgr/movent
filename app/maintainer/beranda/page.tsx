import AppShell from '@/components/app-shell'

export default function MaintainerBerandaPage() {
  return (
    <AppShell>
      <div className="page-heading"><div><span className="eyebrow">Maintainer</span><h1>Beranda</h1><p>Pantau tugas dan ticketing maintenance armada.</p></div></div>
      <div className="dashboard-tabs">
        <a className="dashboard-tab active" href="/maintainer/beranda">Tugas</a>
        <a className="dashboard-tab" href="/maintainer/timetable">Timetable</a>
        <a className="dashboard-tab" href="/maintainer/ticketing-maintenance">Ticketing Maintenance</a>
      </div>
      <section className="section-block">
        <div className="metric-grid">
          {['Assigned','Accepted','Driving','Completed'].map((status) => <div className="metric-card" key={status}><span>{status}</span><strong>0</strong></div>)}
          <div className="metric-card alert-card"><span>Alert</span><strong>0</strong></div>
        </div>
      </section>
      <section className="section-block">
        <div className="metric-grid">
          {['Created','Accepted','In Progress','Completed'].map((status) => <div className="metric-card" key={status}><span>{status}</span><strong>0</strong></div>)}
          <div className="metric-card alert-card"><span>Alert</span><strong>0</strong></div>
        </div>
      </section>
    </AppShell>
  )
}
