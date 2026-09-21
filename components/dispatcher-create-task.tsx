'use client'

import { useActionState, useEffect, useState } from 'react'
import { jsPDF } from 'jspdf'
import SearchableMasterSelect from '@/components/searchable-master-select'
import { createDispatcherTaskAction, confirmDispatcherTaskAction } from '@/app/dispatcher/beranda/actions'

const initialState: {
  error?: string
  success?: string
  transactionId?: string
  preview?: {
    transactionId: string
    flow: 'tgr' | 'distribusi'
    startPoint: string
    destination: string
    externalExecutor: string
    externalFleet: string
    sjNumber: string
    sjQty: number
    sjWeight: number
    product: string
    sjNote: string | null
    scheduleId?: string
    executorNik?: string
    platNumber?: string
    std?: string
    sta?: string
  }
} = {}

type Props = {
  locations: string[]
  schedules: Array<{ schedule_id: string; route: string; category: string; start_point: string; destination: string; std: string; sta: string; trip: number }>
  executors: Array<{ executor_nik: string; full_name: string }>
  fleets: Array<{ plat_number: string; fleet_type: string }>
  products: string[]
}

type Flow = 'distribusi' | 'supply' | null
type SupplyOwnership = 'TGR' | 'Non-TGR' | null

export default function DispatcherCreateTask({ locations, schedules, executors, fleets, products }: Props) {
  const [state, formAction, pending] = useActionState(createDispatcherTaskAction, initialState)
  const [activeFlow, setActiveFlow] = useState<Flow>(null)
  const [supplyOwnership, setSupplyOwnership] = useState<SupplyOwnership>(null)
  const [scheduleId, setScheduleId] = useState('')

  const selectedSchedule = schedules.find((schedule) => schedule.schedule_id === scheduleId)

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

  function resetCreateFlow() {
    setActiveFlow(null)
    setSupplyOwnership(null)
    setScheduleId('')
  }

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
      <div className="section-heading">
        <div>
          <h2>Buat Tugas Baru</h2>
          <p>Pilih proses, lengkapi detail penugasan, lalu konfirmasi sebelum dikirim ke Executor.</p>
        </div>
      </div>

      {!activeFlow ? (
        <div className="task-create-workspace">
          <div className="task-create-intro">
            <span className="eyebrow">MULAI PENUGASAN</span>
            <strong>Kamu mau bikin tugas yang mana?</strong>
            <span>Pilih alur yang sesuai kebutuhan operasional hari ini.</span>
          </div>

          <div className="task-create-choice-grid">
            <button type="button" className="task-create-choice" onClick={() => setActiveFlow('distribusi')}>
              <span className="task-create-choice-icon">DM</span>
              <span>
                <strong>Distribusi Mobil</strong>
                <small>Start Point, Destinasi, waktu, Executor, dan Armada.</small>
              </span>
              <b>→</b>
            </button>

            <button type="button" className="task-create-choice" onClick={() => setActiveFlow('supply')}>
              <span className="task-create-choice-icon">SP</span>
              <span>
                <strong>Supply</strong>
                <small>Pilih kepemilikan Armada TGR atau Non-TGR.</small>
              </span>
              <b>→</b>
            </button>
          </div>
        </div>
      ) : null}

      {activeFlow === 'distribusi' ? (
        <div className="task-create-workspace">
          <div className="task-create-flow-head">
            <div>
              <span className="eyebrow">Distribusi Mobil</span>
              <strong>Buat tugas distribusi mobil</strong>
            </div>
            <button type="button" className="secondary-button" onClick={resetCreateFlow}>Kembali</button>
          </div>

          <form action={formAction} className="data-form task-create-form">
            <input type="hidden" name="taskType" value="Distribusi Mobil" />
            <div className="form-section">
              <div className="form-section-title">Rute</div>
              <div className="form-row">
                <SearchableMasterSelect label="Titik Mulai" name="startPoint" options={locationOptions} placeholder="Pilih titik mulai" required />
                <SearchableMasterSelect label="Destinasi" name="destination" options={locationOptions} placeholder="Pilih destinasi" required />
              </div>
            </div>
            <div className="form-section">
              <div className="form-section-title">Waktu</div>
              <div className="form-row">
                <label>STD<input name="std" type="time" required /></label>
                <label>STA<input name="sta" type="time" required /></label>
              </div>
            </div>
            <div className="form-section">
              <div className="form-section-title">Penugasan</div>
              <div className="form-row">
                <SearchableMasterSelect label="Executor" name="executorNik" options={executorOptions} placeholder="Pilih executor" required />
                <SearchableMasterSelect label="Armada" name="platNumber" options={fleetOptions} placeholder="Pilih armada" required />
              </div>
            </div>
            {state.error ? <p className="form-error">{state.error}</p> : null}
            {state.success ? <p className="form-success">{state.success}</p> : null}
            <div className="form-actions">
              <button type="submit" disabled={pending}>{pending ? 'Sedang menyimpan...' : 'Submit Tugas'}</button>
              <button type="button" className="secondary-button" onClick={resetCreateFlow}>Batal</button>
            </div>
          </form>
        </div>
      ) : null}

      {activeFlow === 'supply' && !supplyOwnership ? (
        <div className="task-create-workspace">
          <div className="task-create-flow-head">
            <div>
              <span className="eyebrow">Supply</span>
              <strong>Pilih kepemilikan armada</strong>
            </div>
            <button type="button" className="secondary-button" onClick={resetCreateFlow}>Kembali</button>
          </div>

          <div className="task-create-choice-grid">
            <button type="button" className="task-create-choice" onClick={() => setSupplyOwnership('TGR')}>
              <span className="task-create-choice-icon">TGR</span>
              <span>
                <strong>Armada TGR</strong>
                <small>Gunakan schedule dari database master.</small>
              </span>
              <b>→</b>
            </button>
            <div className="task-create-choice" aria-disabled="true">
              <span className="task-create-choice-icon">NT</span>
              <span>
                <strong>Armada Non-TGR</strong>
                <small>Tugas Supply Non-TGR dibuat oleh Operation.</small>
              </span>
              <b>—</b>
            </div>
          </div>
        </div>
      ) : null}

      {activeFlow === 'supply' && supplyOwnership === 'TGR' ? (
        <div className="task-create-workspace">
          <div className="task-create-flow-head">
            <div>
              <span className="eyebrow">Supply · Armada TGR</span>
              <strong>Pilih jadwal yang mau dipakai</strong>
            </div>
            <button type="button" className="secondary-button" onClick={() => { setSupplyOwnership(null); setScheduleId('') }}>Kembali</button>
          </div>

          <form action={formAction} className="data-form task-create-form">
            <input type="hidden" name="taskType" value="Supply" />
            <input type="hidden" name="fleetOwnership" value="TGR" />
            <SearchableMasterSelect
              label="Schedule"
              name="scheduleId"
              options={scheduleOptions}
              placeholder="Pilih schedule"
              value={scheduleId}
              onValueChange={setScheduleId}
              required
            />
            {selectedSchedule ? (
              <>
                <div className="selected-schedule-summary">
                  <div><span>Schedule</span><strong>{selectedSchedule.schedule_id}</strong></div>
                  <div><span>Trip</span><strong>{selectedSchedule.trip}</strong></div>
                  <div><span>Rute</span><strong>{selectedSchedule.start_point} → {selectedSchedule.destination}</strong></div>
                  <div><span>STD</span><strong>{selectedSchedule.std.slice(0, 5)}</strong></div>
                  <div><span>STA</span><strong>{selectedSchedule.sta.slice(0, 5)}</strong></div>
                </div>
                <div className="form-section">
                  <div className="form-section-title">Penugasan</div>
                  <div className="form-row">
                    <SearchableMasterSelect label="Executor" name="executorNik" options={executorOptions} placeholder="Pilih executor" required />
                    <SearchableMasterSelect label="Armada" name="platNumber" options={fleetOptions} placeholder="Pilih armada" required />
                  </div>
                </div>
                {state.error ? <p className="form-error">{state.error}</p> : null}
                {state.success ? <p className="form-success">{state.success}</p> : null}
                <div className="form-actions">
                  <button type="submit" disabled={pending}>{pending ? 'Sedang menyimpan...' : 'Submit Tugas'}</button>
                </div>
              </>
            ) : (
              <p className="form-helper">Pilih schedule terlebih dahulu, lalu isi Executor dan Armada.</p>
            )}
          </form>
        </div>
      ) : null}

      {activeFlow === 'supply' && supplyOwnership === 'Non-TGR' ? (
        <div className="task-create-workspace">
          <div className="task-create-flow-head">
            <div>
              <span className="eyebrow">Supply · Armada Non-TGR</span>
              <strong>Buat tugas supply non-TGR</strong>
            </div>
            <button type="button" className="secondary-button" onClick={() => setSupplyOwnership(null)}>Kembali</button>
          </div>

          <form action={formAction} className="data-form task-create-form">
            <input type="hidden" name="taskType" value="Supply" />
            <input type="hidden" name="fleetOwnership" value="Non-TGR" />
            <div className="form-section">
              <div className="form-section-title">Rute</div>
              <div className="form-row">
                <SearchableMasterSelect label="Titik Mulai" name="startPoint" options={locationOptions} placeholder="Pilih titik mulai" required />
                <SearchableMasterSelect label="Destinasi" name="destination" options={locationOptions} placeholder="Pilih destinasi" required />
              </div>
            </div>
            <div className="form-section">
              <div className="form-section-title">Waktu</div>
              <div className="form-row">
                <label>STD<input name="std" type="time" required /></label>
                <label>STA<input name="sta" type="time" required /></label>
              </div>
            </div>
            <div className="form-section">
              <div className="form-section-title">Penugasan eksternal</div>
              <div className="form-row">
                <label>Executor Eksternal<input name="externalExecutor" required /></label>
                <label>Armada Eksternal<input name="externalFleet" required /></label>
              </div>
            </div>
            <div className="form-section">
              <div className="form-section-title">Surat Jalan</div>
              <div className="form-row">
                <label>Nomor SJ<input name="sjNumber" required /></label>
                <label>Qty<input name="sjQty" type="number" step="any" min="0" required /></label>
              </div>
              <div className="form-row">
                <label>Berat<input name="sjWeight" type="number" step="any" min="0" required /></label>
                <SearchableMasterSelect label="Produk" name="product" options={productOptions} placeholder="Pilih produk" required />
              </div>
              <label>Catatan<textarea name="sjNote" rows={2} /></label>
            </div>
            {state.error ? <p className="form-error">{state.error}</p> : null}
            {state.success ? <p className="form-success">{state.success}</p> : null}
            <div className="form-actions">
              <button type="submit" disabled={pending}>{pending ? 'Sedang menyimpan...' : 'Submit Tugas'}</button>
              <button type="button" className="secondary-button" onClick={resetCreateFlow}>Batal</button>
            </div>
          </form>
        </div>
      ) : null}

      {state.preview ? (
        <div className="metric-card section-block">
          <div className="card-title">Preview Tugas</div>
          <div className="task-summary-grid">
            <div><span>ID Transaksi</span><strong>{state.preview.transactionId}</strong></div>
            <div><span>Rute</span><strong>{state.preview.startPoint} → {state.preview.destination}</strong></div>
            <div><span>Executor</span><strong>{state.preview.externalExecutor}</strong></div>
            <div><span>Armada</span><strong>{state.preview.externalFleet}</strong></div>
            {state.preview.scheduleId ? <div><span>Schedule</span><strong>{state.preview.scheduleId}</strong></div> : null}
          </div>
          <p className="muted">Periksa data sebelum penugasan dikonfirmasi.</p>
          <form action={confirmDispatcherTaskAction} className="compact-form">
            <input type="hidden" name="transactionId" value={state.preview.transactionId}/>
            <input type="hidden" name="flow" value={state.preview.flow}/>
            <input type="hidden" name="startPoint" value={state.preview.startPoint}/>
            <input type="hidden" name="destination" value={state.preview.destination}/>
            <input type="hidden" name="executorNik" value={state.preview.executorNik ?? ''}/>
            <input type="hidden" name="platNumber" value={state.preview.platNumber ?? ''}/>
            <input type="hidden" name="scheduleId" value={state.preview.scheduleId ?? ''}/>
            <input type="hidden" name="std" value={state.preview.std ?? ""}/>
            <input type="hidden" name="sta" value={state.preview.sta ?? ""}/>
            <div className="form-actions">
              <button type="submit">Konfirmasi Penugasan</button>
              <button type="button" className="secondary-button" onClick={resetCreateFlow}>Edit Tugas</button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  )
}
