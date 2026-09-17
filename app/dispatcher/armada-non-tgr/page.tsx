'use client'

import { FormEvent, useState, useTransition } from 'react'

import AppShell from '@/components/app-shell'
import { submitNonTgrArrivalAction, submitNonTgrDepartureAction } from './actions'

type Task = {
  transaction_id: string
  task_type: string
  status: string
  fleet_ownership: string
  start_point: string | null
  destination: string | null
  std: string | null
  sta: string | null
  external_executor: string | null
  external_fleet: string | null
  sj_number: string | null
  created_at: string
  external_departure_at: string | null
  external_arrival_at: string | null
}

export default function ArmadaNonTgrPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [, startTransition] = useTransition()

  async function loadTasks() {
    const response = await fetch('/api/dispatcher/armada-non-tgr')
    if (response.ok) setTasks(await response.json())
    setLoading(false)
  }

  // The API is loaded once on mount without changing the transaction flow.
  if (loading) {
    void loadTasks()
  }

  function submit(
    action: (formData: FormData) => Promise<{ error?: string; success?: string }>,
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startTransition(async () => {
      const result = await action(formData)
      setMessage(result.success ?? result.error ?? '')
      if (result.success) window.location.reload()
    })
  }

  return (
    <AppShell>
      <div className="page-heading"><div><span className="eyebrow">Dispatcher</span><h1>Armada Non-TGR</h1><p>Seluruh proses Armada Non-TGR dikerjakan oleh Dispatcher.</p></div></div>
      {message ? <div className="inline-feedback">{message}</div> : null}
      <section className="data-table-card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Transaction ID</th><th>Rute</th><th>Executor Eksternal</th><th>Armada</th><th>STD</th><th>STA</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {(tasks ?? []).map((task) => <tr key={task.transaction_id}>
                <td><strong>{task.transaction_id}</strong></td>
                <td>{task.start_point ?? '-'} → {task.destination ?? '-'}</td>
                <td>{task.external_executor ?? '-'}</td>
                <td>{task.external_fleet ?? '-'}</td>
                <td>{task.std ? new Date(task.std).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) : '-'}</td>
                <td>{task.sta ? new Date(task.sta).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) : '-'}</td>
                <td><span className={`status-badge status-${task.status.toLowerCase().replaceAll(' ', '-')}`}>{task.status}</span></td>
                <td>
                  {task.status === 'Assigned' ? (
                    <form onSubmit={(event) => submit(submitNonTgrDepartureAction, event)} className="compact-form">
                      <input type="hidden" name="transactionId" value={task.transaction_id} />
                      <label>Berangkat<input name="departure" type="datetime-local" required /></label>
                      <button type="submit">Submit keberangkatan</button>
                    </form>
                  ) : null}
                  {task.status === 'Driving' ? (
                    <form onSubmit={(event) => submit(submitNonTgrArrivalAction, event)} className="compact-form">
                      <input type="hidden" name="transactionId" value={task.transaction_id} />
                      <label>Datang<input name="arrival" type="datetime-local" required /></label>
                      <button type="submit">Submit kedatangan</button>
                    </form>
                  ) : null}
                  {task.status === 'Completed' ? <span className="muted">Selesai</span> : null}
                </td>
              </tr>)}
              {loading ? <tr><td colSpan={8}><div className="empty-state">Memuat tugas Armada Non-TGR...</div></td></tr> : null}
              {!loading && !(tasks ?? []).length ? <tr><td colSpan={8}><div className="empty-state">Belum ada tugas Armada Non-TGR.</div></td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  )
}
