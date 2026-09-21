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

const DAYS = [
  { value: 1, label: 'Senin' },
  { value: 2, label: 'Selasa' },
  { value: 3, label: 'Rabu' },
  { value: 4, label: 'Kamis' },
  { value: 5, label: 'Jumat' },
  { value: 6, label: 'Sabtu' },
  { value: 7, label: 'Minggu' },
]

function minutesValue(value: string | null) {
  if (!value) return null
  if (value.includes('T')) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date)
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
  return minutes === null
    ? '-'
    : `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function statusClass(status: string | undefined) {
  return status ? `status-${status.toLowerCase().replaceAll(' ', '-')}` : ''
}

export default function TimetableView({
  date,
  todayDay,
  schedules,
  tasks,
  todayTasks,
  taskBySchedule,
  initialView = 'database',
}: {
  date: string
  todayDay: number
  schedules: Schedule[]
  tasks: Task[]
  todayTasks: Task[]
  taskBySchedule: Record<string, Task>
  initialView?: 'database' | 'live'
}) {
  const view = initialView
  const [selectedDay, setSelectedDay] = useState(todayDay)
  const [direction, setDirection] = useState<'origin' | 'destination'>('origin')
  const [route, setRoute] = useState('')
  const [category, setCategory] = useState('Normal')
  const [point, setPoint] = useState('')
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>('all')

  const scheduleById = useMemo(
    () => new Map(schedules.map((item) => [item.schedule_id, item])),
    [schedules],
  )

  const categories = useMemo(() => {
    const unique = [...new Set(schedules.map((item) => item.category).filter(Boolean))]
    return unique.sort((a, b) => (a === 'Normal' ? -1 : b === 'Normal' ? 1 : a.localeCompare(b)))
  }, [schedules])

  const selectedPlanSchedules = useMemo(
    () => schedules.filter((item) => item.schedule_day === selectedDay),
    [schedules, selectedDay],
  )

  const options = useMemo(() => {
    const source = view === 'database' ? selectedPlanSchedules : schedules
    return {
      routes: [...new Set(source.map((item) => item.route).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
      points: [...new Set(source.map((item) => direction === 'origin' ? item.destination : item.start_point).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    }
  }, [selectedPlanSchedules, schedules, view, direction])

  const filteredSchedules = useMemo(() => selectedPlanSchedules.filter((item) => {
    const displayPoint = direction === 'origin' ? item.destination : item.start_point
    if (route && item.route !== route) return false
    if (category && item.category !== category) return false
    if (point && displayPoint !== point) return false
    return true
  }), [selectedPlanSchedules, direction, route, category, point])

  const filteredTasks = useMemo(() => todayTasks.filter((task) => {
    const displayPoint = direction === 'origin' ? task.destination : task.start_point
    const schedule = task.schedule_id ? scheduleById.get(task.schedule_id) : null
    if (point && displayPoint !== point) return false
    if (route && (schedule?.route ?? '') !== route) return false
    if (category && schedule && schedule.category !== category) return false
    return true
  }), [todayTasks, direction, point, route, category, scheduleById])

  const summary = useMemo(() => ({
    unassigned: filteredSchedules.filter((item) => !taskBySchedule[item.schedule_id]).length,
    assigned: filteredSchedules.filter((item) => taskBySchedule[item.schedule_id]?.status !== 'Canceled').length,
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

  const planHubs = useMemo(() => {
    const groups = new Map<string, Schedule[]>()
    for (const item of filteredSchedules) {
      const key = item.schedule_hub_id || 'Tanpa Hub'
      groups.set(key, [...(groups.get(key) ?? []), item])
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [filteredSchedules])

  const liveHubs = useMemo(() => {
    const groups = new Map<string, Task[]>()
    for (const task of filteredTasks) {
      const schedule = task.schedule_id ? scheduleById.get(task.schedule_id) : null
      const key = schedule?.schedule_hub_id || 'Tanpa Hub'
      groups.set(key, [...(groups.get(key) ?? []), task])
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [filteredTasks, scheduleById])

  function renderPlanTable(items: Schedule[]) {
    const rows = new Map<string, Schedule[]>()
    for (const item of items) {
      const row = direction === 'origin' ? item.destination : item.start_point
      rows.set(row, [...(rows.get(row) ?? []), item])
    }

    const sortedRows = [...rows.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    return (
      <div className="schedule-grid-scroll">
        <table className="schedule-grid-table">
          <thead>
            <tr>
              <th>{direction === 'origin' ? 'Destination' : 'Start Point'}</th>
              {Array.from({ length: 24 }, (_, hour) => <th key={hour}>{String(hour).padStart(2, '0')}</th>)}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(([row, rowItems]) => (
              <tr key={row}>
                <th>{row}</th>
                {Array.from({ length: 24 }, (_, hour) => {
                  const cellItems = rowItems
                    .filter((item) => hourValue(item.std) === hour)
                    .sort((a, b) => (minutesValue(a.std) ?? 0) - (minutesValue(b.std) ?? 0))

                  return (
                    <td key={hour}>
                      <div className="schedule-grid-cell">
                        {cellItems.map((item) => {
                          const task = taskBySchedule[item.schedule_id]
                          return (
                            <span
                              key={item.schedule_id}
                              className={`schedule-trip ${task ? statusClass(task.status) : 'unassigned'} ${!summaryMatch(task) ? 'faded' : ''}`}
                              title={`STD ${timeValue(item.std)} · Trip ${item.trip} · ${item.route} · ${item.category}`}
                            >
                              {timeValue(item.std)}
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

    const sortedRows = [...rows.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    return (
      <div className="schedule-grid-scroll">
        <table className="schedule-grid-table">
          <thead>
            <tr>
              <th>{direction === 'origin' ? 'Destination' : 'Start Point'}</th>
              {Array.from({ length: 24 }, (_, hour) => <th key={hour}>{String(hour).padStart(2, '0')}</th>)}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(([row, rowItems]) => (
              <tr key={row}>
                <th>{row}</th>
                {Array.from({ length: 24 }, (_, hour) => {
                  const cellItems = rowItems
                    .filter((item) => hourValue(item.std) === hour)
                    .sort((a, b) => (minutesValue(a.std) ?? 0) - (minutesValue(b.std) ?? 0))

                  return (
                    <td key={hour}>
                      <div className="schedule-grid-cell">
                        {cellItems.map((item) => (
                          <span
                            key={item.transaction_id}
                            className={`schedule-trip live-item ${statusClass(item.status)} ${summaryFilter !== 'all' && !summaryMatch(item) ? 'faded' : ''}`}
                            title={`${item.transaction_id} · STD ${timeValue(item.std)}`}
                          >
                            {timeValue(item.std)}
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
      {view === 'database' ? (
        <div className="schedule-day-row">
          {DAYS.map((day) => (
            <button
              key={day.value}
              type="button"
              className={selectedDay === day.value ? 'active' : ''}
              onClick={() => {
                setSelectedDay(day.value)
                setPoint('')
                setSummaryFilter('all')
              }}
            >
              {day.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="schedule-toolbar">
        <div className="schedule-direction">
          <button type="button" className={direction === 'origin' ? 'active' : ''} onClick={() => { setDirection('origin'); setPoint('') }}>AS Start Point</button>
          <button type="button" className={direction === 'destination' ? 'active' : ''} onClick={() => { setDirection('destination'); setPoint('') }}>AS Destination</button>
        </div>

        <div className="schedule-category-buttons">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={category === item ? 'active' : ''}
              onClick={() => { setCategory(item); setSummaryFilter('all') }}
            >
              {item}
            </button>
          ))}
        </div>

        <select value={point} onChange={(e) => setPoint(e.target.value)}>
          <option value="">{direction === 'origin' ? 'Destination' : 'Start Point'}</option>
          {options.points.map((item) => <option key={item}>{item}</option>)}
        </select>

        <select value={route} onChange={(e) => setRoute(e.target.value)}>
          <option value="">Rute</option>
          {options.routes.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>

      <div className="schedule-summary-inline">
        <button type="button" className={summaryFilter === 'unassigned' ? 'active' : ''} onClick={() => setSummaryFilter(summaryFilter === 'unassigned' ? 'all' : 'unassigned')}>Belum ditugaskan <b>{summaries.unassigned}</b></button>
        <button type="button" className={summaryFilter === 'assigned' ? 'active' : ''} onClick={() => setSummaryFilter(summaryFilter === 'assigned' ? 'all' : 'assigned')}>Sudah ditugaskan <b>{summaries.assigned}</b></button>
        <button type="button" className={summaryFilter === 'canceled' ? 'active' : ''} onClick={() => setSummaryFilter(summaryFilter === 'canceled' ? 'all' : 'canceled')}>Dibatalkan <b>{summaries.canceled}</b></button>
      </div>

      <section className="schedule-grid-shell">
        {hubs.map(([hubName, items], index) => (
          <details className="schedule-hub" key={hubName}>
            <summary>
              <span>Hub {direction === 'origin' ? 'Start Point' : 'Destination'}</span>
              <b>{hubName}</b>
              <small>{items.length} {view === 'database' ? 'schedule' : 'assignment'}</small>
            </summary>
            {view === 'database' ? renderPlanTable(items as Schedule[]) : renderLiveTable(items as Task[])}
          </details>
        ))}
        {!hubs.length ? <div className="schedule-empty">Belum ada schedule yang cocok.</div> : null}
      </section>

      <div className="schedule-date">
        {view === 'live' ? 'Live date' : 'Schedule date'} · {view === 'live' ? date : DAYS.find((day) => day.value === selectedDay)?.label}
      </div>
    </div>
  )
}
