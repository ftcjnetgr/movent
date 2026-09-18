'use client'

import { useActionState, useEffect, useState } from 'react'
import { jsPDF } from 'jspdf'
import SearchableMasterSelect from '@/components/searchable-master-select'
import { createDispatcherTaskAction } from '@/app/dispatcher/beranda/actions'

const initialState: {
  error?: string
  success?: string
  transactionId?: string
  preview?: {
    transactionId: string
    startPoint: string
    destination: string
    externalExecutor: string
    externalFleet: string
    sjNumber: string
    sjQty: number
    sjWeight: number
    product: string
    sjNote: string | null
  }
} = {}

type Props = {
  locations: string[]
  schedules: Array<{ schedule_id: string; route: string; category: string; start_point: string; destination: string; std: string; sta: string; trip: number }>
  executors: Array<{ executor_nik: string; full_name: string }>
  fleets: Array<{ plat_number: string; fleet_type: string }>
  products: string[]
}

export default function DispatcherCreateTask({ locations, schedules, executors, fleets, products }: Props) {
  const [state, formAction, pending] = useActionState(createDispatcherTaskAction, initialState)
  const [taskType, setTaskType] = useState('Distribusi Mobil')
  const [ownership, setOwnership] = useState('TGR')
  const usesInternalExecutor = taskType === 'Distribusi Mobil' || ownership === 'TGR'
  const locationOptions = locations.map((location) => ({ value: location, label: location }))
  const scheduleOptions = schedules.map((schedule) => ({
    value: schedule.schedule_id,
    label: schedule.schedule_id + ' • Trip ' + schedule.trip + ' • ' + schedule.start_point + ' → ' + schedule.destination + ' • ' + schedule.std.slice(0, 5),
    searchText: [schedule.schedule_id, schedule.route, schedule.category, schedule.start_point, schedule.destination, String(schedule.trip), schedule.std, schedule.sta].join(' '),
  }))
  const executorOptions = executors.map((executor) => ({
    value: executor.executor_nik,
    label: executor.executor_nik + ' - ' + executor.full_name,
    searchText: executor.executor_nik + ' ' + executor.full_name,
  }))
  const fleetOptions = fleets.map((fleet) => ({
    value: fleet.plat_number,
    label: fleet.plat_number + ' - ' + fleet.fleet_type,
    searchText: fleet.plat_number + ' ' + fleet.fleet_type,
  }))
  const productOptions = products.map((product) => ({ value: product, label: product, searchText: product }))

  useEffect(() => {
    if (state.success) window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [state.success])

  function shareNonTgrSj() {
    if (!state.preview) return
    const text = [
      'MOVENT - Surat Jalan',
      'ID Transaksi: ' + state.preview.transactionId,
      'Titik Mulai: ' + state.preview.startPoint,
      'Destinasi: ' + state.preview.destination,
      'Executor Eksternal: ' + state.preview.externalExecutor,
      'Armada Eksternal: ' + state.preview.externalFleet,
      'Nomor SJ: ' + state.preview.sjNumber,
      'Qty: ' + state.preview.sjQty,
      'Berat: ' + state.preview.sjWeight,
      'Produk: ' + state.preview.product,
      'Catatan: ' + (state.preview.sjNote ?? '-'),
    ].join('\n')
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener,noreferrer')
  }

  function printNonTgrSj() {
    if (!state.preview) return
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [210, 110],
    })
    doc.setFontSize(16)
    doc.text('SURAT JALAN', 10, 14)
    doc.setFontSize(10)
    doc.text('ID Transaksi: ' + state.preview.transactionId, 10, 22)
    doc.text('Titik Mulai: ' + state.preview.startPoint, 10, 30)
    doc.text('Destinasi: ' + state.preview.destination, 10, 38)
    doc.text('Executor Eksternal: ' + state.preview.externalExecutor, 10, 46)
    doc.text('Armada Eksternal: ' + state.preview.externalFleet, 10, 54)
    doc.text('Nomor SJ: ' + state.preview.sjNumber, 10, 62)
    doc.text('Qty: ' + state.preview.sjQty, 10, 70)
    doc.text('Berat: ' + state.preview.sjWeight, 10, 78)
    doc.text('Produk: ' + state.preview.product, 10, 86)
    const note = doc.splitTextToSize('Catatan: ' + (state.preview.sjNote ?? '-'), 185)
    doc.text(note, 10, 94)
    doc.save(state.preview.transactionId + '-SJ.pdf')
  }

  return (
    <section className="section-block">
      <div className="section-heading"><div><h2>Buat Tugas</h2><p>Mulai penugasan dari sini sesuai alurnya.</p></div></div>
      <div className="metric-card">
        <form action={formAction} className="data-form">
          <div className="form-row">
            <label>Jenis Tugas
              <select name="taskType" value={taskType} onChange={(event) => setTaskType(event.target.value)}>
                <option value="Distribusi Mobil">Distribusi Mobil</option>
                <option value="Supply">Supply</option>
              </select>
            </label>
            {taskType === 'Supply' ? (
              <label>Kepemilikan Armada
                <select name="fleetOwnership" value={ownership} onChange={(event) => setOwnership(event.target.value)}>
                  <option value="TGR">TGR</option>
                  <option value="Non-TGR">Non-TGR</option>
                </select>
              </label>
            ) : <div />}
          </div>

          {taskType === 'Supply' && ownership === 'TGR' ? (
            <>
              <div className="form-section">
                <div className="form-section-title">Jadwal Keberangkatan</div>
                <SearchableMasterSelect
                  label="Jadwal"
                  name="scheduleId"
                  options={scheduleOptions}
                  placeholder="Pilih jadwal"
                  required
                />
              </div>

              <div className="form-section">
                <div className="form-section-title">Detail Penugasan</div>
                <div className="form-row">
                  <SearchableMasterSelect label="Executor" name="executorNik" options={executorOptions} placeholder="Pilih executor" required />
                  <SearchableMasterSelect label="Armada" name="platNumber" options={fleetOptions} placeholder="Pilih armada" required />
                </div>
              </div>
            </>
          ) : null}

          {taskType === 'Supply' && ownership === 'Non-TGR' ? (
            <>
              <div className="form-section">
                <div className="form-section-title">Rute</div>
                <div className="form-row">
                  <SearchableMasterSelect label="Titik Mulai" name="startPoint" options={locationOptions} placeholder="Pilih titik mulai" required />
                  <SearchableMasterSelect label="Destinasi" name="destination" options={locationOptions} placeholder="Pilih destinasi" required />
                </div>
              </div>
              <div className="form-section">
                <div className="form-section-title">Waktu & Penugasan</div>
                <div className="form-row">
                  <label>STD<input name="std" type="time" required /></label>
                  <label>STA<input name="sta" type="time" required /></label>
                </div>
              </div>
            </>
          ) : taskType === 'Distribusi Mobil' ? (
            <>
              <div className="form-section">
                <div className="form-section-title">Rute</div>
                <div className="form-row">
                  <SearchableMasterSelect label="Titik Mulai" name="startPoint" options={locationOptions} placeholder="Pilih titik mulai" required />
                  <SearchableMasterSelect label="Destinasi" name="destination" options={locationOptions} placeholder="Pilih destinasi" required />
                </div>
              </div>
              <div className="form-section">
                <div className="form-section-title">Waktu & Penugasan</div>
                <div className="form-row">
                  <label>STD<input name="std" type="time" required /></label>
                  <label>STA<input name="sta" type="time" required /></label>
                  <SearchableMasterSelect label="Executor" name="executorNik" options={executorOptions} placeholder="Pilih executor" required />
                  <SearchableMasterSelect label="Armada" name="platNumber" options={fleetOptions} placeholder="Pilih armada" required />
                </div>
              </div>
            </>
          ) : null}

          {taskType === 'Supply' && ownership === 'Non-TGR' ? (
            <>
              <div className="form-row">
                <label>Executor Eksternal<input name="externalExecutor" required /></label>
                <label>Armada Eksternal<input name="externalFleet" required /></label>
              </div>
              <div className="form-row">
                <label>Nomor SJ<input name="sjNumber" required /></label>
                <label>Qty<input name="sjQty" type="number" step="any" min="0" required /></label>
                <label>Berat<input name="sjWeight" type="number" step="any" min="0" required /></label>
              </div>
              <div className="form-row">
                <SearchableMasterSelect label="Produk" name="product" options={productOptions} placeholder="Pilih produk" required />
                <label>Catatan<textarea name="sjNote" rows={2} /></label>
              </div>
            </>
          ) : null}

          {taskType === 'Supply' && ownership === 'TGR' ? <p className="muted">STD dan STA otomatis mengikuti jadwal yang kamu pilih.</p> : null}
          {state.preview ? (
        <div className="metric-card section-block">
          <div className="card-title">Pratinjau surat jalan</div>
          <div className="task-summary-grid">
            <div><span>ID Transaksi</span><strong>{state.preview.transactionId}</strong></div>
            <div><span>Titik Mulai</span><strong>{state.preview.startPoint}</strong></div>
            <div><span>Destinasi</span><strong>{state.preview.destination}</strong></div>
            <div><span>Executor Eksternal</span><strong>{state.preview.externalExecutor}</strong></div>
            <div><span>Armada Eksternal</span><strong>{state.preview.externalFleet}</strong></div>
            <div><span>Nomor SJ</span><strong>{state.preview.sjNumber}</strong></div>
            <div><span>Qty</span><strong>{state.preview.sjQty}</strong></div>
            <div><span>Berat</span><strong>{state.preview.sjWeight}</strong></div>
            <div><span>Produk</span><strong>{state.preview.product}</strong></div>
            <div><span>Catatan</span><strong>{state.preview.sjNote ?? '-'}</strong></div>
          </div>
          <div className="form-row">
            <button type="button" onClick={printNonTgrSj}>Cetak PDF</button>
            <button type="button" className="secondary-button" onClick={shareNonTgrSj}>Bagikan ke WhatsApp</button>
          </div>
        </div>
      ) : null}

      {state.error ? <p className="form-error">{state.error}</p> : null}
          {state.success ? <p className="form-success">{state.success}</p> : null}
          <button type="submit" disabled={pending}>{pending ? 'Sedang membuat tugas...' : 'Buat tugas'}</button>
        </form>
      </div>
    </section>
  )
}
