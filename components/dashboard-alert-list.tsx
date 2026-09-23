'use client'

import { useEffect, useMemo, useState } from 'react'

type TaskAlert = {
  kind: 'unassigned' | 'assigned'
  scheduleId: string
  transactionId?: string
  status?: string
  startPoint: string | null
  destination: string | null
  std: string | null
  sta: string | null
  targetAt: string
  driverName: string | null
  fleetPlat: string | null
  scheduleHubId: string | null
}

type TicketAlert = {
  transaction_id: string
  status: string
  created_at: string
  accepted_at: string | null
  in_progress_at: string | null
  location: string | null
  maintenance_list: string | null
}

function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remaining = seconds % 60
  const clock = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
  return days > 0 ? `${days} hari ${clock}` : clock
}

function maintenanceBaseAt(maintenance: TicketAlert) {
  if (maintenance.status === 'Confirmed') return maintenance.accepted_at ? new Date(maintenance.accepted_at).getTime() : null
  if (maintenance.status === 'In Progress') return maintenance.in_progress_at ? new Date(maintenance.in_progress_at).getTime() : null
  return new Date(maintenance.created_at).getTime()
}

function maintenanceThresholdSeconds(status: string) {
  if (status === 'Confirmed') return 24 * 60 * 60
  if (status === 'In Progress') return 3 * 24 * 60 * 60
  return 3 * 60 * 60
}

function maintenanceStatusLabel(status: string) {
  const labels: Record<string, string> = {
    Requested: 'Dibuat',
    Confirmed: 'Dikonfirmasi',
    'In Progress': 'Sedang dikerjakan',
  }
  return labels[status] ?? status
}

function taskDetail(alert: TaskAlert, now: number) {
  const target = new Date(alert.targetAt).getTime()
  const threshold = alert.kind === 'unassigned' ? 30 * 60 * 1000 : 10 * 60 * 1000
  const countdown = target - now
  return {
    ...alert,
    startPoint: alert.startPoint ?? '-',
    destination: alert.destination ?? '-',
    std: alert.std ?? '-',
    sta: alert.sta ?? '-',
    label: countdown > 0 ? 'Sisa waktu' : 'Lewat',
    time: formatDuration(Math.abs(countdown) / 1000),
    late: countdown <= 0,
    inWindow: now >= target - threshold,
  }
}

