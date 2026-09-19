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
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null
  return hour * 60 + minute
}

function timeValue(value: string | null) {
  if (!value) return '-'
  const minutes = minutesValue(value)
  if (minutes === null) return '-'
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function statusClass(status: string | undefined) {
  if (!status) return ''
  return `status-${status.toLowerCase().replaceAll(' ', '-')}`
}

function layoutTimelineItems<T>(items: T[], getMinutes: (item: T) => number | null) {
  const laneEnds: number[] = []
  const positioned: Array<{ item: T; lane: number }> = []

  for (const item of [...items].sort((a, b) => (getMinutes(a) ?? 9999) - (getMinutes(b) ?? 9999))) {
    const start = getMinutes(item) ?? 0
    let lane = laneEnds.findIndex((end) => start >= end)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(start + 110)
    } else {
      laneEnds[lane] = start + 110
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
  const [view, setView] = useState<'database' | 'live'>(initialView)
  const [direction, setDirection] = useState<'origin' | 'destination'>('origin')
  const [route, setRoute] = useState('')
  const [category, setCategory] = useState('')
  const [originType, setOriginType] = useState('')
  const [origin, setOrigin] = useState('')
  const [destinationType, setDestinationType] = useState('')
  const [destination, setDestination] = useState('')
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>('all')

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
    if (direction === 'origin' && origin && task.start_point !== origin) return false
    if (direction === 'destination' && destination && task.destination !== destination) return false
    return true
  }).sort((a, b) => {
    const aTime = direction === 'origin' ? minutesValue(a.std) : minutesValue(a.sta)
    const bTime = direction === 'origin' ? minutesValue(b.std) : minutesValue(b.sta)
    return (aTime ?? 9999) - (bTime ?? 9999)
  }), [tasks, direction, origin, destination])

  const summary = useMemo(() => ({
    unassigned: filteredSchedules.filter((item) => !taskBySchedule[item.schedule_id]).length,
    assigned: filteredSchedules.filter((item) => {
      const task = taskBySchedule[item.schedule_id]
      return !!task && task.status !== 'Canceled'
    }).length,
    canceled: filteredSchedules.filter((item) => taskBySchedule[item.schedule_id]?.status === 'Canceled').length,
  }), [filteredSchedules, taskBySchedule])

  const summaryMatch = (task: Task | undefined) => {
    if (summaryFilter === 'all') return true
    if (summaryFilter === 'canceled') return task?.status === 'Canceled'
    if (summaryFilter === 'assigned') return !!task && task.status !== 'Canceled'
    return !task
  }

  const databaseGroups = useMemo(() => {
    const groups = new Map<string, Schedule[]>()
    for (const item of filteredSchedules) {
      const key = direction === 'origin' ? item.start_point : item.destination
      const items = groups.get(key) ?? []
      items.push(item)
      groups.set(key, items)
    }
    return [...groups.entries()]
  }, [filteredSchedules, direction])

  const liveSummary = useMemo(() => ({
    unassigned: 0,
    assigned: filteredTasks.filter((task) => task.status !== 'Canceled').length,
    canceled: filteredTasks.filter((task) => task.status === 'Canceled').length,
  }), [filteredTasks])

  const liveGroups = useMemo(() => {
    const groups = new Map<string, Task[]>()
    for (const task of filteredTasks) {
      const key = direction === 'origin' ? (task.start_point ?? '-') : (task.destination ?? '-')
      const items = groups.get(key) ?? []
      items.push(task)
      groups.set(key, items)
    }
    return [...groups.entries()]
  }, [filteredTasks, direction])

  return (
    <div>
      <div className="dashboard-tabs">
        <button className={view === 'database' ? 'dashboard-tab active' : 'dashboard-tab'} onClick={() => setView('database')}>Jadwal</button>
        <button className={view === 'live' ? 'dashboard-tab active' : 'dashboard-tab'} onClick={() => setView('live')}>Transaksi Berjalan</button>
      </div>

      {view === 'database' ? (
        <>
          <div className="dashboard-tabs">
            <button className={direction === 'origin' ? 'dashboard-tab active' : 'dashboard-tab'} onClick={() => setDirection('origin')}>Berdasarkan Titik Mulai</button>
            <button className={direction === 'destination' ? 'dashboard-tab active' : 'dashboard-tab'} onClick={() => setDirection('destination')}>Berdasarkan Destinasi</button>
          </div>

          <section className="metric-grid">
            <button className={`metric-card summary-filter ${summaryFilter === 'unassigned' ? 'selected' : ''}`} onClick={() => setSummaryFilter(summaryFilter === 'unassigned' ? 'all' : 'unassigned')}><span>Belum ditugaskan</span><strong>{summary.unassigned}</strong></button>
            <button className={`metric-card summary-filter ${summaryFilter === 'assigned' ? 'selected' : ''}`} onClick={() => setSummaryFilter(summaryFilter === 'assigned' ? 'all' : 'assigned')}><span>Sudah ditugaskan</span><strong>{summary.assigned}</strong></button>
            <button className={`metric-card summary-filter ${summaryFilter === 'canceled' ? 'selected' : ''}`} onClick={() => setSummaryFilter(summaryFilter === 'canceled' ? 'all' : 'canceled')}><span>Dibatalkan</span><strong>{summary.canceled}</strong></button>
          </section>

          <section className="section-block">
            <div className="data-form">
              <div className="form-row">
                <label>Rute<select value={route} onChange={(event) => setRoute(event.target.value)}><option value="">Semua</option>{options.routes.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label>Kategori<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Semua</option>{options.categories.map((item) => <option key={item}>{item}</option>)}</select></label>
              </div>
              {direction === 'origin' ? (
                <div className="form-row">
                  <label>Jenis Titik Mulai<select value={originType} onChange={(event) => setOriginType(event.target.value)}><option value="">Semua</option>{options.originTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
                  <label>Titik Mulai<select value={origin} onChange={(event) => setOrigin(event.target.value)}><option value="">Semua</option>{options.origins.map((item) => <option key={item}>{item}</option>)}</select></label>
                </div>
              ) : (
                <div className="form-row">
                  <label>Jenis Destinasi<select value={destinationType} onChange={(event) => setDestinationType(event.target.value)}><option value="">Semua</option>{options.destinationTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
                  <label>Destinasi<select value={destination} onChange={(event) => setDestination(event.target.value)}><option value="">Semua</option>{options.destinations.map((item) => <option key={item}>{item}</option>)}</select></label>
                </div>
              )}
            </div>
          </section>

          <section className="data-table-card section-block timetable-shell">
            <div className="section-heading"><div><h2>Rencana Jadwal</h2><p>{date}</p></div></div>
            <div className="timetable-scroll">
              <div className="timetable-grid">
                <div className="timetable-axis-label">{direction === 'origin' ? 'Titik Mulai' : 'Destinasi'}</div>
                <div className="timetable-hours">{Array.from({ length: 24 }, (_, hour) => <span key={hour}>{String(hour).padStart(2, '0')}:00</span>)}</div>
                {databaseGroups.map(([group, items]) => {
                  const layout = layoutTimelineItems(items, (item) => minutesValue(direction === 'origin' ? item.std : item.sta))
                  return (
                  <div className="timetable-row" key={group} style={{ minHeight: `${layout.laneCount * 128 + 12}px` }}>
                    <div className="timetable-group">{group}</div>
                    <div className="timetable-track" style={{ minHeight: `${layout.laneCount * 128 + 12}px` }}>
                      {Array.from({ length: 25 }, (_, hour) => <span className="timetable-line" key={hour} style={{ left: `${(hour / 24) * 100}%` }} />)}
                      {layout.positioned.map(({ item, lane }) => {
                        const task = taskBySchedule[item.schedule_id]
                        const start = minutesValue(direction === 'origin' ? item.std : item.sta) ?? 0
                        const dimmed = !summaryMatch(task)
                        const left = `${(start / 1440) * 100}%`
                        return (
                          <div key={item.schedule_id} className={`timetable-item ${task ? statusClass(task.status) : 'unassigned'} ${dimmed ? 'faded' : ''}`} style={{ left, top: `${lane * 128 + 10}px` }}>
                            <div className="timetable-item-time">{direction === 'origin' ? timeValue(item.std) : timeValue(item.sta)}</div>
                            <strong>{item.trip}</strong>
                            <span>{direction === 'origin' ? item.destination : item.start_point}</span>
                            <small>{item.route} · {item.category}</small>
                            {task ? <details><summary>Lihat detail</summary><div>{task.transaction_id}<br />{task.executor_snapshot?.full_name ?? '-'} · {task.fleet_snapshot?.plat_number ?? '-'}</div></details> : <small>Belum ditugaskan</small>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  )
                })}
                {!databaseGroups.length ? <div className="empty-state">Nggak ada jadwal yang cocok dengan filter.</div> : null}
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="data-table-card section-block timetable-shell">
          <div className="dashboard-tabs">
            <button className={direction === 'origin' ? 'dashboard-tab active' : 'dashboard-tab'} onClick={() => setDirection('origin')}>Berdasarkan Titik Mulai</button>
            <button className={direction === 'destination' ? 'dashboard-tab active' : 'dashboard-tab'} onClick={() => setDirection('destination')}>Berdasarkan Destinasi</button>
          </div>
          <div className="section-heading"><div><h2>Jadwal Langsung</h2><p>Semua transaksi yang sudah dibuat atau ditugaskan.</p></div></div>
          <section className="metric-grid">
            <button className={`metric-card summary-filter ${summaryFilter === 'unassigned' ? 'selected' : ''}`} onClick={() => setSummaryFilter(summaryFilter === 'unassigned' ? 'all' : 'unassigned')}><span>Belum ditugaskan</span><strong>{liveSummary.unassigned}</strong></button>
            <button className={`metric-card summary-filter ${summaryFilter === 'assigned' ? 'selected' : ''}`} onClick={() => setSummaryFilter(summaryFilter === 'assigned' ? 'all' : 'assigned')}><span>Sudah ditugaskan</span><strong>{liveSummary.assigned}</strong></button>
            <button className={`metric-card summary-filter ${summaryFilter === 'canceled' ? 'selected' : ''}`} onClick={() => setSummaryFilter(summaryFilter === 'canceled' ? 'all' : 'canceled')}><span>Dibatalkan</span><strong>{liveSummary.canceled}</strong></button>
          </section>
          <div className="timetable-scroll">
            <div className="timetable-grid">
              <div className="timetable-axis-label">{direction === 'origin' ? 'Titik Mulai' : 'Destination'}</div>
              <div className="timetable-hours">{Array.from({ length: 24 }, (_, hour) => <span key={hour}>{String(hour).padStart(2, '0')}:00</span>)}</div>
              {liveGroups.map(([group, items]) => {
                const layout = layoutTimelineItems(items, (task) => minutesValue(direction === 'origin' ? task.std : task.sta))
                return (
                <div className="timetable-row" key={group} style={{ minHeight: `${layout.laneCount * 128 + 12}px` }}>
                  <div className="timetable-group">{group}</div>
                  <div className="timetable-track" style={{ minHeight: `${layout.laneCount * 128 + 12}px` }}>
                    {Array.from({ length: 25 }, (_, hour) => <span className="timetable-line" key={hour} style={{ left: `${(hour / 24) * 100}%` }} />)}
                    {layout.positioned.map(({ item: task, lane }) => {
                      const start = minutesValue(direction === 'origin' ? task.std : task.sta)
                      const left = `${((start ?? 0) / 1440) * 100}%`
                      return (
                        <div className={`timetable-item live-item ${statusClass(task.status)} ${summaryFilter !== 'all' && !summaryMatch(task) ? 'faded' : ''}`} key={task.transaction_id} style={{ left, top: `${lane * 128 + 10}px` }}>
                          <div className="timetable-item-time">{direction === 'origin' ? timeValue(task.std) : timeValue(task.sta)}</div>
                          <strong>{task.transaction_id}</strong>
                          <span>{direction === 'origin' ? task.destination ?? '-' : task.start_point ?? '-'}</span>
                          <small>{task.source_type === 'Extra Schedule' ? 'Extra Schedule' : task.task_type} · {task.fleet_snapshot?.plat_number ?? '-'}</small>
                          <details><summary>Lihat detail</summary><div>{task.executor_snapshot?.full_name ?? task.executor_nik ?? '-'}</div></details>
                        </div>
                      )
                    })}
                  </div>
                </div>
              })}
              {!liveGroups.length ? <div className="empty-state">Belum ada jadwal langsung untuk sekarang.</div> : null}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
