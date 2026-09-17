'use client'

import { FormEvent, useState, useTransition } from 'react'

import {
  acceptExtraScheduleAction,
  confirmCompletedAction,
  confirmDrivingAction,
  saveOdometerEndAction,
  saveOdometerStartAction,
  submitExtraScheduleSjAction,
} from '@/app/executor/tugas-saya/actions'

type Task = {
  transaction_id: string
  task_type: string
  status: string
  start_point: string | null
  destination: string | null
  std: string | null
  sta: string | null
  sj_number: string | null
  sj_qty: number | null
  sj_weight: number | null
  product: string | null
  sj_note: string | null
  odometer_start: number | null
  odometer_end: number | null
  executor_snapshot: { full_name?: string; executor_nik?: string } | null
  fleet_snapshot: { plat_number?: string; fleet_type?: string } | null
}

export default function ExecutorTaskCard({ task, products }: { task: Task; products: string[] }) {
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  function submit(action: (formData: FormData) => Promise<{ error?: string; success?: string }>, form: HTMLFormElement) {
    const formData = new FormData(form)
    startTransition(async () => {
      const result = await action(formData)
      setMessage(result.success ?? result.error ?? '')
      if (result.success) window.location.reload()
    })
  }

  function handleAccept(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submit(acceptExtraScheduleAction, event.currentTarget)
  }

  function handleSj(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submit(submitExtraScheduleSjAction, event.currentTarget)
  }

  function handleOdometerStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submit(saveOdometerStartAction, event.currentTarget)
  }

  function handleDriving(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submit(confirmDrivingAction, event.currentTarget)
  }

  function handleOdometerEnd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submit(saveOdometerEndAction, event.currentTarget)
  }

  function handleComplete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submit(confirmCompletedAction, event.currentTarget)
  }

  return (
    <article className="task-card">
      <div className="task-card-top">
        <div>
          <span className="eyebrow">{task.task_type}</span>
          <h2>{task.transaction_id}</h2>
        </div>
        <span className={`status-badge status-${task.status.toLowerCase().replaceAll(' ', '-')}`}>{task.status}</span>
      </div>

      <div className="task-summary-grid">
        <div><span>Rute</span><strong>{task.start_point} → {task.destination}</strong></div>
        <div><span>STD</span><strong>{task.std ? new Date(task.std).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) : '-'}</strong></div>
        <div><span>STA</span><strong>{task.sta ? new Date(task.sta).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) : '-'}</strong></div>
        <div><span>Armada</span><strong>{task.fleet_snapshot?.plat_number ?? '-'}</strong></div>
      </div>

      {message ? <div className="inline-feedback">{message}</div> : null}

      {task.status === 'Assigned' ? (
        <form onSubmit={handleAccept}>
          <input type="hidden" name="transactionId" value={task.transaction_id} />
          <button type="submit" disabled={isPending}>Konfirmasi menerima</button>
        </form>
      ) : null}

      {task.status === 'Accepted' && !task.sj_number ? (
        <form onSubmit={handleSj} className="data-form compact-form">
          <input type="hidden" name="transactionId" value={task.transaction_id} />
          <div className="form-row">
            <label>Nomor SJ<input name="sjNumber" required /></label>
            <label>Qty<input name="qty" type="number" step="any" min="0" required /></label>
            <label>Berat<input name="weight" type="number" step="any" min="0" required /></label>
          </div>
          <label>Produk
            <select name="product" required defaultValue="">
              <option value="">Pilih Produk</option>
              {products.map((product) => <option key={product} value={product}>{product}</option>)}
            </select>
          </label>
          <label>Catatan<textarea name="note" rows={3} /></label>
          <button type="submit" disabled={isPending}>Submit SJ</button>
        </form>
      ) : null}

      {task.status === 'Accepted' && task.sj_number && task.odometer_start === null ? (
        <form onSubmit={handleOdometerStart} className="compact-form">
          <input type="hidden" name="transactionId" value={task.transaction_id} />
          <label>Odometer Awal<input name="odometerStart" type="number" min="0" step="any" required /></label>
          <button type="submit" disabled={isPending}>Simpan Odometer Awal</button>
        </form>
      ) : null}

      {task.status === 'Accepted' && task.sj_number && task.odometer_start !== null ? (
        <form onSubmit={handleDriving}>
          <input type="hidden" name="transactionId" value={task.transaction_id} />
          <button type="submit" disabled={isPending}>Konfirmasi Berangkat</button>
        </form>
      ) : null}

      {task.status === 'Driving' && task.odometer_end === null ? (
        <form onSubmit={handleOdometerEnd} className="compact-form">
          <input type="hidden" name="transactionId" value={task.transaction_id} />
          <label>Odometer Akhir<input name="odometerEnd" type="number" min="0" step="any" required /></label>
          <button type="submit" disabled={isPending}>Simpan Odometer Akhir</button>
        </form>
      ) : null}

      {task.status === 'Driving' && task.odometer_end !== null ? (
        <form onSubmit={handleComplete}>
          <input type="hidden" name="transactionId" value={task.transaction_id} />
          <button type="submit" disabled={isPending}>Konfirmasi Datang & Selesai</button>
        </form>
      ) : null}
    </article>
  )
}
