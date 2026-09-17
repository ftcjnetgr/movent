'use client'

import { useActionState, useEffect } from 'react'
import { createDispatcherTaskAction } from '@/app/dispatcher/beranda/actions'

const initialState: { error?: string; success?: string; transactionId?: string } = {}

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

  useEffect(() => {
    if (state.success) window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [state.success])

  return (
    <section className="section-block">
      <div className="section-heading"><div><h2>Buat Tugas</h2><p>Mulai penugasan dari sini sesuai jenis flow.</p></div></div>
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
            <label>Schedule
              <select name="scheduleId" defaultValue="" required>
                <option value="">Pilih Schedule</option>
                {schedules.map((schedule) => <option key={schedule.schedule_id} value={schedule.schedule_id}>{schedule.schedule_id} • Trip {schedule.trip} • {schedule.start_point} → {schedule.destination} • {schedule.std.slice(0, 5)}</option>)}
              </select>
            </label>
          ) : null}

          {taskType === 'Supply' && ownership === 'Non-TGR' ? (
            <div className="form-row">
              <label>Start Point<input name="startPoint" list="locations" required /></label>
              <label>Destinasi<input name="destination" list="locations" required /></label>
            </div>
          ) : taskType === 'Distribusi Mobil' ? (
            <div className="form-row">
              <label>Start Point<select name="startPoint" defaultValue="" required><option value="">Pilih Start Point</option>{locations.map((location) => <option key={location}>{location}</option>)}</select></label>
              <label>Destinasi<select name="destination" defaultValue="" required><option value="">Pilih Destinasi</option>{locations.map((location) => <option key={location}>{location}</option>)}</select></label>
            </div>
          ) : null}

          {taskType !== 'Supply' || ownership === 'Non-TGR' ? (
            <div className="form-row">
              <label>STD<input name="std" type="time" required /></label>
              <label>STA<input name="sta" type="time" required /></label>
            </div>
          ) : null}

          <div className="form-row">
            <label>Executor
              <select name="executorNik" defaultValue="" required><option value="">Pilih Executor</option>{executors.map((executor) => <option key={executor.executor_nik} value={executor.executor_nik}>{executor.executor_nik} - {executor.full_name}</option>)}</select>
            </label>
            {taskType !== 'Supply' || ownership === 'TGR' ? (
              <label>Armada
                <select name="platNumber" defaultValue="" required><option value="">Pilih Armada</option>{fleets.map((fleet) => <option key={fleet.plat_number} value={fleet.plat_number}>{fleet.plat_number} - {fleet.fleet_type}</option>)}</select>
              </label>
            ) : <div />}
          </div>

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
                <label>Produk<select name="product" defaultValue="" required><option value="">Pilih Produk</option>{products.map((product) => <option key={product}>{product}</option>)}</select></label>
                <label>Catatan SJ<textarea name="sjNote" rows={2} /></label>
              </div>
            </>
          ) : null}

          {taskType === 'Supply' && ownership === 'TGR' ? <p className="muted">STD dan STA mengikuti Schedule yang dipilih.</p> : null}
          {state.error ? <p className="form-error">{state.error}</p> : null}
          {state.success ? <p className="form-success">{state.success}</p> : null}
          <button type="submit" disabled={pending}>{pending ? 'Membuat tugas...' : 'Buat tugas'}</button>
          <datalist id="locations">{locations.map((location) => <option key={location} value={location} />)}</datalist>
        </form>
      </div>
    </section>
  )
}

import { useState } from 'react'
