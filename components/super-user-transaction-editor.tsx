'use client'

import { useActionState } from 'react'
import SearchableMasterSelect from '@/components/searchable-master-select'
import { updateTaskTransactionAction, updateTicketTransactionAction } from '@/app/super-user/pengelolaan-transaksi/actions'

type Master = { value: string; label: string; searchText?: string }

type Task = {
  transaction_id: string
  status: string
  task_type: string
  source_type: string
  fleet_ownership: string | null
  schedule_id: string | null
  start_point: string | null
  destination: string | null
  std: string | null
  sta: string | null
  executor_nik: string | null
  external_executor: string | null
  external_fleet: string | null
  fleet_snapshot: { plat_number?: string } | null
  sj_number: string | null
  sj_qty: number | null
  sj_weight: number | null
  product: string | null
  sj_note: string | null
  odometer_start: number | null
  odometer_end: number | null
}

type Ticket = {
  transaction_id: string
  status: string
  maintenance_list: string | null
  location: string | null
  fleet_plat_number: string | null
}

function timeValue(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
}

export function SuperUserTaskEditor({ task, locations, executors, fleets, schedules, products }: { task: Task; locations: Master[]; executors: Master[]; fleets: Master[]; schedules: Master[]; products: Master[] }) {
  const [state, formAction, pending] = useActionState(updateTaskTransactionAction, {})
  const isSchedule = Boolean(task.schedule_id)
  return (
    <details className="transaction-editor">
      <summary className="link-button">Edit transaksi</summary>
      {task.status === 'Completed' ? <p className="muted">Transaksi Completed sudah immutable.</p> : (
        <form action={formAction} className="data-form compact-form" style={{marginTop:12}}>
          <input type="hidden" name="transactionId" value={task.transaction_id} />
          {isSchedule ? (
            <SearchableMasterSelect label="Schedule" name="scheduleId" options={schedules} placeholder="Pilih Schedule" defaultValue={task.schedule_id ?? ''} required />
          ) : (
            <div className="form-row">
              <label>Titik Mulai<input name="startPoint" defaultValue={task.start_point ?? ''} required /></label>
              <label>Destinasi<input name="destination" defaultValue={task.destination ?? ''} required /></label>
            </div>
          )}
          {!isSchedule ? (
            <div className="form-row">
              <label>STD<input name="std" type="time" defaultValue={timeValue(task.std)} required /></label>
              <label>STA<input name="sta" type="time" defaultValue={timeValue(task.sta)} required /></label>
            </div>
          ) : null}
          {task.fleet_ownership === 'Non-TGR' ? (
            <div className="form-row">
              <label>Executor Eksternal<input name="externalExecutor" defaultValue={task.external_executor ?? ''} required /></label>
              <label>Armada Eksternal<input name="externalFleet" defaultValue={task.external_fleet ?? ''} required /></label>
            </div>
          ) : (
            <div className="form-row">
              <SearchableMasterSelect label="Executor" name="executorNik" options={executors} placeholder="Pilih Executor" defaultValue={task.executor_nik ?? ''} required />
              <SearchableMasterSelect label="Armada" name="platNumber" options={fleets} placeholder="Pilih Armada" defaultValue={task.fleet_snapshot?.plat_number ?? ''} required />
            </div>
          )}
          <div className="form-row">
            <label>Nomor SJ<input name="sjNumber" defaultValue={task.sj_number ?? ''} /></label>
            <label>Qty<input name="sjQty" type="number" min="0" step="any" defaultValue={task.sj_qty ?? ''} /></label>
            <label>Berat<input name="sjWeight" type="number" min="0" step="any" defaultValue={task.sj_weight ?? ''} /></label>
          </div>
          <div className="form-row">
            <SearchableMasterSelect label="Produk" name="product" options={products} placeholder="Pilih Produk" defaultValue={task.product ?? ''} />
            <label>Odometer Awal<input name="odometerStart" type="number" min="0" step="any" defaultValue={task.odometer_start ?? ''} /></label>
            <label>Odometer Akhir<input name="odometerEnd" type="number" min="0" step="any" defaultValue={task.odometer_end ?? ''} /></label>
          </div>
          <label>Catatan SJ<textarea name="sjNote" rows={2} defaultValue={task.sj_note ?? ''} /></label>
          {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
          {state.success ? <p className="form-success" role="status">{state.success}</p> : null}
          <button type="submit" disabled={pending}>{pending ? 'Menyimpan...' : 'Simpan perubahan'}</button>
        </form>
      )}
    </details>
  )
}

export function SuperUserTicketEditor({ ticket, maintenanceLists, locations, fleets }: { ticket: Ticket; maintenanceLists: Master[]; locations: Master[]; fleets: Master[] }) {
  const [state, formAction, pending] = useActionState(updateTicketTransactionAction, {})
  return (
    <details className="transaction-editor">
      <summary className="link-button">Edit transaksi</summary>
      {ticket.status === 'Completed' ? <p className="muted">Ticketing Completed sudah immutable.</p> : (
        <form action={formAction} className="data-form compact-form" style={{marginTop:12}}>
          <input type="hidden" name="transactionId" value={ticket.transaction_id} />
          <SearchableMasterSelect label="Daftar Maintenance" name="maintenanceList" options={maintenanceLists} placeholder="Pilih Maintenance" defaultValue={ticket.maintenance_list ?? ''} required />
          <SearchableMasterSelect label="Lokasi" name="location" options={locations} placeholder="Pilih Lokasi" defaultValue={ticket.location ?? ''} required />
          <SearchableMasterSelect label="Armada" name="platNumber" options={fleets} placeholder="Pilih Armada" defaultValue={ticket.fleet_plat_number ?? ''} required />
          {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
          {state.success ? <p className="form-success" role="status">{state.success}</p> : null}
          <button type="submit" disabled={pending}>{pending ? 'Menyimpan...' : 'Simpan perubahan'}</button>
        </form>
      )}
    </details>
  )
}
