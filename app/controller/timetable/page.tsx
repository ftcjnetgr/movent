import AppShell from '@/components/app-shell'

export default function ControllerTimetablePage() {
  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Controller</span>
          <h1>Timetable</h1>
          <p>Rencanakan jadwal dari database dan pantau kondisi live.</p>
        </div>
      </div>
      <div className="dashboard-tabs">
        <a className="dashboard-tab" href="/controller/beranda">Tugas</a>
        <a className="dashboard-tab active" href="/controller/timetable">Timetable</a>
        <a className="dashboard-tab" href="/controller/ticketing-maintenance">Ticketing Maintenance</a>
      </div>
      <section className="section-block">
        <div className="metric-grid">
          <div className="metric-card"><span>By Database</span><strong>0</strong></div>
          <div className="metric-card"><span>Live</span><strong>0</strong></div>
          <div className="metric-card"><span>Unassigned</span><strong>0</strong></div>
          <div className="metric-card"><span>Assigned</span><strong>0</strong></div>
          <div className="metric-card"><span>Canceled</span><strong>0</strong></div>
        </div>
      </section>
    </AppShell>
  )
}
