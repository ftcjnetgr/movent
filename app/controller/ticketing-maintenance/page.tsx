import AppShell from '@/components/app-shell'

const statuses = ['Created', 'Accepted', 'In Progress', 'Completed']

export default function ControllerTicketingMaintenancePage() {
  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Controller</span>
          <h1>Ticketing Maintenance</h1>
          <p>Pantau seluruh ticketing maintenance armada.</p>
        </div>
      </div>
      <div className="dashboard-tabs">
        <a className="dashboard-tab" href="/controller/beranda">Tugas</a>
        <a className="dashboard-tab" href="/controller/timetable">Timetable</a>
        <a className="dashboard-tab active" href="/controller/ticketing-maintenance">Ticketing Maintenance</a>
      </div>
      <section className="section-block">
        <div className="metric-grid">
          {statuses.map((status) => (
            <div className="metric-card" key={status}><span>{status}</span><strong>0</strong></div>
          ))}
          <div className="metric-card alert-card"><span>Alert</span><strong>0</strong></div>
        </div>
      </section>
    </AppShell>
  )
}
