'use client'

import { useMemo, useState } from 'react'\nimport type { CSSProperties } from 'react'

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

const routeLabels: Record<string, string> = {
  Interhub: 'Interhub',
  Transit: 'Transit',
  Direct: 'Direct',
}

const scheduleDensityPalette = [
  { background: '#f0f2f4', color: '#697789', border: '#e1e5e9' },
  { background: '#fff1c7', color: '#9a721f', border: '#f3dda0' },
  { background: '#dff1f7', color: '#34778b', border: '#c5e4ed' },
  { background: '#ebe4ff', color: '#6b55a5', border: '#ddd1fa' },
  { background: '#e2f4e9', color: '#397957', border: '#cce7d7' },
  { background: '#ffe3e5', color: '#a05259', border: '#f5c9cd' },
]

function scheduleDensityStyle(total: number) {
  const paletteIndex = Math.min(Math.max(total, 1), scheduleDensityPalette.length) - 1
  const palette = scheduleDensityPalette[paletteIndex]

  return {
    '--density-background': palette.background,
    '--density-color': palette.color,
    '--density-border': palette.border,
  } as CSSProperties
}

function renderScheduleDensityLegend() {
  return (
    <div className="schedule-density-legend" aria-label="Keterangan jumlah schedule">
      <span className="schedule-density-legend-title">Jumlah schedule</span>
      {scheduleDensityPalette.map((_, index) => {
        const count = index + 1
        return (
          <span key={count} className="schedule-density-legend-item">
            <i style={scheduleDensityStyle(count)} />
            {count === scheduleDensityPalette.length ? '6+' : count}
          </span>
        )
      })}
    </div>
  )
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
  const [direction, setDirection] = useState<'start-point' | 'destination'>('start-point')
  const [route, setRoute] = useState('Interhub')
  const [category, setCategory] = useState('Normal')
  const [point, setPoint] = useState('')
  const [previewSchedules, setPreviewSchedules] = useState<Schedule[]>([])

  const scheduleById = useMemo(
    () => new Map(schedules.map((item) => [item.schedule_id, item])),
    [schedules],
  )

  const categories = useMemo(() => {
    const unique = [...new Set(schedules.map((item) => item.category).filter(Boolean))]
    return unique.sort((a, b) => (a === 'Normal' ? -1 : b === 'Normal' ? 1 : a.localeCompare(b)))
  }, [schedules])

  const routes = useMemo(() => {
    const unique = [...new Set(schedules.map((item) => item.route).filter(Boolean))]
    const order = ['Interhub', 'Transit', 'Direct']
    return unique.sort((a, b) => {
      const ai = order.indexOf(a)
      const bi = order.indexOf(b)
      if (ai === -1 && bi === -1) return a.localeCompare(b)
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })
  }, [schedules])

  const selectedPlanSchedules = useMemo(
    () => schedules.filter((item) => item.schedule_day === selectedDay),
    [schedules, selectedDay],
  )

  const pointOptions = useMemo(() => {
    const source = view === 'database' ? selectedPlanSchedules : schedules
    const values = direction === 'start-point'
      ? source.map((item) => item.start_point)
      : source.map((item) => item.destination)
    return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))
  }, [selectedPlanSchedules, schedules, view, direction])

  const filteredSchedules = useMemo(() => selectedPlanSchedules.filter((item) => {
    const filterPoint = direction === 'start-point' ? item.start_point : item.destination
    if (route && item.route !== route) return false
    if (category && item.category !== category) return false
    if (point && filterPoint !== point) return false
    return true
  }), [selectedPlanSchedules, direction, route, category, point])

  const filteredTasks = useMemo(() => todayTasks.filter((task) => {
    const filterPoint = direction === 'start-point' ? task.start_point : task.destination
    const schedule = task.schedule_id ? scheduleById.get(task.schedule_id) : null
    if (route && schedule && schedule.route !== route) return false
    if (category && schedule && schedule.category !== category) return false
    if (point && filterPoint !== point) return false
    return true
  }), [todayTasks, direction, route, category, point, scheduleById])

  function openSchedulePreview(items: Schedule[]) {
    if (!items.length) return
    setPreviewSchedules(items)
  }

  function closeSchedulePreview() {
    setPreviewSchedules([])
  }

  function renderPlanTable(items: Schedule[]) {
    const rows = new Map<string, Schedule[]>()
    for (const item of items) {
      const row = direction === 'start-point' ? item.destination : item.start_point
      rows.set(row, [...(rows.get(row) ?? []), item])
    }

    const sortedRows = [...rows.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    const columnTotals = Array.from({ length: 24 }, (_, hour) =>
      items.filter((item) => hourValue(item.std) === hour),
    )

    return (
      <div className="schedule-grid-scroll">
        <table className="schedule-grid-table">
          <thead>
            <tr>
              <th style={{ background: '#e7edf5', color: '#627287' }}>
                {direction === 'start-point' ? 'Destination' : 'Start Point'}
              </th>
              {columnTotals.map((hourItems, hour) => (
                <th key={hour} style={{ background: '#e7edf5', color: '#627287' }}>
                  {String(hour).padStart(2, '0')}
                </th>
              ))}
              <th className="schedule-total-header" style={{ background: '#e7edf5', color: '#627287' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(([row, rowItems]) => (
              <tr key={row}>
                <th style={{ background: '#f1f5f9', color: '#617187' }}>{row}</th>
                {columnTotals.map((_, hour) => {
                  const cellItems = rowItems
                    .filter((item) => hourValue(item.std) === hour)
                    .sort((a, b) => (minutesValue(a.std) ?? 0) - (minutesValue(b.std) ?? 0))

                  if (!cellItems.length) return <td key={hour} />

                  const first = cellItems[0]
                  const total = cellItems.length

                  return (
                    <td key={hour}>
                      <button type="button" className="schedule-cell-button" style={scheduleDensityStyle(total)} onClick={() => openSchedulePreview(cellItems)} title={"Lihat " + total + " schedule · " + timeValue(first.std)}>
                        {timeValue(first.std)}
                      </button>
                    </td>
                  )
                })}
                <td className="schedule-total-cell">
                  <button type="button" className="schedule-total-button" onClick={() => openSchedulePreview(rowItems)}>
                    {rowItems.length}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th className="schedule-total-label">Total</th>
              {columnTotals.map((hourItems, hour) => (
                <td key={hour} className="schedule-total-cell">
                  <button
                    type="button"
                    className="schedule-total-button"
                    onClick={() => openSchedulePreview(hourItems)}
                    aria-label={`Lihat total schedule jam ${String(hour).padStart(2, '0')}: ${hourItems.length}`}
                  >
                    {hourItems.length}
                  </button>
                </td>
              ))}
              <td className="schedule-total-cell schedule-grand-total">
                <button type="button" className="schedule-total-button" onClick={() => openSchedulePreview(items)}>
                  {items.length}
                </button>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    )
  }

  function renderLiveTable(items: Task[]) {
    const rows = new Map<string, Task[]>()
    for (const item of items) {
      const row = direction === 'start-point' ? (item.destination ?? '-') : (item.start_point ?? '-')
      rows.set(row, [...(rows.get(row) ?? []), item])
    }

    const sortedRows = [...rows.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    const columnTotals = Array.from({ length: 24 }, (_, hour) =>
      items.filter((item) => hourValue(item.std) === hour),
    )

    const toPreviewSchedule = (item: Task): Schedule => ({
      schedule_id: item.schedule_id ?? item.transaction_id,
      trip: 0, route: '', category: '',
      start_point: item.start_point ?? '-', start_point_type: '',
      destination: item.destination ?? '-', destination_type: '',
      schedule_day: todayDay, schedule_day_name: '',
      std: item.std ?? '', sta: item.sta ?? '',
    })

    return (
      <div className="schedule-grid-scroll">
        <table className="schedule-grid-table">
          <thead>
            <tr>
              <th style={{ background: '#e7edf5', color: '#627287' }}>
                {direction === 'start-point' ? 'Start Point' : 'Destination'}
              </th>
              {columnTotals.map((hourItems, hour) => (
                <th key={hour} style={{ background: '#e7edf5', color: '#627287' }}>
                  {String(hour).padStart(2, '0')}
                </th>
              ))}
              <th className="schedule-total-header" style={{ background: '#e7edf5', color: '#627287' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(([row, rowItems]) => (
              <tr key={row}>
                <th style={{ background: '#f1f5f9', color: '#617187' }}>{row}</th>
                {columnTotals.map((_, hour) => {
                  const cellItems = rowItems.filter((item) => hourValue(item.std) === hour).sort((a, b) => (minutesValue(a.std) ?? 0) - (minutesValue(b.std) ?? 0))
                  if (!cellItems.length) return <td key={hour} />
                  const first = cellItems[0]
                  const total = cellItems.length
                  return (
                    <td key={hour}>
                      <button type="button" className="schedule-cell-button" style={scheduleDensityStyle(total)} onClick={() => openSchedulePreview(cellItems.map(toPreviewSchedule))} title={"Lihat " + total + " schedule · " + timeValue(first.std)}>
                        {timeValue(first.std)}
                      </button>
                    </td>
                  )
                })}
                <td className="schedule-total-cell">
                  <button type="button" className="schedule-total-button" onClick={() => openSchedulePreview(rowItems.map(toPreviewSchedule))}>
                    {rowItems.length}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th className="schedule-total-label">Total</th>
              {columnTotals.map((hourItems, hour) => (
                <td key={hour} className="schedule-total-cell">
                  <button
                    type="button"
                    className="schedule-total-button"
                    onClick={() => openSchedulePreview(hourItems.map(toPreviewSchedule))}
                    aria-label={`Lihat total schedule jam ${String(hour).padStart(2, '0')}: ${hourItems.length}`}
                  >
                    {hourItems.length}
                  </button>
                </td>
              ))}
              <td className="schedule-total-cell schedule-grand-total">
                <button type="button" className="schedule-total-button" onClick={() => openSchedulePreview(items.map(toPreviewSchedule))}>
                  {items.length}
                </button>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    )
  }

  const activeRows = view === 'database' ? filteredSchedules : filteredTasks

  return (
    <div className={`schedule-page schedule-view-${view}`}>
      <div className="schedule-control-compact">
        <div className="schedule-filter-top">
          <div className="schedule-control-field schedule-mode-field">
            <span className="schedule-control-label">Mode</span>
            <div className="schedule-direction">
              <button
                type="button"
                className={direction === 'start-point' ? 'active' : ''}
                onClick={() => { setDirection('start-point'); setPoint('') }}
              >
                Start Point
              </button>
              <button
                type="button"
                className={direction === 'destination' ? 'active' : ''}
                onClick={() => { setDirection('destination'); setPoint('') }}
              >
                Destination
              </button>
            </div>
          </div>

          <div className="schedule-control-field schedule-day-field">
            <span className="schedule-control-label">Hari</span>
            <div className="schedule-day-row">
              {DAYS.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  disabled={view === 'live' && day.value !== todayDay}
                  className={selectedDay === day.value ? 'active' : ''}
                  onClick={() => {
                    if (view === 'live') return
                    setSelectedDay(day.value)
                    setPoint('')
                  }}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          <div className="schedule-control-field schedule-category-field">
            <span className="schedule-control-label">Category</span>
            <div className="schedule-category-buttons">
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={category === item ? 'active' : ''}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="schedule-point-card">
          <span className="schedule-control-label">
            {direction === 'start-point' ? 'Start Point' : 'Destination'}
          </span>
          <div className="schedule-point-tabs" aria-label={direction === 'start-point' ? 'Filter Start Point' : 'Filter Destination'}>
            <button
              type="button"
              className={!point ? 'active' : ''}
              onClick={() => setPoint('')}
            >
              Semua
            </button>
            {pointOptions.map((item) => (
              <button
                key={item}
                type="button"
                className={point === item ? 'active' : ''}
                onClick={() => setPoint(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="schedule-route-tabs schedule-route-tabs-standalone">
          {routes.map((item) => (
            <button
              key={item}
              type="button"
              className={route === item ? 'active' : ''}
              onClick={() => setRoute(item)}
            >
              {routeLabels[item] ?? item}
            </button>
          ))}
        </div>
      </div>

      <section className="schedule-grid-shell">
        <div className="schedule-grid-header">
          <span>Schedule</span>
          {renderScheduleDensityLegend()}
        </div>
        {view === 'database' ? renderPlanTable(activeRows as Schedule[]) : renderLiveTable(activeRows as Task[])}
        {!activeRows.length ? <div className="schedule-empty">Belum ada schedule yang cocok.</div> : null}
      </section>
      {previewSchedules.length ? (
        <div className="schedule-preview-backdrop" role="presentation" onMouseDown={closeSchedulePreview}>
          <div className="schedule-preview-modal" role="dialog" aria-modal="true" aria-label="Preview schedule" onMouseDown={(event) => event.stopPropagation()}>
            <div className="schedule-preview-heading">
              <div>
                <h2>Preview Schedule</h2>
                <p>{previewSchedules.length} schedule dipilih</p>
              </div>
              <button type="button" className="schedule-preview-close" onClick={closeSchedulePreview} aria-label="Tutup">×</button>
            </div>
            <div className="schedule-preview-list">
              {previewSchedules.map((item, index) => (
                <div className="schedule-preview-item" key={item.schedule_id + "-" + index}>
                  <div><span>Schedule ID</span><strong>{item.schedule_id}</strong></div>
                  <div><span>Start Point</span><strong>{item.start_point || '-'}</strong></div>
                  <div><span>Destination</span><strong>{item.destination || '-'}</strong></div>
                  <div><span>STD</span><strong>{timeValue(item.std)}</strong></div>
                  <div><span>STA</span><strong>{timeValue(item.sta)}</strong></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
