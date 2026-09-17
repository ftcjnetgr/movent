import AppShell from '@/components/app-shell'

export default function DispatcherBerandaPage() {
  return (
    <AppShell>
      <div className="page-heading"><div><span className="eyebrow">Dispatcher</span><h1>Beranda</h1><p>Pantau tugas yang kamu buat dan ticketing maintenance.</p></div></div>
      <div className="dashboard-tabs">
        <a className="dashboard-tab active" href="/dispatcher/beranda">Tugas</a>
        <a className="dashboard-tab" href="/dispatcher/timetable">Timetable</a>
        <a className="dashboard-tab" href="/dispatcher/ticketing-maintenance">Ticketing Maintenance</a>
      </div>
      <section className="section-block">
        <div className="metric-grid">
          {['Assigned','Accepted','Driving','Completed'].map((status) => <div className="metric-card" key={status}><span>{status}</span><strong>0</strong></div>)}
          <div className="metric-card alert-card"><span>Alert</span><strong>0</strong></div>
        </div>
      </section>
    </AppShell>
  )
}
