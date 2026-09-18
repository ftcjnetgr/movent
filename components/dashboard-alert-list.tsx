'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

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
  if (ticket.status === 'Accepted') return ticket.accepted_at ? new Date(ticket.accepted_at).getTime() : null
  if (ticket.status === 'In Progress') return ticket.in_progress_at ? new Date(ticket.in_progress_at).getTime() : null
  return new Date(ticket.created_at).getTime()
}

function ticketThresholdSeconds(status: string) {
  if (status === 'Accepted') return 24 * 60 * 60
  if (status === 'In Progress') return 3 * 24 * 60 * 60
  return 3 * 60 * 60
}

export default function DashboardAlertList({
  taskAlerts,
  ticketAlerts,
}: {
  taskAlerts?: TaskAlert[]
  ticketAlerts?: TicketAlert[]
}) {
  const router = useRouter()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const refreshTimer = window.setInterval(() => router.refresh(), 5000)
    return () => window.clearInterval(refreshTimer)
  }, [router])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const taskItems = useMemo(() => (taskAlerts ?? []).map((alert) => {
    const target = new Date(alert.targetAt).getTime()
    const threshold = alert.kind === 'unassigned' ? 30 * 60 * 1000 : 10 * 60 * 1000
    const countdown = target - now
    return {
      ...alert,
      label: alert.kind === 'unassigned' ? `Schedule ${alert.scheduleId}` : alert.transactionId ?? '-',
      detail: alert.kind === 'unassigned' ? 'Belum digunakan Dispatcher' : `Status ${alert.status ?? '-'} • Schedule ${alert.scheduleId}`,
      indicator: countdown > 0 ? `Countdown ${formatDuration(countdown / 1000)}` : `Count After ${formatDuration((now - target) / 1000)}`,
      inWindow: now >= target - threshold,
    }
  }).filter((item) => item.inWindow), [taskAlerts, now])

  const ticketItems = useMemo(() => (ticketAlerts ?? []).map((ticket) => {
    const base = ticketBaseAt(ticket)
    if (base === null) return null
    const thresholdSeconds = ticketThresholdSeconds(ticket.status)
    const elapsed = (now - base) / 1000
    return {
      ticket,
      thresholdSeconds,
      indicator: elapsed < thresholdSeconds
        ? `Countdown ${formatDuration(thresholdSeconds - elapsed)}`
        : `Count After ${formatDuration(elapsed - thresholdSeconds)}`,
    }
  }).filter((item): item is NonNullable<typeof item> => item !== null), [ticketAlerts, now])

  return (
    <div className="section-grid two-column">
      <section className="section-block">
        <div className="section-heading"><div><h2>Alert Tugas</h2><p>Countdown dan Count After berjalan real-time.</p></div></div>
        <div className="alert-list">
          {taskItems.map((item) => (
            <div className="alert-item" key={`${item.kind}-${item.scheduleId}-${item.transactionId ?? ''}`}>
              <div><strong>{item.label}</strong><span>{item.detail}</span></div>
              <b>{item.indicator}</b>
            </div>
          ))}
          {!taskItems.length ? <div className="empty-state">Belum ada alert tugas.</div> : null}
        </div>
      </section>
      <section className="section-block">
        <div className="section-heading"><div><h2>Alert Ticketing</h2><p>Countdown dan Count After berjalan real-time.</p></div></div>
        <div className="alert-list">
          {ticketItems.map(({ ticket, indicator }) => (
            <div className="alert-item" key={ticket.transaction_id}>
              <div><strong>{ticket.transaction_id}</strong><span>Status {ticket.status}</span></div>
              <b>{indicator}</b>
            </div>
          ))}
          {!ticketItems.length ? <div className="empty-state">Belum ada alert ticketing.</div> : null}
        </div>
      </section>
    </div>
  )
}
