'use client'

import { useMemo, useState } from 'react'

type Schedule = {
  schedule_id: string
  trip: number
  schedule_hub_id: string | null
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

type SummaryFilter = 'all' | 'unassigned' | 'assigned' | 'canceled'

function minutesValue(value: string | null) {
  if (!value) return null
  if (value.includes('T')) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(date)
    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0)
    const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0)
    return hour * 60 + minute
  }
  const [hour, minute] = value.split(':').map(Number)
  return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : null
}

function hourValue(value: string | null) {
  const minutes = minutesValue(value)
  return minutes === null ? null : Math.floor(minutes / 60)
}

function timeValue(value: string | null) {
  const minutes = minutesValue(value)
  return minutes === null ? '-' : `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function statusClass(status: string | undefined) {
  return status ? `status-${status.toLowerCase().replaceAll(' ', '-')}` : ''
}

export default function TimetableView({
  date,
  schedules,
  tasks,
  taskBySchedule,
  initialView = 'database',
}: {
  date: string
  schedules: Schedule[]
  tasks: Task[]
  taskBySchedule: Record<string, Task>
  initialView?: 'database' | 'live'
}) {
  const [direction, setDirection] = useState<'origin' | 'destination'>('origin')
  const [route, setRoute] = useState('')
  const [category, setCategory] = useState('')
  const [hub, setHub] = useState('')
  const [point, setPoint] = useState('')
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>('all')
  const view = initialView

  const scheduleById = useMemo(() => new Map(schedules.map((item) => [item.schedule_id, item])), [schedules])

  const options = useMemo(() => ({
    routes: [...new Set(schedules.map((item) => item.route).filter(Boolean))],
    categories: [...new Set(schedules.map((item) => item.category).filter(Boolean))],
    hubs: [...new Set(schedules.map((item) => item.schedule_hub_id).filter(Boolean) as string[])],
    points: [...new Set(schedules.map((item) => direction === 'origin' ? item.destination : item.start_point).filter(Boolean))],
  }), [schedules, direction])

  const filteredSchedules = useMemo(() => schedules.filter((item) => {
    const displayPoint = direction === 'origin' ? item.destination : item.start_point
    if (route && item.route !== route) return false
    if (category && item.category !== category) return false
    if (hub && item.schedule_hub_id !== hub) return false
    if (point && displayPoint !== point) return false
    return true
  }), [schedules, direction, route, category, hub, point])

  const filteredTasks = useMemo(() => tasks.filter((task) => {
    const displayPoint = direction === 'origin' ? task.destination : task.start_point
    if (point && displayPoint !== point) return false
    if (hub) {
      const schedule = task.schedule_id ? scheduleById.get(task.schedule_id) : null
      if ((schedule?.schedule_hub_id ?? '') !== hub) return false
    }
    if (route) {
      const schedule = task.schedule_id ? scheduleById.get(task.schedule_id) : null
      if ((schedule?.route ?? '') !== route) return false
    }
    if (category) {
      const schedule = task.schedule_id ? scheduleById.get(task.schedule_id) : null
      if ((schedule?.category ?? '') !== category) return false
    }
    return true
  }), [tasks, direction, point, hub, route, category, scheduleById])

  const summary = useMemo(() => ({
    unassigned: filteredSchedules.filter((item) => !taskBySchedule[item.schedule_id]).length,
    assigned: filteredSchedules.filter((item) => taskBySchedule[item.schedule_id] && taskBySchedule[item.schedule_id].status !== 'Canceled').length,
    canceled: filteredSchedules.filter((item) => taskBySchedule[item.schedule_id]?.status === 'Canceled').length,
  }), [filteredSchedules, taskBySchedule])

  const liveSummary = useMemo(() => ({
    unassigned: 0,
    assigned: filteredTasks.filter((task) => task.status !== 'Canceled').length,
    canceled: filteredTasks.filter((task) => task.status === 'Canceled').length,
  }), [filteredTasks])

  const summaryMatch = (task: Task | undefined) => {
    if (summaryFilter === 'all') return true
    if (summaryFilter === 'canceled') return task?.status === 'Canceled'
    if (summaryFilter === 'assigned') return !!task && task.status !== 'Canceled'
    return !task
  }

  const planRows = useMemo(() => {
    const groups = new Map<string, Schedule[]>()
    for (const item of filteredSchedules) {
      const row = direction === 'origin' ? item.destination : item.start_point
      groups.set(row, [...(groups.get(row) ?? []), item])
    }
    return [...groups.entries()]
  }, [filteredSchedules, direction])

  const liveRows = useMemo(() => {
    const groups = new Map<string, Task[]>()
    for (const task of filteredTasks) {
      const row = direction === 'origin' ? (task.destination ?? '-') : (task.start_point ?? '-')
      groups.set(row, [...(groups.get(row) ?? []), task])
    }
    return [...groups.entries()]
  }, [filteredTasks, direction])

  const planHubs = useMemo(() => {
    const groups = new Map<string, Schedule[]>()
    for (const item of filteredSchedules) {
      const key = item.schedule_hub_id || 'Tanpa Hub'
      groups.set(key, [...(groups.get(key) ?? []), item])
    }
    return [...groups.entries()]
  }, [filteredSchedules])

  const liveHubs = useMemo(() => {
    const groups = new Map<string, Task[]>()
    for (const task of filteredTasks) {
      const key = task.schedule_id ? (scheduleById.get(task.schedule_id)?.schedule_hub_id || 'Tanpa Hub') : 'Tanpa Hub'
      groups.set(key, [...(groups.get(key) ?? []), task])
    }
    return [...groups.entries()]
  }, [filteredTasks, scheduleById])

  function renderPlanTable(items: Schedule[]) {
    const rows = new Map<string, Schedule[]>()
    for (const item of items) {
      const row = direction === 'origin' ? item.destination : item.start_point
      rows.set(row, [...(rows.get(row) ?? []), item])
    }
    return (
      <div className="schedule-grid-scroll">
        <table className="schedule-grid-table">
          <thead>
            <tr>
              <th>{direction === 'origin' ? 'Destination' : 'Origin / Start Point'}</th>
              {Array.from({ length: 24 }, (_, hour) => <th key={hour}>{String(hour).padStart(2, '0')}</th>)}
            </tr>
          </thead>
          <tbody>
            {[...rows.entries()].map(([row, rowItems]) => (
              <tr key={row}>
                <th>{row}</th>
                {Array.from({ length: 24 }, (_, hour) => {
                  const cellItems = rowItems.filter((item) => hourValue(direction === 'origin' ? item.std : item.sta) === hour)
                  return (
                    <td key={hour}>
                      <div className="schedule-grid-cell">
                        {cellItems.map((item) => {
                          const task = taskBySchedule[item.schedule_id]
                          return (
                            <span
                              key={item.schedule_id}
                              className={`schedule-trip ${task ? statusClass(task.status) : 'unassigned'} ${!summaryMatch(task) ? 'faded' : ''}`}
                              title={`Trip ${item.trip} · ${timeValue(direction === 'origin' ? item.std : item.sta)} · ${item.route} · ${item.category}`}
                            >
                              {item.trip}
                            </span>
                          )
                        })}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  function renderLiveTable(items: Task[]) {
    const rows = new Map<string, Task[]>()
    for (const item of items) {
      const row = direction === 'origin' ? (item.destination ?? '-') : (item.start_point ?? '-')
      rows.set(row, [...(rows.get(row) ?? []), item])
    }
    return (
      <div className="schedule-grid-scroll">
        <table className="schedule-grid-table">
          <thead>
            <tr>
              <th>{direction === 'origin' ? 'Destination' : 'Origin / Start Point'}</th>
              {Array.from({ length: 24 }, (_, hour) => <th key={hour}>{String(hour).padStart(2, '0')}</th>)}
            </tr>
          </thead>
          <tbody>
            {[...rows.entries()].map(([row, rowItems]) => (
              <tr key={row}>
                <th>{row}</th>
                {Array.from({ length: 24 }, (_, hour) => {
                  const cellItems = rowItems.filter((item) => hourValue(direction === 'origin' ? item.std : item.sta) === hour)
                  return (
                    <td key={hour}>
                      <div className="schedule-grid-cell">
                        {cellItems.map((item) => (
                          <span key={item.transaction_id} className={`schedule-trip live-item ${statusClass(item.status)} ${summaryFilter !== 'all' && !summaryMatch(item) ? 'faded' : ''}`} title={`${item.transaction_id} · ${timeValue(direction === 'origin' ? item.std : item.sta)}`}>
                            {item.transaction_id}
                          </span>
                        ))}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const hubs = view === 'database' ? planHubs : liveHubs
  const summaries = view === 'database' ? summary : liveSummary

  return (
    <div className="schedule-page">
      <div className="schedule-view-tabs" role="tablist" aria-label="Tampilan schedule">
        <a className={view === 'database' ? 'active' : ''} href="/controller/timetable?view=plan">By Plan</a>
        <a className={view === 'live' ? 'active' : ''} href="/controller/timetable?view=live">Live Tracking</a>
      </div>

      <div className="schedule-toolbar">
        <div className="schedule-direction">
          <button type="button" className={direction === 'origin' ? 'active' : ''} onClick={() => { setDirection('origin'); setHub(''); setPoint('') }}>AS Origin</button>
          <button type="button" className={direction === 'destination' ? 'active' : ''} onClick={() => { setDirection('destination'); setHub(''); setPoint('') }}>AS Destination</button>
        </div>
        <select value={hub} onChange={(e) => setHub(e.target.value)}>
          <option value="">{direction === 'origin' ? 'Hub Origin' : 'Hub Destinasi'}</option>
          {options.hubs.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={point} onChange={(e) => setPoint(e.target.value)}>
          <option value="">{direction === 'origin' ? 'Destination' : 'Origin / Start Point'}</option>
          {options.points.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={route} onChange={(e) => setRoute(e.target.value)}><option value="">Rute</option>{options.routes.map((item) => <option key={item}>{item}</option>)}</select>
        <select value={category} onChange={(e) => setCategory(e.target.value)}><option value="">Kategori</option>{options.categories.map((item) => <option key={item}>{item}</option>)}</select>
      </div>

      <div className="schedule-summary-inline">
        <button type="button" className={summaryFilter === 'unassigned' ? 'active' : ''} onClick={() => setSummaryFilter(summaryFilter === 'unassigned' ? 'all' : 'unassigned')}>Belum ditugaskan <b>{summaries.unassigned}</b></button>
        <button type="button" className={summaryFilter === 'assigned' ? 'active' : ''} onClick={() => setSummaryFilter(summaryFilter === 'assigned' ? 'all' : 'assigned')}>Sudah ditugaskan <b>{summaries.assigned}</b></button>
        <button type="button" className={summaryFilter === 'canceled' ? 'active' : ''} onClick={() => setSummaryFilter(summaryFilter === 'canceled' ? 'all' : 'canceled')}>Dibatalkan <b>{summaries.canceled}</b></button>
      </div>

      <section className="schedule-grid-shell">
        {hubs.map(([hubName, items], index) => (
          <details className="schedule-hub" key={hubName} open={index === 0}>
            <summary>
              <span>Hub {direction === 'origin' ? 'Origin' : 'Destinasi'}</span>
              <b>{hubName}</b>
              <small>{items.length} {view === 'database' ? 'schedule' : 'assignment'}</small>
            </summary>
            {view === 'database' ? renderPlanTable(items as Schedule[]) : renderLiveTable(items as Task[])}
          </details>
        ))}
        {!hubs.length ? <div className="schedule-empty">Belum ada schedule yang cocok.</div> : null}
      </section>

      <div className="schedule-date">Schedule date · {date}</div>
    </div>
  )
}
