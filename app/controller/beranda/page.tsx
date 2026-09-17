import AppShell from '@/components/app-shell'

const taskStatuses = ['Assigned', 'Accepted', 'Driving', 'Completed']
const ticketStatuses = ['Created', 'Accepted', 'In Progress', 'Completed']

export default function ControllerBerandaPage() {
  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Controller</span>
          <h1>Beranda</h1>
          <p>Pantau pergerakan operasional dari satu tempat.</p>
        </div>
      </div>

      <div className="dashboard-tabs">
        <a className="dashboard-tab active" href="/controller/beranda">Tugas</a>
        <a className="dashboard-tab" href="/controller/timetable">Timetable</a>
        <a className="dashboard-tab" href="/controller/ticketing-maintenance">Ticketing Maintenance</a>
      </div>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>Tugas</h2>
            <p>Summary seluruh tugas yang ada.</p>
          </div>
        </div>
        <div className="metric-grid">
          {taskStatuses.map((status) => (
            <div className="metric-card" key={status}>
              <span>{status}</span>
              <strong>0</strong>
            </div>
          ))}
          <div className="metric-card alert-card">
            <span>Alert</span>
            <strong>0</strong>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>Ticketing Maintenance</h2>
            <p>Summary seluruh ticketing maintenance.</p>
          </div>
        </div>
        <div className="metric-grid">
          {ticketStatuses.map((status) => (
            <div className="metric-card" key={status}>
              <span>{status}</span>
              <strong>0</strong>
            </div>
          ))}
          <div className="metric-card alert-card">
            <span>Alert</span>
            <strong>0</strong>
          </div>
        </div>
      </section>
    </AppShell>
  )
}
