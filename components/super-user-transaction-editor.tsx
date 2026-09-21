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

type SjItem = { id: string; task_id: string; sj_number: string; sj_qty: number; sj_weight: number; product: string; note: string | null }

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

export function SuperUserTaskEditor({ task, locations, executors, fleets, schedules, products, sjItems }: { task: Task; locations: Master[]; executors: Master[]; fleets: Master[]; schedules: Master[]; products: Master[]; sjItems: SjItem[] }) {
  const [state, formAction, pending] = useActionState(updateTaskTransactionAction, {})
  const isSchedule = Boolean(task.schedule_id)
  return (
    <details className="transaction-editor">
      <summary className="link-button">Ubah transaksi</summary>
      {task.status === 'Completed' ? <p className="muted">Transaksi yang sudah selesai nggak bisa diubah.</p> : (
        <form action={formAction} className="data-form compact-form" style={{marginTop:12}}>
          <input type="hidden" name="transactionId" value={task.transaction_id} />
          {isSchedule ? (
            <SearchableMasterSelect label="Schedule" name="scheduleId" options={schedules} placeholder="Pilih jadwal" defaultValue={task.schedule_id ?? ''} required />
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
              <SearchableMasterSelect label="Executor" name="executorNik" options={executors} placeholder="Pilih executor" defaultValue={task.executor_nik ?? ''} required />
              <SearchableMasterSelect label="Armada" name="platNumber" options={fleets} placeholder="Pilih armada" defaultValue={task.fleet_snapshot?.plat_number ?? ''} required />
            </div>
          )}
          {task.task_type === 'Supply' ? (
            <>
              <div className="card-title">Surat Jalan</div>
              <input type="hidden" name="sjItemsJson" value={JSON.stringify(sjItems)} />
              {sjItems.length ? sjItems.map((item, index) => (
                <div className="form-row" key={item.id}>
                  <label>SJ {index + 1}<input value={item.sj_number} readOnly /></label>
                  <label>Qty<input value={item.sj_qty} readOnly /></label>
                  <label>Berat<input value={item.sj_weight} readOnly /></label>
                  <label>Produk<input value={item.product} readOnly /></label>
                </div>
              )) : (
                <p className="muted">Belum ada data SJ.</p>
              )}
            </>
          ) : null}
          <div className="form-row">
            <label>Odometer Awal<input name="odometerStart" type="number" min="0" step="any" defaultValue={task.odometer_start ?? ''} /></label>
            <label>Odometer Akhir<input name="odometerEnd" type="number" min="0" step="any" defaultValue={task.odometer_end ?? ''} /></label>
          </div>
          {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
          {state.success ? <p className="form-success" role="status">{state.success}</p> : null}
          <button type="submit" disabled={pending}>{pending ? 'Sedang menyimpan...' : 'Simpan perubahan'}</button>
        </form>
      )}
    </details>
  )
}

export function SuperUserTicketEditor({ ticket, maintenanceLists, locations, fleets }: { ticket: Ticket; maintenanceLists: Master[]; locations: Master[]; fleets: Master[] }) {
  const [state, formAction, pending] = useActionState(updateTicketTransactionAction, {})
  return (
    <details className="transaction-editor">
      <summary className="link-button">Ubah transaksi</summary>
      {ticket.status === 'Completed' ? <p className="muted">Tiket yang sudah selesai nggak bisa diubah.</p> : (
        <form action={formAction} className="data-form compact-form" style={{marginTop:12}}>
          <input type="hidden" name="transactionId" value={ticket.transaction_id} />
          <SearchableMasterSelect label="Daftar Maintenance" name="maintenanceList" options={maintenanceLists} placeholder="Pilih jenis maintenance" defaultValue={ticket.maintenance_list ?? ''} required />
          <SearchableMasterSelect label="Lokasi" name="location" options={locations} placeholder="Pilih lokasi" defaultValue={ticket.location ?? ''} required />
          <SearchableMasterSelect label="Armada" name="platNumber" options={fleets} placeholder="Pilih armada" defaultValue={ticket.fleet_plat_number ?? ''} required />
          {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
          {state.success ? <p className="form-success" role="status">{state.success}</p> : null}
          <button type="submit" disabled={pending}>{pending ? 'Sedang menyimpan...' : 'Simpan perubahan'}</button>
        </form>
      )}
    </details>
  )
}
