'use client'

import { useActionState } from 'react'
import SearchableMasterSelect from '@/components/searchable-master-select'
import { createNonTgrSupplyAction, confirmNonTgrDepartureByOperationAction } from '@/app/operation/beranda/actions'

type Option = { value: string; label: string; searchText?: string }

type Task = {
  transaction_id: string
  status: string
  start_point: string | null
  destination: string | null
  std: string | null
  sta: string | null
  external_executor: string | null
  external_fleet: string | null
  sj_number: string | null
  sj_qty: number | null
  sj_weight: number | null
  product: string | null
  sj_note: string | null
}

function timeValue(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
}

export default function OperationCreateTask({ locations, products, tasks }: { locations: string[]; products: string[]; tasks: Task[] }) {
  const [state, formAction, pending] = useActionState(createNonTgrSupplyAction, {})
  const [departureState, departureAction, departurePending] = useActionState(confirmNonTgrDepartureByOperationAction, {})

  const locationOptions: Option[] = locations.map((value) => ({ value, label: value, searchText: value }))
  const productOptions: Option[] = products.map((value) => ({ value, label: value, searchText: value }))

  return (
    <div className="section-grid two-column section-block">
      <section className="metric-card">
        <div className="card-title">Buat Tugas Baru</div>
        <p className="muted">Buat Supply Armada Non-TGR, isi SJ, lalu konfirmasi waktu berangkat.</p>
        <form action={formAction} className="data-form compact-form">
          <div className="form-row">
            <SearchableMasterSelect label="Start Point" name="startPoint" options={locationOptions} placeholder="Pilih start point" required />
            <SearchableMasterSelect label="Destination" name="destination" options={locationOptions} placeholder="Pilih destination" required />
          </div>
          <div className="form-row">
            <label>STD<input type="time" name="std" required /></label>
            <label>STA<input type="time" name="sta" required /></label>
          </div>
          <div className="form-row">
            <label>Nama Executor<input name="executorName" required /></label>
            <label>No. WhatsApp Executor<input name="executorPhone" inputMode="tel" required /></label>
          </div>
          <div className="form-row">
            <label>No. Plat Armada<input name="fleetPlate" required /></label>
            <label>Tipe Armada<input name="fleetType" required /></label>
          </div>
          <div className="form-row">
            <label>Nomor SJ<input name="sjNumber" required /></label>
            <label>Qty SJ<input name="sjQty" type="number" min="0" step="any" required /></label>
            <label>Weight SJ<input name="sjWeight" type="number" min="0" step="any" required /></label>
          </div>
          <SearchableMasterSelect label="Produk SJ" name="product" options={productOptions} placeholder="Pilih produk" required />
          <label>Catatan SJ<textarea name="sjNote" rows={3} /></label>
          {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
          {state.success ? <p className="form-success" role="status">{state.success}</p> : null}
          <button type="submit" disabled={pending}>{pending ? 'Membuat tugas...' : 'Submit SJ'}</button>
        </form>
      </section>

      <section className="metric-card">
        <div className="card-title">Konfirmasi Berangkat</div>
        <p className="muted">Masukkan ATD manual. Waktu ini tidak dicatat sebagai timestamp sistem.</p>
        {departureState.error ? <p className="form-error" role="alert">{departureState.error}</p> : null}
        {departureState.success ? <p className="form-success" role="status">{departureState.success}</p> : null}
        <div className="task-list">
          {tasks.map((task) => (
            <div className="task-card" key={task.transaction_id}>
              <div className="task-card-top">
                <div><span className="eyebrow">Supply Non-TGR</span><h3>{task.transaction_id}</h3></div>
                <span className="status-badge status-assigned">Ditugaskan</span>
              </div>
              <div className="task-summary-grid">
                <div><span>Rute</span><strong>{task.start_point} → {task.destination}</strong></div>
                <div><span>STD</span><strong>{timeValue(task.std)}</strong></div>
                <div><span>STA</span><strong>{timeValue(task.sta)}</strong></div>
                <div><span>Executor</span><strong>{task.external_executor}</strong></div>
                <div><span>Armada</span><strong>{task.external_fleet}</strong></div>
                <div><span>SJ</span><strong>{task.sj_number} · {task.product}</strong></div>
              </div>
              <form action={departureAction} className="data-form compact-form">
                <input type="hidden" name="transactionId" value={task.transaction_id} />
                <label>ATD<input type="time" name="departure" required /></label>
                <button type="submit" disabled={departurePending}>{departurePending ? 'Menyimpan...' : 'Konfirmasi Berangkat'}</button>
              </form>
            </div>
          ))}
          {tasks.length === 0 ? <div className="empty-state">Belum ada tugas Non-TGR yang siap diberangkatkan.</div> : null}
        </div>
      </section>
    </div>
  )
}
