'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type RequestItem = {
  transaction_id: string
  start_point: string | null
  destination: string | null
  created_at: string
}

function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, totalSeconds)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remaining = seconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
}

export default function OperationExtraScheduleAlert({ requests }: { requests: RequestItem[] }) {
  const router = useRouter()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const refreshTimer = window.setInterval(() => router.refresh(), 5000)
    return () => window.clearInterval(refreshTimer)
  }, [router])

  const alerts = useMemo(() => requests.map((request) => {
    const created = new Date(request.created_at).getTime()
    const ageSeconds = Math.floor((now - created) / 1000)
    const threshold = 15 * 60
    return {
      ...request,
      ageSeconds,
      isAlert: ageSeconds >= threshold,
      remainingSeconds: threshold - ageSeconds,
    }
  }), [requests, now])

  if (!alerts.length) return null

  return (
    <section className="section-block">
      <div className="metric-card alert-card">
        <div className="section-heading">
          <div>
            <h2>Alert Request Extra Schedule</h2>
            <p>Request yang masih menunggu assignment Dispatcher.</p>
          </div>
          <strong>{alerts.length}</strong>
        </div>

        <div className="alert-list">
          {alerts.map((request) => (
            <div className="alert-item" key={request.transaction_id}>
              <div>
                <strong>{request.transaction_id}</strong>
                <span>{request.start_point ?? '-'} → {request.destination ?? '-'}</span>
              </div>
              <b>{request.isAlert ? `Count After ${formatDuration(request.ageSeconds - 15 * 60)}` : `Countdown ${formatDuration(request.remainingSeconds)}`}</b>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
