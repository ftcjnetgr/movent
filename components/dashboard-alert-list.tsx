'use client'

import { useEffect, useMemo, useState } from 'react'

type TaskAlert = {
  kind: 'unassigned' | 'assigned'
  scheduleId: string
  transactionId?: string
  status?: string
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
    Completed: 'Selesai',
    Canceled: 'Dibatalkan',
  }
  return labels[status] ?? status
}

function taskDetail(alert: TaskAlert, now: number) {
  const target = new Date(alert.targetAt).getTime()
  const threshold = alert.kind === 'unassigned' ? 30 * 60 * 1000 : 10 * 60 * 1000
  const countdown = target - now
  return {
    title: alert.kind === 'unassigned' ? alert.scheduleId : alert.transactionId ?? '-',
    detail: alert.kind === 'unassigned'
      ? 'Jadwal belum digunakan Dispatcher'
      : `Jadwal ${alert.scheduleId} • Status ${alert.status ?? '-'}`,
    time: countdown > 0 ? `Sisa waktu ${formatDuration(countdown / 1000)}` : `Lewat ${formatDuration((now - target) / 1000)}`,
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
  const showTask = taskAlerts !== undefined
  const showTicket = ticketAlerts !== undefined
  const taskAlertRows = taskAlerts ?? []
  const ticketAlertRows = ticketAlerts ?? []
  const [now, setNow] = useState(() => Date.now())
  const [open, setOpen] = useState<'task' | 'ticket' | null>(null)

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
        indicator: elapsed < thresholdSeconds
          ? `Countdown ${formatDuration(thresholdSeconds - elapsed)}`
          : `Count After ${formatDuration(elapsed - thresholdSeconds)}`,
      }
    }).filter((item): item is NonNullable<typeof item> => item !== null),
    [ticketAlertRows, now],
  )

  const alertCount = taskItems.length + ticketItems.length

  return (
    <>
      <div className="metric-grid alert-summary-grid">
        {showTask ? (
          <button type="button" className="metric-card alert-card alert-summary-card" onClick={() => setOpen('task')}>
            <span>Alert Tugas</span>
            <strong>{taskItems.length}</strong>
            <small>Klik untuk lihat detail</small>
          </button>
        ) : null}
        {showTicket ? (
          <button type="button" className="metric-card alert-card alert-summary-card" onClick={() => setOpen('ticket')}>
            <span>Alert Ticketing</span>
            <strong>{ticketItems.length}</strong>
            <small>Klik untuk lihat detail</small>
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="alert-modal-backdrop" role="presentation" onClick={() => setOpen(null)}>
          <section className="alert-modal" role="dialog" aria-modal="true" aria-labelledby="alert-modal-title" onClick={(event) => event.stopPropagation()}>
            <div className="alert-modal-heading">
              <div>
                <span className="eyebrow">Alert</span>
                <h2 id="alert-modal-title">{open === 'task' ? 'Detail Alert Tugas' : 'Detail Alert Ticketing'}</h2>
              </div>
              <button type="button" className="secondary-button" onClick={() => setOpen(null)}>Tutup</button>
            </div>

            <div className="alert-detail-list">
              {open === 'task' ? taskItems.map((item) => (
                <div className="alert-detail-item" key={`${item.title}-${item.time}`}>
                  <div><strong>{item.title}</strong><span>{item.detail}</span></div>
                  <b>{item.time}</b>
                </div>
              )) : ticketItems.map((item) => (
                <div className="alert-detail-item" key={item.transactionId}>
                  <div><strong>{item.transactionId}</strong><span>Status {item.status}</span></div>
                  <b>{item.indicator}</b>
                </div>
              ))}
              {!((open === 'task' ? taskItems : ticketItems).length) ? (
                <div className="empty-state">Tidak ada alert saat ini.</div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      <span className="sr-only">{alertCount} alert aktif</span>
    </>
  )
}
