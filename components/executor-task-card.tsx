'use client'

import { FormEvent, useState, useTransition } from 'react'
import { jsPDF } from 'jspdf'
import SearchableMasterSelect from '@/components/searchable-master-select'

import {
  acceptExtraScheduleAction,
  confirmArrivalAction,
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
  fleet_ownership: string | null
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
  arrived_at: string | null
  executor_snapshot: { full_name?: string; executor_nik?: string } | null
  fleet_snapshot: { plat_number?: string; fleet_type?: string } | null
}

function requiresSj(task: Task) {
  return task.task_type === 'Extra Schedule' || (task.task_type === 'Supply' && task.fleet_ownership === 'TGR')
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    Assigned: 'Ditugaskan',
    Confirmed: 'Diterima',
    Driving: 'Berangkat',
    Completed: 'Selesaikan Tugas',
    Canceled: 'Dibatalkan',
  }
  return labels[status] ?? status
}

function nextActionLabel(task: Task) {
  if (task.status === 'Assigned') return 'Terima Penugasan'
  if (task.status === 'Confirmed' && requiresSj(task) && !task.sj_number) return 'Isi Surat Jalan'
  if (task.status === 'Confirmed' && task.odometer_start === null) return 'Isi odometer awal'
  if (task.status === 'Confirmed') return 'Konfirmasi Berangkat'
  if (task.status === 'Driving' && !task.arrived_at) return 'Konfirmasi Tiba'
  if (task.status === 'Driving' && task.odometer_end === null) return 'Isi odometer akhir'
  if (task.status === 'Driving') return 'Selesaikan Tugaskan tugas'
  return 'Lanjutkan tugas'
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

  function handleArrival(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submit(confirmArrivalAction, event.currentTarget)
  }

  function handleOdometerEnd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submit(saveOdometerEndAction, event.currentTarget)
  }

  function handleComplete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submit(confirmCompletedAction, event.currentTarget)
  }

  const needsSj = requiresSj(task)
  const productOptions = products.map((product) => ({ value: product, label: product, searchText: product }))

  function shareText() {
    const lines = [
      'MOVENT - Tugas',
      'ID Transaksi: ' + task.transaction_id,
      'Jenis: ' + task.task_type,
      'Rute: ' + (task.start_point ?? '-') + ' → ' + (task.destination ?? '-'),
    ]
    if (needsSj) {
      lines.push(
        'Nomor SJ: ' + (task.sj_number ?? '-'),
        'Qty: ' + (task.sj_qty ?? '-'),
        'Berat: ' + (task.sj_weight ?? '-'),
        'Produk: ' + (task.product ?? '-'),
        'Catatan: ' + (task.sj_note ?? '-')
      )
    }
    return lines.join('\n')
  }

  function handleShare() {
    window.open('https://wa.me/?text=' + encodeURIComponent(shareText()), '_blank', 'noopener,noreferrer')
  }

  function handlePrintSj() {
    if (!task.sj_number) return
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [210, 110],
    })
    doc.setFontSize(16)
    doc.text('SURAT JALAN', 10, 14)
    doc.setFontSize(10)
    doc.text('Transaction ID: ' + task.transaction_id, 10, 22)
    doc.text('Nomor SJ: ' + task.sj_number, 10, 30)
    doc.text('Qty: ' + (task.sj_qty ?? '-'), 10, 38)
    doc.text('Berat: ' + (task.sj_weight ?? '-'), 10, 46)
    doc.text('Produk: ' + (task.product ?? '-'), 10, 54)
    const note = doc.splitTextToSize('Catatan: ' + (task.sj_note ?? '-'), 185)
    doc.text(note, 10, 62)
    doc.save(task.transaction_id + '-SJ.pdf')
  }

  return (
    <article className="task-card">
      <div className="task-card-top">
        <div>
          <span className="eyebrow">{task.task_type}</span>
          <h2>{task.transaction_id}</h2>
        </div>
        <span className={`status-badge status-${task.status.toLowerCase().replaceAll(' ', '-')}`}>{statusLabel(task.status)}</span>
      </div>

      <div className="task-next-step">
        <span>LANGKAH BERIKUTNYA</span>
        <strong>{nextActionLabel(task)}</strong>
      </div>

      <div className="task-summary-grid">
        <div><span>Rute</span><strong>{task.start_point} → {task.destination}</strong></div>
        <div><span>STD</span><strong>{task.std ? new Date(task.std).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) : '-'}</strong></div>
        <div><span>STA</span><strong>{task.sta ? new Date(task.sta).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) : '-'}</strong></div>
        <div><span>Armada</span><strong>{task.fleet_snapshot?.plat_number ?? '-'}</strong></div>
      </div>

      {message ? <div className="inline-feedback">{message}</div> : null}

      {needsSj && task.sj_number ? (
        <div className="metric-card section-block">
          <div className="card-title">Pratinjau surat jalan</div>
          <div className="task-summary-grid">
            <div><span>Transaction ID</span><strong>{task.transaction_id}</strong></div>
            <div><span>Nomor SJ</span><strong>{task.sj_number}</strong></div>
            <div><span>Qty</span><strong>{task.sj_qty ?? '-'}</strong></div>
            <div><span>Berat</span><strong>{task.sj_weight ?? '-'}</strong></div>
            <div><span>Produk</span><strong>{task.product ?? '-'}</strong></div>
            <div><span>Catatan</span><strong>{task.sj_note ?? '-'}</strong></div>
          </div>
          <div className="form-row">
            <button type="button" onClick={handlePrintSj}>Cetak PDF</button>
            <button type="button" className="secondary-button" onClick={handleShare}>Bagikan ke WhatsApp</button>
          </div>
        </div>
      ) : null}

      {!needsSj && task.odometer_start !== null ? (
        <div className="metric-card section-block">
          <div className="card-title">Pratinjau tugas</div>
          <div className="task-summary-grid">
            <div><span>Transaction ID</span><strong>{task.transaction_id}</strong></div>
            <div><span>Jenis</span><strong>{task.task_type}</strong></div>
            <div><span>Titik Mulai</span><strong>{task.start_point ?? '-'}</strong></div>
            <div><span>Destinasi</span><strong>{task.destination ?? '-'}</strong></div>
          </div>
          <button type="button" className="secondary-button" onClick={handleShare}>Bagikan ke WhatsApp</button>
        </div>
      ) : null}

      {task.status === 'Assigned' ? (
        <form onSubmit={handleAccept}>
          <input type="hidden" name="transactionId" value={task.transaction_id} />
          <button type="submit" disabled={isPending}>Terima Penugasan</button>
        </form>
      ) : null}

      {task.status === 'Confirmed' && needsSj && !task.sj_number ? (
        <form onSubmit={handleSj} className="data-form compact-form">
          <input type="hidden" name="transactionId" value={task.transaction_id} />
          <div className="form-row">
            <label>Nomor SJ<input name="sjNumber" required /></label>
            <label>Qty<input name="qty" type="number" step="any" min="0" required /></label>
            <label>Berat<input name="weight" type="number" step="any" min="0" required /></label>
          </div>
          <SearchableMasterSelect label="Produk" name="product" options={productOptions} placeholder="Pilih Produk" required />
          <label>Catatan<textarea name="note" rows={3} /></label>
          <button type="submit" disabled={isPending}>Kirim surat jalan</button>
        </form>
      ) : null}

      {task.status === 'Confirmed' && (!needsSj || Boolean(task.sj_number)) && task.odometer_start === null ? (
        <form onSubmit={handleOdometerStart} className="compact-form">
          <input type="hidden" name="transactionId" value={task.transaction_id} />
          <label>Odometer Awal<input name="odometerStart" type="number" min="0" step="any" required /></label>
          <button type="submit" disabled={isPending}>Simpan Odometer Awal</button>
        </form>
      ) : null}

      {task.status === 'Confirmed' && (!needsSj || Boolean(task.sj_number)) && task.odometer_start !== null ? (
        <form onSubmit={handleDriving}>
          <input type="hidden" name="transactionId" value={task.transaction_id} />
          <button type="submit" disabled={isPending}>Konfirmasi Berangkat</button>
        </form>
      ) : null}

      {task.status === 'Driving' && !task.arrived_at ? (
        <form onSubmit={handleArrival}>
          <input type="hidden" name="transactionId" value={task.transaction_id} />
          <button type="submit" disabled={isPending}>Konfirmasi Tiba</button>
        </form>
      ) : null}

      {task.status === 'Driving' && task.arrived_at && task.odometer_end === null ? (
        <form onSubmit={handleOdometerEnd} className="compact-form">
          <input type="hidden" name="transactionId" value={task.transaction_id} />
          <label>Odometer Akhir<input name="odometerEnd" type="number" min="0" step="any" required /></label>
          <button type="submit" disabled={isPending}>Simpan Odometer Akhir</button>
        </form>
      ) : null}

      {task.status === 'Driving' && task.arrived_at && task.odometer_end !== null ? (
        <form onSubmit={handleComplete}>
          <input type="hidden" name="transactionId" value={task.transaction_id} />
          <button type="submit" disabled={isPending}>Selesaikan Tugas</button>
        </form>
      ) : null}
    </article>
  )
}
