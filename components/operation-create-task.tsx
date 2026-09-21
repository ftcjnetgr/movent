'use client'

import { useActionState, useState } from 'react'
import SearchableMasterSelect from '@/components/searchable-master-select'
import { createNonTgrSupplyAction, confirmNonTgrDepartureByOperationAction, confirmNonTgrSupplyAction } from '@/app/operation/beranda/actions'

type Option = { value: string; label: string; searchText?: string }
type Preview = {
  startPoint: string
  destination: string
  std: string
  sta: string
  externalExecutor: string
  externalFleet: string
  sjs: { sjNumber: string; sjQty: number; sjWeight: number; product: string; sjNote: string | null }[]
}

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
  const [confirmState, confirmAction, confirmPending] = useActionState(confirmNonTgrSupplyAction, {})
  const [departureState, departureAction, departurePending] = useActionState(confirmNonTgrDepartureByOperationAction, {})
  const [preview, setPreview] = useState<Preview | null>(null)
  const [sjRows, setSjRows] = useState([0])

  const locationOptions: Option[] = locations.map((value) => ({ value, label: value, searchText: value }))
  const productOptions: Option[] = products.map((value) => ({ value, label: value, searchText: value }))

  return (
    <div className="section-grid two-column section-block">
      <section className="metric-card">
        <div className="card-title">Buat Tugas Baru</div>
        <p className="muted">Supply Armada Non TGR · isi data perjalanan dan Surat Jalan, lalu preview sebelum konfirmasi.</p>
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
          {sjRows.map((row) => (
            <div key={row} className="metric-card compact-form">
              <div className="card-title">SJ {row + 1}</div>
              <div className="form-row">
                <label>Nomor SJ<input name="sjNumber" required /></label>
                <label>Qty SJ<input name="sjQty" type="number" min="0" step="any" required /></label>
                <label>Weight SJ<input name="sjWeight" type="number" min="0" step="any" required /></label>
              </div>
              <SearchableMasterSelect label="Produk SJ" name="product" options={productOptions} placeholder="Pilih produk" required />
              <label>Catatan SJ<textarea name="sjNote" rows={3} /></label>
            </div>
          ))}
          <button type="button" className="secondary-button" onClick={() => setSjRows((rows) => [...rows, rows.length])}>Tambah SJ</button>
          {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
          {state.success ? <p className="form-success" role="status">{state.success}</p> : null}
          <button type="submit" disabled={pending}>{pending ? 'Menyiapkan preview...' : 'Preview Tugas'}</button>
        </form>

        {state.preview ? (
          <div className="metric-card compact-form" style={{ marginTop: 16 }}>
            <div className="card-title">Preview Tugas Supply Non-TGR</div>
            <div className="task-summary-grid">
              <div><span>Rute</span><strong>{state.preview.startPoint} → {state.preview.destination}</strong></div>
              <div><span>STD</span><strong>{timeValue(state.preview.std)}</strong></div>
              <div><span>STA</span><strong>{timeValue(state.preview.sta)}</strong></div>
              <div><span>Executor</span><strong>{state.preview.externalExecutor}</strong></div>
              <div><span>Armada</span><strong>{state.preview.externalFleet}</strong></div>
              <div><span>Jumlah SJ</span><strong>{state.preview.sjs.length}</strong></div>
            </div>
            <p className="muted">Periksa data sebelum konfirmasi. Jika ada yang salah, kembali ke form untuk mengedit.</p>
            <form action={confirmAction} className="compact-form">
              <input type="hidden" name="startPoint" value={state.preview.startPoint} />
              <input type="hidden" name="destination" value={state.preview.destination} />
              <input type="hidden" name="std" value={timeValue(state.preview.std)} />
              <input type="hidden" name="sta" value={timeValue(state.preview.sta)} />
              <input type="hidden" name="executorName" value={state.preview.externalExecutor.split(' · ')[0]} />
              <input type="hidden" name="executorPhone" value={state.preview.externalExecutor.split(' · ').slice(1).join(' · ')} />
              <input type="hidden" name="fleetPlate" value={state.preview.externalFleet.split(' · ')[0]} />
              <input type="hidden" name="fleetType" value={state.preview.externalFleet.split(' · ').slice(1).join(' · ')} />
              {state.preview.sjs.map((sj, index) => (
                <span key={index}>
                  <input type="hidden" name="sjNumber" value={sj.sjNumber} />
                  <input type="hidden" name="sjQty" value={sj.sjQty} />
                  <input type="hidden" name="sjWeight" value={sj.sjWeight} />
                  <input type="hidden" name="product" value={sj.product} />
                  <input type="hidden" name="sjNote" value={sj.sjNote ?? ''} />
                </span>
              ))}
              {confirmState.error ? <p className="form-error" role="alert">{confirmState.error}</p> : null}
              {confirmState.success ? <p className="form-success" role="status">{confirmState.success}</p> : null}
              <button type="submit" disabled={confirmPending}>{confirmPending ? 'Mengonfirmasi...' : 'Konfirmasi Penugasan'}</button>
            </form>
          </div>
        ) : null}
      </section>

      <section className="metric-card">
        <div className="card-title">Tugas Siap Berangkat</div>
        <p className="muted">Pilih tugas yang siap berangkat, lalu masukkan ATD secara manual.</p>
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
                <div><span>Rute Perjalanan</span><strong>{task.start_point} → {task.destination}</strong></div>
                <div><span>STD</span><strong>{timeValue(task.std)}</strong></div>
                <div><span>STA</span><strong>{timeValue(task.sta)}</strong></div>
                <div><span>Executor</span><strong>{task.external_executor}</strong></div>
                <div><span>Armada</span><strong>{task.external_fleet}</strong></div>
                <div><span>Surat Jalan</span><strong>{task.sj_number} · {task.product}</strong></div>
              </div>
              <form action={departureAction} className="data-form compact-form">
                <input type="hidden" name="transactionId" value={task.transaction_id} />
                <label>ATD<input type="time" name="departure" required /></label>
                <button type="submit" disabled={departurePending}>{departurePending ? 'Menyimpan...' : 'Konfirmasi Berangkat'}</button>
              </form>
            </div>
          ))}
          {tasks.length === 0 ? <div className="empty-state">Belum ada Supply Non TGR yang menunggu konfirmasi berangkat.</div> : null}
        </div>
      </section>
    </div>
  )
}
