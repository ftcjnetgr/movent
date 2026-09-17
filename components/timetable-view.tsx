'use client'

import { useMemo, useState } from 'react'

type Schedule = {
  schedule_id: string
  trip: number
  route: string
  category: string
  start_point: string
  start_point_type: string
  destination: string
  destination_type: string
  schedule_day: number
  schedule_day_name: string
  std: string
  sta: string
}

type Task = {
  transaction_id: string
  status: string
  source_type: string
  task_type: string
  schedule_id: string | null
  start_point: string | null
  destination: string | null
  std: string | null
  sta: string | null
  executor_nik: string | null
  executor_snapshot: { full_name?: string; executor_nik?: string } | null
  fleet_snapshot: { plat_number?: string; fleet_type?: string } | null
  sj_number: string | null
}

function timeValue(value: string | null) {
  if (!value) return '-'
  const date = value.includes('T') ? new Date(value) : new Date(`1970-01-01T${value}`)
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: value.includes('T') ? 'Asia/Jakarta' : 'UTC' })
}

export default function TimetableView({
  date,
  schedules,
  tasks,
  taskBySchedule,
}: {
  date: string
  schedules: Schedule[]
  tasks: Task[]
  taskBySchedule: Record<string, Task>
}) {
  const [view, setView] = useState<'database' | 'live'>('database')
  const [direction, setDirection] = useState<'origin' | 'destination'>('origin')
  const [route, setRoute] = useState('')
  const [category, setCategory] = useState('')
  const [originType, setOriginType] = useState('')
  const [origin, setOrigin] = useState('')
  const [destinationType, setDestinationType] = useState('')
  const [destination, setDestination] = useState('')

  const options = useMemo(() => ({
    routes: [...new Set(schedules.map((item) => item.route))],
    categories: [...new Set(schedules.map((item) => item.category))],
    originTypes: [...new Set(schedules.map((item) => item.start_point_type))],
    origins: [...new Set(schedules.map((item) => item.start_point))],
    destinationTypes: [...new Set(schedules.map((item) => item.destination_type))],
    destinations: [...new Set(schedules.map((item) => item.destination))],
  }), [schedules])

  const filteredSchedules = useMemo(() => schedules.filter((item) => {
    if (route && item.route !== route) return false
    if (category && item.category !== category) return false
    if (direction === 'origin') {
      if (originType && item.start_point_type !== originType) return false
      if (origin && item.start_point !== origin) return false
    } else {
      if (destinationType && item.destination_type !== destinationType) return false
      if (destination && item.destination !== destination) return false
    }
    return true
  }), [schedules, route, category, originType, origin, destinationType, destination, direction])

  const filteredTasks = useMemo(() => tasks.filter((task) => {
    if (route || category || originType || origin || destinationType || destination) return true
    return true
  }).sort((a, b) => String(a.std ?? '').localeCompare(String(b.std ?? ''))), [tasks, route, category, originType, origin, destinationType, destination])

  const summary = {
    unassigned: schedules.filter((item) => !taskBySchedule[item.schedule_id]).length,
    assigned: schedules.filter((item) => !!taskBySchedule[item.schedule_id] && taskBySchedule[item.schedule_id].status !== 'Canceled').length,
    canceled: schedules.filter((item) => taskBySchedule[item.schedule_id]?.status === 'Canceled').length,
  }

  return (
    <div>
      <div className="dashboard-tabs">
        <button className={view === 'database' ? 'dashboard-tab active' : 'dashboard-tab'} onClick={() => setView('database')}>By Database</button>
        <button className={view === 'live' ? 'dashboard-tab active' : 'dashboard-tab'} onClick={() => setView('live')}>Live</button>
      </div>

      {view === 'database' ? (
        <>
          <div className="dashboard-tabs">
            <button className={direction === 'origin' ? 'dashboard-tab active' : 'dashboard-tab'} onClick={() => setDirection('origin')}>As Origin</button>
            <button className={direction === 'destination' ? 'dashboard-tab active' : 'dashboard-tab'} onClick={() => setDirection('destination')}>As Destination</button>
          </div>

          <section className="metric-grid">
            <div className="metric-card"><span>Unassigned</span><strong>{summary.unassigned}</strong></div>
            <div className="metric-card"><span>Assigned</span><strong>{summary.assigned}</strong></div>
            <div className="metric-card"><span>Canceled</span><strong>{summary.canceled}</strong></div>
          </section>

          <section className="section-block">
            <div className="data-form">
              <div className="form-row">
                <label>Route<select value={route} onChange={(event) => setRoute(event.target.value)}><option value="">Semua</option>{options.routes.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Semua</option>{options.categories.map((item) => <option key={item}>{item}</option>)}</select></label>
              </div>
              {direction === 'origin' ? (
                <div className="form-row">
                  <label>Start Point Type<select value={originType} onChange={(event) => setOriginType(event.target.value)}><option value="">Semua</option>{options.originTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
                  <label>Start Point<select value={origin} onChange={(event) => setOrigin(event.target.value)}><option value="">Semua</option>{options.origins.map((item) => <option key={item}>{item}</option>)}</select></label>
                </div>
              ) : (
                <div className="form-row">
                  <label>Destination Type<select value={destinationType} onChange={(event) => setDestinationType(event.target.value)}><option value="">Semua</option>{options.destinationTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
                  <label>Destination<select value={destination} onChange={(event) => setDestination(event.target.value)}><option value="">Semua</option>{options.destinations.map((item) => <option key={item}>{item}</option>)}</select></label>
                </div>
              )}
            </div>
          </section>

          <section className="data-table-card section-block">
            <div className="section-heading"><div><h2>Plan Schedule</h2><p>{date}</p></div></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Trip</th><th>Route</th><th>Category</th><th>Origin</th><th>Destination</th><th>STD</th><th>STA</th><th>Status</th><th>Preview</th></tr></thead>
                <tbody>
                  {filteredSchedules.map((item) => {
                    const task = taskBySchedule[item.schedule_id]
                    return (
                      <tr key={item.schedule_id} style={!task ? { opacity: 0.55 } : undefined}>
                        <td>{item.trip}</td>
                        <td>{item.route}</td>
                        <td>{item.category}</td>
                        <td>{item.start_point}</td>
                        <td>{item.destination}</td>
                        <td>{timeValue(item.std)}</td>
                        <td>{timeValue(item.sta)}</td>
                        <td>{task ? <span className={`status-badge status-${task.status.toLowerCase().replaceAll(' ', '-')}`}>{task.status}</span> : <span className="status-badge">Unassigned</span>}</td>
                        <td>{task ? <details><summary className="link-button">Buka</summary><div className="muted" style={{ paddingTop: 8 }}>{task.transaction_id} • {task.executor_snapshot?.full_name ?? '-'} • {task.fleet_snapshot?.plat_number ?? '-'}</div></details> : <span className="muted">Tidak bisa dibuka</span>}</td>
                      </tr>
                    )
                  })}
                  {!filteredSchedules.length ? <tr><td colSpan={9}><div className="empty-state">Tidak ada schedule yang sesuai filter.</div></td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="data-table-card section-block">
          <div className="section-heading"><div><h2>Live Timetable</h2><p>Seluruh transaksi yang sudah dibuat atau di-assign.</p></div></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Transaction ID</th><th>Jenis</th><th>Origin</th><th>Destination</th><th>STD</th><th>STA</th><th>Status</th><th>Armada</th></tr></thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.transaction_id}>
                    <td><strong>{task.transaction_id}</strong></td>
                    <td>{task.source_type === 'Extra Schedule' ? 'Extra Schedule' : task.task_type}</td>
                    <td>{task.start_point ?? '-'}</td>
                    <td>{task.destination ?? '-'}</td>
                    <td>{timeValue(task.std)}</td>
                    <td>{timeValue(task.sta)}</td>
                    <td><span className={`status-badge status-${task.status.toLowerCase().replaceAll(' ', '-')}`}>{task.status}</span></td>
                    <td>{task.fleet_snapshot?.plat_number ?? '-'}</td>
                  </tr>
                ))}
                {!filteredTasks.length ? <tr><td colSpan={8}><div className="empty-state">Live Timetable masih kosong.</div></td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
