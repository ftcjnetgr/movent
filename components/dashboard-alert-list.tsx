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
}

type TicketAlert = {
  transaction_id: string
  status: string
  created_at: string
  accepted_at: string | null
  in_progress_at: string | null
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

function ticketBaseAt(ticket: TicketAlert) {
  if (ticket.status === 'Confirmed') return ticket.accepted_at ? new Date(ticket.accepted_at).getTime() : null
  if (ticket.status === 'In Progress') return ticket.in_progress_at ? new Date(ticket.in_progress_at).getTime() : null
  return new Date(ticket.created_at).getTime()
}

function ticketThresholdSeconds(status: string) {
  if (status === 'Confirmed') return 24 * 60 * 60
  if (status === 'In Progress') return 3 * 24 * 60 * 60
  return 3 * 60 * 60
}

function ticketStatusLabel(status: string) {
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
      const base = ticketBaseAt(ticket)
      if (base === null) return null
      const thresholdSeconds = ticketThresholdSeconds(ticket.status)
      const elapsed = (now - base) / 1000
      return {
        transactionId: ticket.transaction_id,
        status: ticketStatusLabel(ticket.status),
        label: elapsed < thresholdSeconds ? 'Sisa waktu' : 'Lewat',
        indicator: formatDuration(Math.abs(thresholdSeconds - elapsed)),
        late: elapsed >= thresholdSeconds,
        threshold: ticket.status === 'Requested' ? '3 jam' : ticket.status === 'Confirmed' ? '1 hari' : '3 hari',
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

  return (
    <div className="alert-dashboard">
      <section className="alert-hero">
        <div>
          <span className="eyebrow">Pusat Perhatian Operasional</span>
          <h1>{heroTitle}</h1>
          <p>Semua kondisi yang membutuhkan perhatian operasional dikumpulkan di sini.</p>
        </div>
        <div className="alert-live">
          <span className="alert-live-dot" />
          <span>Live monitoring</span>
        </div>
      </section>

      {showTasks ? (
        <section className="alert-table-panel">
          <div className="alert-table-heading">
            <div>
              <span className="eyebrow">Penugasan</span>
              <h2>Alert Tugas</h2>
            </div>
            <strong>{taskItems.length}</strong>
          </div>
          <div className="table-wrap">
            <table className="alert-table">
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
                {taskItems.map((item) => (
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
                {!taskItems.length ? <tr><td colSpan={9}><div className="empty-state">Tidak ada alert tugas saat ini.</div></td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {showTickets ? (
        <section className="alert-table-panel">
          <div className="alert-table-heading">
            <div>
              <span className="eyebrow">Maintenance</span>
              <h2>Alert Maintenance</h2>
            </div>
            <strong>{ticketItems.length}</strong>
          </div>
          <div className="table-wrap">
            <table className="alert-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Status</th>
                  <th>Batas</th>
                  <th>Waktu</th>
                </tr>
              </thead>
              <tbody>
                {ticketItems.map((item) => (
                  <tr key={item.transactionId} className={item.late ? 'is-alert-late' : ''}>
                    <td><strong>{item.transactionId}</strong></td>
                    <td><span className="alert-kind-badge ticket">{item.status}</span></td>
                    <td>{item.threshold}</td>
                    <td><b className={item.late ? 'is-late' : ''}>{item.label} · {item.indicator}</b></td>
                  </tr>
                ))}
                {!ticketItems.length ? <tr><td colSpan={4}><div className="empty-state">Tidak ada alert maintenance saat ini.</div></td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  )
}