export default function DashboardAlertList({
  taskAlerts,
  ticketAlerts,
  mode = 'all',
}: {
  taskAlerts?: TaskAlert[]
  ticketAlerts?: TicketAlert[]
  mode?: 'all' | 'task' | 'ticket'
}) {
  const taskAlertRows = taskAlerts ?? []
  const ticketAlertRows = ticketAlerts ?? []
  const [now, setNow] = useState(() => Date.now())
  const [activeTaskHub, setActiveTaskHub] = useState('')
  const [activeTicketLocation, setActiveTicketLocation] = useState('')

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const taskItems = useMemo(
    () => taskAlertRows.map((alert) => taskDetail(alert, now)).filter((item) => item.inWindow),
    [taskAlertRows, now],
  )

  const ticketItems = useMemo(
    () => ticketAlertRows.map((ticket) => {
      const base = maintenanceBaseAt(ticket)
      if (base === null) return null
      const thresholdSeconds = maintenanceThresholdSeconds(ticket.status)
      const elapsed = (now - base) / 1000
      return {
        transactionId: ticket.transaction_id,
        status: maintenanceStatusLabel(ticket.status),
        label: elapsed < thresholdSeconds ? 'Sisa waktu' : 'Lewat',
        indicator: formatDuration(Math.abs(thresholdSeconds - elapsed)),
        late: elapsed >= thresholdSeconds,
        threshold: ticket.status === 'Requested' ? '3 jam' : ticket.status === 'Confirmed' ? '1 hari' : '3 hari',
        location: ticket.location ?? 'Lokasi tidak tersedia',
        maintenance: ticket.maintenance_list ?? 'Maintenance tidak tersedia',
      }
    }).filter((item): item is NonNullable<typeof item> => item !== null),
    [ticketAlertRows, now],
  )

  const lateTaskCount = taskItems.filter((item) => item.late).length
  const lateTicketCount = ticketItems.filter((item) => item.late).length
  const showTasks = mode !== 'ticket'
  const showTickets = mode !== 'task'
  const totalAlerts = (showTasks ? taskItems.length : 0) + (showTickets ? ticketItems.length : 0)
  const lateCount = (showTasks ? lateTaskCount : 0) + (showTickets ? lateTicketCount : 0)
  const heroTitle = mode === 'task' ? 'Alert Penugasan' : mode === 'ticket' ? 'Alert Maintenance' : 'Alert'
  const heroEyebrow = mode === 'task' ? 'Penugasan' : mode === 'ticket' ? 'Maintenance' : 'Monitoring'
  const heroDescription = mode === 'task'
    ? 'Pantau schedule yang mendekati atau melewati batas waktu penugasan.'
    : mode === 'ticket'
      ? 'Pantau maintenance yang belum bergerak sesuai batas waktu proses.'
      : 'Pantau kondisi operasional yang membutuhkan perhatian.'

  const taskGroups = useMemo(() => {
    const groups = new Map<string, typeof taskItems>()
    for (const item of taskItems) {
      const hub = item.scheduleHubId || 'Hub tidak tersedia'
      groups.set(hub, [...(groups.get(hub) ?? []), item])
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [taskItems])

  const ticketGroups = useMemo(() => {
    const groups = new Map<string, typeof ticketItems>()
    for (const item of ticketItems) {
      groups.set(item.location, [...(groups.get(item.location) ?? []), item])
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [ticketItems])

  return (
    <div className="alert-dashboard">
      <div className="super-dashboard-heading alert-content-heading">
        <div>
          <span className="eyebrow">{heroEyebrow}</span>
          <h1>{heroTitle}</h1>
          <p>{heroDescription} {totalAlerts} kondisi aktif{lateCount ? ` · ${lateCount} melewati batas` : ''}.</p>
        </div>
      </div>

      {showTasks ? (
        <section className="alert-content-section">
          {taskGroups.length ? (() => {
            const activeHub = taskGroups.some(([hub]) => hub === activeTaskHub) ? activeTaskHub : taskGroups[0][0]
            const activeItems = taskGroups.find(([hub]) => hub === activeHub)?.[1] ?? []
            const late = activeItems.filter((item) => item.late).length
            const approaching = activeItems.length - late
            return (
              <div className="alert-hub-tabs">
                <div className="alert-hub-tabs-list" role="tablist" aria-label="Schedule Hub">
                  {taskGroups.map(([hub, items]) => {
                    const tabId = `task-hub-${hub.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase()}`
                    const active = hub === activeHub
                    return (
                      <button
                        key={hub}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        aria-controls={tabId}
                        className={`alert-hub-tab${active ? ' is-active' : ''}`}
                        onClick={() => setActiveTaskHub(hub)}
                      >
                        <span>{hub}</span>
                        <small>{items.length} schedule</small>
                      </button>
                    )
                  })}
                </div>

                <div className="alert-hub-summary">
                  <div>
                    <span>Schedule Hub</span>
                    <h2>{activeHub}</h2>
                  </div>
                  <div className="alert-hub-summary-stat">
                    <strong>{activeItems.length}</strong>
                    <span>schedule</span>
                  </div>
                  <div className="alert-hub-summary-stat">
                    <strong>{approaching}</strong>
                    <span>mendekati batas</span>
                  </div>
                  <div className="alert-hub-summary-stat">
                    <strong>{late}</strong>
                    <span>melewati batas</span>
                  </div>
                </div>

                <div id={`task-hub-${activeHub.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase()}`} role="tabpanel" className="alert-table-scroll">
                <table className="alert-table alert-group-table task-alert-group-table">
                  <thead>
                    <tr>
                      <th>Schedule</th>
                      <th>Status</th>
                      <th>Driver</th>
                      <th>Armada</th>
                      <th>Rute</th>
                      <th>STD</th>
                      <th>STA</th>
                      <th>Target</th>
                      <th>Waktu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeItems.map((item) => (
                      <tr key={`${item.scheduleId}-${item.transactionId ?? 'schedule'}`} className={item.late ? 'is-alert-late' : ''}>
                        <td><strong>{item.scheduleId}</strong>{item.transactionId ? <small>{item.transactionId}</small> : null}</td>
                        <td>
                          <span className={`alert-kind-badge ${item.kind}`}>{item.kind === 'unassigned' ? 'Belum ditugaskan' : 'Sudah ditugaskan'}</span>
                          <small className="alert-context">{item.kind === 'unassigned' ? 'Schedule belum punya penugasan' : 'Melewati batas STA'}</small>
                        </td>
                        <td>{item.driverName ?? 'Belum ada driver'}</td>
                        <td>{item.fleetPlat ?? '-'}</td>
                        <td>{item.startPoint} → {item.destination}</td>
                        <td>{item.std}</td>
                        <td>{item.sta}</td>
                        <td>{item.label}</td>
                        <td><b className={item.late ? 'is-late' : ''}>{item.time}</b></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                </div>
              </div>
            )
          })() : (
            <div className="alert-empty-inline">Tidak ada alert tugas saat ini.</div>
          )}
        </section>
      ) : null}

      {showTickets ? (
        <section className="alert-content-section">
          {ticketGroups.length ? (() => {
            const activeLocation = ticketGroups.some(([location]) => location === activeTicketLocation) ? activeTicketLocation : ticketGroups[0][0]
            const activeItems = ticketGroups.find(([location]) => location === activeLocation)?.[1] ?? []
            const late = activeItems.filter((item) => item.late).length
            const approaching = activeItems.length - late
            return (
              <div className="alert-hub-tabs">
                <div className="alert-hub-tabs-list" role="tablist" aria-label="Lokasi Maintenance">
                  {ticketGroups.map(([location, items]) => {
                    const tabId = `maintenance-location-${location.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase()}`
                    const active = location === activeLocation
                    return (
                      <button
                        key={location}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        aria-controls={tabId}
                        className={`alert-hub-tab${active ? ' is-active' : ''}`}
                        onClick={() => setActiveTicketLocation(location)}
                      >
                        <span>{location}</span>
                        <small>{items.length} maintenance</small>
                      </button>
                    )
                  })}
                </div>

                <div className="alert-hub-summary">
                  <div>
                    <span>Lokasi</span>
                    <h2>{activeLocation}</h2>
                  </div>
                  <div className="alert-hub-summary-stat">
                    <strong>{activeItems.length}</strong>
                    <span>maintenance</span>
                  </div>
                  <div className="alert-hub-summary-stat">
                    <strong>{approaching}</strong>
                    <span>mendekati batas</span>
                  </div>
                  <div className="alert-hub-summary-stat">
                    <strong>{late}</strong>
                    <span>melewati batas</span>
                  </div>
                </div>

                <div id={`maintenance-location-${activeLocation.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase()}`} role="tabpanel" className="alert-table-scroll">
                <table className="alert-table alert-group-table maintenance-alert-group-table">
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>Maintenance</th>
                      <th>Status</th>
                      <th>Batas</th>
                      <th>Waktu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeItems.map((item) => (
                      <tr key={item.transactionId} className={item.late ? 'is-alert-late' : ''}>
                        <td><strong>{item.transactionId}</strong></td>
                        <td>{item.maintenance}</td>
                        <td><span className="alert-kind-badge maintenance">{item.status}</span></td>
                        <td>{item.threshold}</td>
                        <td><b className={item.late ? 'is-late' : ''}>{item.label} · {item.indicator}</b></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                </div>
              </div>
            )
          })() : (
            <div className="alert-empty-inline">Tidak ada alert maintenance saat ini.</div>
          )}
        </section>
      ) : null}
    </div>
  )
}
