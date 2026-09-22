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
}: {
  taskAlerts?: TaskAlert[]
  ticketAlerts?: TicketAlert[]
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
  const totalAlerts = taskItems.length + ticketItems.length
  const lateCount = lateTaskCount + lateTicketCount

  return (
    <div className="alert-dashboard">
      <section className="alert-hero">
        <div>
          <span className="eyebrow">Pusat Perhatian Operasional</span>
          <h1>Alert</h1>
          <p>Semua kondisi yang membutuhkan perhatian operasional dikumpulkan di sini.</p>
        </div>
        <div className="alert-live">
          <span className="alert-live-dot" />
          <span>Live monitoring</span>
        </div>
      </section>

      <section className="metric-grid alert-summary-grid alert-dashboard-summary">
        <div className="metric-card alert-summary-card alert-total">
          <span>Total Alert Aktif</span>
          <strong>{totalAlerts}</strong>
          <small>{lateCount} sudah melewati batas waktu</small>
        </div>
        <div className="metric-card alert-summary-card alert-task-summary">
          <span>Alert Tugas</span>
          <strong>{taskItems.length}</strong>
          <small>{lateTaskCount} sudah lewat target</small>
        </div>
        <div className="metric-card alert-summary-card alert-ticket-summary">
          <span>Alert Ticketing</span>
          <strong>{ticketItems.length}</strong>
          <small>{lateTicketCount} sudah lewat batas</small>
        </div>
      </section>

      <section className="alert-overview-grid">
        <div className="alert-panel">
          <div className="alert-panel-heading">
            <div>
              <span className="eyebrow">Penugasan</span>
              <h2>Alert Tugas</h2>
            </div>
            <strong>{taskItems.length}</strong>
          </div>

          <div className="alert-detail-list">
            {taskItems.map((item) => (
              <div className={`alert-detail-item ${item.late ? 'is-alert-late' : ''}`} key={`${item.scheduleId}-${item.transactionId ?? 'schedule'}`}>
                <div className="alert-detail-main">
                  <div className="alert-item-title">
                    <strong>{item.scheduleId}</strong>
                    <span className={`alert-kind-badge ${item.kind}`}>{item.kind === 'unassigned' ? 'Belum ditugaskan' : 'Sudah ditugaskan'}</span>
                  </div>
                  <span>{item.startPoint} → {item.destination}</span>
                  <small>STD {item.std} · STA {item.sta}{item.transactionId ? ` · ${item.transactionId}` : ''}</small>
                </div>
                <div className={`alert-detail-timer ${item.late ? 'is-late' : ''}`}>
                  <span>{item.label}</span>
                  <b>{item.time}</b>
                </div>
              </div>
            ))}
            {!taskItems.length ? <div className="empty-state">Tidak ada alert tugas saat ini.</div> : null}
          </div>
        </div>

        <div className="alert-panel">
          <div className="alert-panel-heading">
            <div>
              <span className="eyebrow">Maintenance</span>
              <h2>Alert Ticketing</h2>
            </div>
            <strong>{ticketItems.length}</strong>
          </div>

          <div className="alert-detail-list">
            {ticketItems.map((item) => (
              <div className={`alert-detail-item ${item.late ? 'is-alert-late' : ''}`} key={item.transactionId}>
                <div className="alert-detail-main">
                  <div className="alert-item-title">
                    <strong>{item.transactionId}</strong>
                    <span className="alert-kind-badge ticket">{item.status}</span>
                  </div>
                  <span>Batas perhatian: {item.threshold}</span>
                  <small>Ticket maintenance aktif</small>
                </div>
                <div className={`alert-detail-timer ${item.late ? 'is-late' : ''}`}>
                  <span>{item.label}</span>
                  <b>{item.indicator}</b>
                </div>
              </div>
            ))}
            {!ticketItems.length ? <div className="empty-state">Tidak ada alert ticketing saat ini.</div> : null}
          </div>
        </div>
      </section>
    </div>
  )
}
