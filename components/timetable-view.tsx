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

function timeValue(value: string | null) {
  const minutes = minutesValue(value)
  return minutes === null ? '-' : `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function statusClass(status: string | undefined) {
  return status ? `status-${status.toLowerCase().replaceAll(' ', '-')}` : ''
}

function layoutTimelineItems<T>(items: T[], getMinutes: (item: T) => number | null) {
  const laneEnds: number[] = []
  const positioned: Array<{ item: T; lane: number }> = []
  for (const item of [...items].sort((a, b) => (getMinutes(a) ?? 9999) - (getMinutes(b) ?? 9999))) {
    const start = getMinutes(item) ?? 0
    let lane = laneEnds.findIndex((end) => start >= end)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(start + 100)
    } else {
      laneEnds[lane] = start + 100
    }
    positioned.push({ item, lane })
  }
  return { positioned, laneCount: Math.max(1, laneEnds.length) }
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
    return true
  }).sort((a, b) => {
    const aTime = direction === 'origin' ? minutesValue(a.std) : minutesValue(a.sta)
    const bTime = direction === 'origin' ? minutesValue(b.std) : minutesValue(b.sta)
    return (aTime ?? 9999) - (bTime ?? 9999)
  }), [tasks, direction, point])

  const summary = useMemo(() => ({
    unassigned: filteredSchedules.filter((item) => !taskBySchedule[item.schedule_id]).length,
    assigned: filteredSchedules.filter((item) => {
      const task = taskBySchedule[item.schedule_id]
      return !!task && task.status !== 'Canceled'
    }).length,
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

  const scheduleGroups = useMemo(() => {
    const hubs = new Map<string, Schedule[]>()
    for (const item of filteredSchedules) {
      const key = item.schedule_hub_id || 'Tanpa Hub'
      hubs.set(key, [...(hubs.get(key) ?? []), item])
    }
    return [...hubs.entries()]
  }, [filteredSchedules])

  const liveGroups = useMemo(() => {
    const hubs = new Map<string, Task[]>()
    for (const task of filteredTasks) {
      const key = 'Live'
      hubs.set(key, [...(hubs.get(key) ?? []), task])
    }
    return [...hubs.entries()]
  }, [filteredTasks])

  function renderPlanRows(items: Schedule[]) {
    const rows = new Map<string, Schedule[]>()
    for (const item of items) {
      const key = direction === 'origin' ? item.destination : item.start_point
      rows.set(key, [...(rows.get(key) ?? []), item])
    }
    return [...rows.entries()].map(([label, rowItems]) => {
      const layout = layoutTimelineItems(rowItems, (item) => minutesValue(direction === 'origin' ? item.std : item.sta))
      const height = layout.laneCount * 82 + 8
      return (
        <div className="schedule-board-row" key={label}>
          <div className="schedule-board-label">{label}</div>
          <div className="schedule-board-track" style={{ minHeight: height }}>
            {Array.from({ length: 25 }, (_, hour) => <span className="schedule-board-line" key={hour} style={{ left: `${(hour / 24) * 100}%` }} />)}
            {layout.positioned.map(({ item, lane }) => {
              const task = taskBySchedule[item.schedule_id]
              const start = minutesValue(direction === 'origin' ? item.std : item.sta) ?? 0
              return (
                <div
                  className={`schedule-board-item ${task ? statusClass(task.status) : 'unassigned'} ${!summaryMatch(task) ? 'faded' : ''}`}
                  key={item.schedule_id}
                  style={{ left: `${(start / 1440) * 100}%`, top: lane * 82 + 5 }}
                  title={`${label} · ${timeValue(direction === 'origin' ? item.std : item.sta)}`}
                >
                  <b>{timeValue(direction === 'origin' ? item.std : item.sta)}</b>
                  <span>Trip {item.trip}</span>
                </div>
              )
            })}
          </div>
        </div>
      )
    })
  }

  function renderLiveRows(items: Task[]) {
    const rows = new Map<string, Task[]>()
    for (const task of items) {
      const key = direction === 'origin' ? (task.destination ?? '-') : (task.start_point ?? '-')
      rows.set(key, [...(rows.get(key) ?? []), task])
    }
    return [...rows.entries()].map(([label, rowItems]) => {
      const layout = layoutTimelineItems(rowItems, (task) => minutesValue(direction === 'origin' ? task.std : task.sta))
      const height = layout.laneCount * 82 + 8
      return (
        <div className="schedule-board-row" key={label}>
          <div className="schedule-board-label">{label}</div>
          <div className="schedule-board-track" style={{ minHeight: height }}>
            {Array.from({ length: 25 }, (_, hour) => <span className="schedule-board-line" key={hour} style={{ left: `${(hour / 24) * 100}%` }} />)}
            {layout.positioned.map(({ item, lane }) => {
              const start = minutesValue(direction === 'origin' ? item.std : item.sta) ?? 0
              return (
                <div
                  className={`schedule-board-item live-item ${statusClass(item.status)} ${summaryFilter !== 'all' && !summaryMatch(item) ? 'faded' : ''}`}
                  key={item.transaction_id}
                  style={{ left: `${(start / 1440) * 100}%`, top: lane * 82 + 5 }}
                  title={`${item.transaction_id} · ${label}`}
                >
                  <b>{timeValue(direction === 'origin' ? item.std : item.sta)}</b>
                  <span>{item.transaction_id}</span>
                </div>
              )
            })}
          </div>
        </div>
      )
    })
  }

  const summaries = view === 'database' ? summary : liveSummary

  return (
    <div className="schedule-page">
      <div className="schedule-view-tabs" role="tablist" aria-label="Tampilan schedule">
        <a className={view === 'database' ? 'active' : ''} href="/controller/timetable?view=plan">By Plan</a>
        <a className={view === 'live' ? 'active' : ''} href="/controller/timetable?view=live">Live Tracking</a>
      </div>

      <div className="schedule-toolbar">
        <div className="schedule-direction">
          <button className={direction === 'origin' ? 'active' : ''} onClick={() => { setDirection('origin'); setHub(''); setPoint('') }}>AS Origin</button>
          <button className={direction === 'destination' ? 'active' : ''} onClick={() => { setDirection('destination'); setHub(''); setPoint('') }}>AS Destination</button>
        </div>
        <select value={hub} onChange={(e) => setHub(e.target.value)}>
          <option value="">{direction === 'origin' ? 'Semua Hub Origin' : 'Semua Hub Destinasi'}</option>
          {options.hubs.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={point} onChange={(e) => setPoint(e.target.value)}>
          <option value="">{direction === 'origin' ? 'Semua Destinasi' : 'Semua Origin'}</option>
          {options.points.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={route} onChange={(e) => setRoute(e.target.value)}><option value="">Semua Rute</option>{options.routes.map((item) => <option key={item}>{item}</option>)}</select>
        <select value={category} onChange={(e) => setCategory(e.target.value)}><option value="">Semua Kategori</option>{options.categories.map((item) => <option key={item}>{item}</option>)}</select>
      </div>

      <div className="schedule-summary">
        <button className={summaryFilter === 'unassigned' ? 'active' : ''} onClick={() => setSummaryFilter(summaryFilter === 'unassigned' ? 'all' : 'unassigned')}><span>Belum ditugaskan</span><b>{summaries.unassigned}</b></button>
        <button className={summaryFilter === 'assigned' ? 'active' : ''} onClick={() => setSummaryFilter(summaryFilter === 'assigned' ? 'all' : 'assigned')}><span>Sudah ditugaskan</span><b>{summaries.assigned}</b></button>
        <button className={summaryFilter === 'canceled' ? 'active' : ''} onClick={() => setSummaryFilter(summaryFilter === 'canceled' ? 'all' : 'canceled')}><span>Dibatalkan</span><b>{summaries.canceled}</b></button>
      </div>

      <section className="schedule-board-shell">
        <div className="schedule-board-head">
          <div>{direction === 'origin' ? 'Destination' : 'Origin / Start Point'}</div>
          <div className="schedule-board-hours">{Array.from({ length: 24 }, (_, hour) => <span key={hour}>{String(hour).padStart(2, '0')}</span>)}</div>
        </div>

        {view === 'database' ? (
          scheduleGroups.map(([hubName, items], index) => (
            <details className="schedule-hub" key={hubName} open={index === 0}>
              <summary><span>Hub {direction === 'origin' ? 'Origin' : 'Destinasi'}</span><b>{hubName}</b><small>{items.length} schedule</small></summary>
              <div className="schedule-hub-body">{renderPlanRows(items)}</div>
            </details>
          ))
        ) : (
          liveGroups.map(([hubName, items]) => (
            <details className="schedule-hub" key={hubName} open>
              <summary><span>Live Tracking</span><b>{hubName}</b><small>{items.length} assignment</small></summary>
              <div className="schedule-hub-body">{renderLiveRows(items)}</div>
            </details>
          ))
        )}

        {view === 'database' && !scheduleGroups.length ? <div className="schedule-empty">Nggak ada schedule yang cocok.</div> : null}
        {view === 'live' && !liveGroups.length ? <div className="schedule-empty">Belum ada assignment untuk ditampilkan.</div> : null}
      </section>

      <div className="schedule-date">Schedule date · {date}</div>
    </div>
  )
}
